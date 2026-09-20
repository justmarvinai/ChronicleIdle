/**
 * The turn loop (BATTLE.md §2–§3, docs/tech/ARCHITECTURE.md §3.2). `step` advances exactly one
 * unit's turn: it returns early with a `DecisionRequest` when a manual ally must decide, and
 * resumes with that decision. `runAuto` drives a whole battle; `replay` proves determinism.
 */
import { unitView } from './snapshot';
import { BOSS_ENRAGE_STEP, COUNTER_DMG_MULT, FEAR_SKIP_CHANCE, TM_PER_SPD, type Effect } from './imports';
import { autoDecide, pickTarget } from './ai';
import { applyHit, healUnit, registerCounterattack, reviveUnit } from './combat';
import { tmSnapshot, type ActionContext, type TriggerExtra } from './context';
import { strike } from './effects/damage';
import { runEffectList } from './effects/index';
import { ticksToNextTurn } from './formulas';
import { extraTurnChance, firePassives } from './passives';
import { spawnWave, type BattleSetup, createBattle } from './create';
import { effectiveStat, livingUnits, unitOrThrow } from './stats';
import { dotAmount, regenAmount, tickDurations } from './statuses';
import { provoker, targetingOf, validTargets } from './targets';
import type {
  AbilityChoice,
  BattleEvent,
  BattleOutcome,
  BattleOutcomeKind,
  BattleState,
  BattleUnit,
  Decision,
  DecisionRequest,
  StepResult,
  UnitAbility,
} from './types';
import { elementMatch } from './formulas';

function makeContext(
  state: BattleState,
  actor: BattleUnit,
  abilityId: string,
  events: BattleEvent[],
): ActionContext {
  const ctx: ActionContext = {
    state,
    events,
    actor,
    abilityId,
    primaryTarget: null,
    killedThisAction: false,
    counterDepth: 0,
    runEffects(effects: readonly Effect[], source: BattleUnit, target: BattleUnit | null): void {
      runEffectList({ ctx, source, chosen: target }, effects);
    },
    trigger(trigger, unit, extra?: TriggerExtra): void {
      firePassives(ctx, trigger, unit, extra);
    },
  };
  return ctx;
}

registerCounterattack((ctx, unit, target) => {
  const a1 = unit.abilities.find((a) => a.slot === 'a1');
  if (!a1 || !target.alive) return;
  const nested: ActionContext = { ...ctx, actor: unit, abilityId: a1.id, counterDepth: ctx.counterDepth + 1 };
  nested.runEffects = (effects, source, chosen) => runEffectList({ ctx: nested, source, chosen }, effects);
  nested.trigger = (trigger, u, extra) => firePassives(nested, trigger, u, extra);
  ctx.events.push({
    type: 'ability.cast',
    unitId: unit.id,
    abilityId: a1.id,
    slot: 'a1',
    targetId: target.id,
    counter: true,
  });
  const first = a1.def.effects.find((e): e is Extract<Effect, { kind: 'damage' }> => e.kind === 'damage');
  if (first) strike(nested, unit, target, first, { mult: COUNTER_DMG_MULT });
});

/** Picks the next actor by turn meter (ties: higher SPD, then a seeded roll). */
export function advanceTurnMeter(state: BattleState): BattleUnit | null {
  const alive = state.order.map((id) => state.units[id]).filter((u): u is BattleUnit => !!u && u.alive);
  if (!alive.length) return null;
  const speeds = new Map(alive.map((u) => [u.id, effectiveStat(state, u, 'spd')]));
  const ticks = ticksToNextTurn(
    alive.map((u) => ({ tm: u.tm, spd: speeds.get(u.id) ?? 0 })),
    TM_PER_SPD,
  );
  if (ticks > 0)
    for (const u of alive) u.tm = Math.min(1.5, u.tm + ticks * (speeds.get(u.id) ?? 0) * TM_PER_SPD);
  let ready = alive.filter((u) => u.tm >= 1 - 1e-9);
  if (!ready.length) {
    // Only reachable when nobody gains TM (all SPD ≤ 0): the fullest bar acts so the battle ends.
    if (ticks === 0) ready = [alive.reduce((best, u) => (u.tm > best.tm ? u : best))];
    else return advanceTurnMeter(state);
  }
  ready.sort((a, b) => b.tm - a.tm || (speeds.get(b.id) ?? 0) - (speeds.get(a.id) ?? 0));
  const top = ready.filter((u) => Math.abs(u.tm - (ready[0] as BattleUnit).tm) < 1e-9);
  const topSpd = speeds.get((top[0] as BattleUnit).id) ?? 0;
  const tied = top.filter((u) => (speeds.get(u.id) ?? 0) === topSpd);
  return tied.length > 1 ? state.rng.pick(tied) : (tied[0] as BattleUnit);
}

function buildRequest(state: BattleState, unit: BattleUnit): DecisionRequest {
  const forcedBy = provoker(state, unit);
  const a1 = unit.abilities.find((a) => a.slot === 'a1') ?? unit.abilities[0];
  const abilities: AbilityChoice[] = unit.abilities.map((ability) => {
    const targets = validTargets(state, unit, ability.def);
    const usable = ability.cooldown === 0 && (!forcedBy || ability.id === a1?.id);
    const auto = usable ? pickTarget(state, unit, ability) : null;
    return {
      abilityId: ability.id,
      slot: ability.slot,
      ready: usable && (targetingOf(ability.def) === 'none' || targets.length > 0),
      cooldown: ability.cooldown,
      targeting: targetingOf(ability.def),
      validTargets: forcedBy ? targets.filter((id) => id === forcedBy.id) : targets,
      autoTarget: auto?.id ?? null,
    };
  });
  return {
    unitId: unit.id,
    abilities,
    forced: forcedBy && a1 ? { abilityId: a1.id, targetId: forcedBy.id } : null,
  };
}

/**
 * The phase a boss's HP puts it in (BOSSES.md §3), read at its own turn: a threshold crossed by a
 * hit lands on the turn after, which is the beat the fight is choreographed on — the adds come
 * back with it and the abilities it gates open.
 */
function advancePhase(ctx: ActionContext, unit: BattleUnit): void {
  if (!unit.phaseThresholds.length || unit.maxHp <= 0) return;
  const fraction = unit.hp / unit.maxHp;
  const phase = 1 + unit.phaseThresholds.filter((threshold) => fraction < threshold).length;
  if (phase <= unit.phase) return;
  unit.phase = phase;
  ctx.events.push({ type: 'phase.changed', unitId: unit.id, phase });
  // A new phase is a new chorus: whatever fell comes back with it.
  if (unit.adds) unit.flags.addsRevivedTurn = unit.flags.turnsTaken - unit.adds.every;
}

/** Brings the boss's fallen adds back on their schedule (BOSSES.md §3). */
function reviveAdds(ctx: ActionContext, unit: BattleUnit): void {
  const adds = unit.adds;
  if (!adds) return;
  if (unit.flags.turnsTaken - unit.flags.addsRevivedTurn < adds.every) return;
  const fallen = adds.ids
    .map((id) => ctx.state.units[id])
    .filter((add): add is BattleUnit => !!add && !add.alive);
  unit.flags.addsRevivedTurn = unit.flags.turnsTaken;
  for (const add of fallen) reviveUnit(ctx, add, adds.hpPercent);
}

/** Turn start (BATTLE.md §3.1). Returns false when the unit cannot act this turn. */
function startTurn(state: BattleState, unit: BattleUnit, events: BattleEvent[]): boolean {
  state.turn += 1;
  if (unit.side === 'ally') state.allyTurns += 1;
  unit.flags.turnsTaken += 1;
  events.push({
    type: 'turn.started',
    unitId: unit.id,
    turn: state.turn,
    allyTurns: state.allyTurns,
    tm: tmSnapshot(state),
  });
  const ctx = makeContext(state, unit, 'turn', events);
  for (const ability of unit.abilities) if (ability.cooldown > 0) ability.cooldown -= 1;
  if (unit.flags.healNextTurn > 0) {
    healUnit(ctx, unit, unit, Math.floor(unit.maxHp * (unit.flags.healNextTurn / 100)), 'survive');
    unit.flags.healNextTurn = 0;
  }
  // DoTs and Continuous Heal tick before the unit acts.
  for (const status of [...unit.statuses]) {
    if (!unit.alive) break;
    if (status.id === 'poison' || status.id === 'burn' || status.id === 'bleed') {
      const amount = dotAmount(ctx, unit, status);
      if (amount > 0) {
        const placer = state.units[status.sourceId] ?? null;
        applyHit(ctx, placer, unit, amount, {
          abilityId: status.id,
          crit: false,
          match: 'neutral',
          redirectedFrom: null,
          triggers: false,
        });
        events.push({ type: 'dot.tick', unitId: unit.id, status: status.id, amount, hpAfter: unit.hp });
      }
    } else if (status.id === 'regen') {
      const placer = state.units[status.sourceId] ?? unit;
      healUnit(ctx, placer, unit, regenAmount(unit, status), 'regen');
    }
  }
  if (!unit.alive) return false;
  if (unit.isBoss && unit.enrageAfterTurn !== null && unit.flags.turnsTaken > unit.enrageAfterTurn) {
    if ((unit.flags.turnsTaken - unit.enrageAfterTurn) % unit.enrageEvery === 0) {
      unit.flags.enrageSteps += 1;
      unit.base = { ...unit.base, atk: Math.round(unit.base.atk * (1 + BOSS_ENRAGE_STEP)) };
      events.push({ type: 'enraged', unitId: unit.id, steps: unit.flags.enrageSteps });
    }
  }
  advancePhase(ctx, unit);
  reviveAdds(ctx, unit);
  ctx.trigger('onTurnStart', unit);
  if (!unit.alive) return false;
  const skip = unit.statuses.find((s) => s.id === 'stun' || s.id === 'freeze' || s.id === 'sleep');
  if (skip) {
    events.push({ type: 'turn.skipped', unitId: unit.id, reason: skip.id as 'stun' | 'freeze' | 'sleep' });
    return false;
  }
  if (unit.statuses.some((s) => s.id === 'fear') && state.rng.next() < FEAR_SKIP_CHANCE) {
    events.push({ type: 'turn.skipped', unitId: unit.id, reason: 'fear' });
    return false;
  }
  return true;
}

function act(state: BattleState, unit: BattleUnit, decision: Decision, events: BattleEvent[]): void {
  const ability = unit.abilities.find((a) => a.id === decision.abilityId) as UnitAbility;
  const target = decision.targetId ? (state.units[decision.targetId] ?? null) : null;
  state.actionSeq += 1;
  unit.flags.lastActionSeq = state.actionSeq;
  unit.flags.actionDamage = 0;
  state.lastHitDamage = 0;
  ability.cooldown = ability.def.cooldown;
  events.push({
    type: 'ability.cast',
    unitId: unit.id,
    abilityId: ability.id,
    slot: ability.slot,
    targetId: target?.id ?? null,
    counter: false,
  });
  const ctx = makeContext(state, unit, ability.id, events);
  ctx.primaryTarget = target;
  ctx.runEffects(ability.def.effects, unit, target);
}

function endTurn(state: BattleState, unit: BattleUnit, events: BattleEvent[]): void {
  if (unit.alive) {
    // Durations tick at the end of the affected unit's turn, so a 1-turn Stun skips one turn
    // (BATTLE.md §3.1); a status the unit placed on itself this action keeps its full length.
    tickDurations(makeContext(state, unit, 'turn', events), unit);
    const extra =
      unit.flags.extraTurn || (extraTurnChance(unit) > 0 && state.rng.next() < extraTurnChance(unit) / 100);
    if (extra && !unit.flags.extraTurn) events.push({ type: 'extra_turn', unitId: unit.id });
    unit.flags.extraTurn = false;
    unit.tm = Math.max(0, Math.min(1.5, (extra ? 1 : 0) + unit.flags.pendingTm));
    unit.flags.pendingTm = 0;
  }
  if (unit.side === 'ally') state.waveFresh = false;
  events.push({ type: 'turn.ended', unitId: unit.id, tm: tmSnapshot(state) });
}

function finish(state: BattleState, kind: BattleOutcomeKind, events: BattleEvent[]): BattleOutcome {
  const enemies = state.order
    .map((id) => state.units[id])
    .filter((u): u is BattleUnit => !!u && u.side === 'enemy');
  const currentWave = enemies.filter((u) => u.id.startsWith(`w${state.waveIndex}e`));
  const hpLeft =
    currentWave.reduce((s, u) => s + u.hp, 0) /
    Math.max(
      1,
      currentWave.reduce((s, u) => s + u.maxHp, 0),
    );
  for (const id of state.order) {
    const unit = state.units[id];
    if (!unit) continue;
    const r = state.reports[id] ?? {
      unitId: id,
      defId: unit.defId,
      instanceId: unit.instanceId,
      side: unit.side,
      alive: unit.alive,
      died: !unit.alive,
      damageDealt: 0,
      damageTaken: 0,
      healingDone: 0,
      kills: 0,
    };
    r.alive = unit.alive;
    if (!unit.alive) r.died = true;
    state.reports[id] = r;
  }
  const outcome: BattleOutcome = {
    kind,
    turns: state.turn,
    allyTurns: state.allyTurns,
    wavesCleared: kind === 'victory' ? state.waveCount : state.waveIndex,
    waveCount: state.waveCount,
    units: state.order.map((id) => state.reports[id]).filter((r): r is NonNullable<typeof r> => !!r),
    enemyHpLeft: kind === 'victory' ? 0 : hpLeft,
    seed: state.seed,
    decisions: [...state.decisions],
  };
  state.outcome = outcome;
  state.phase = 'ended';
  state.pending = null;
  events.push({ type: 'battle.ended', outcome });
  return outcome;
}

/** Wave transition and end conditions after every action (BATTLE.md §3.4). */
function checkBoard(state: BattleState, events: BattleEvent[]): BattleOutcome | null {
  if (!livingUnits(state, 'ally').length) return finish(state, 'defeat', events);
  if (!livingUnits(state, 'enemy').length) {
    events.push({ type: 'wave.cleared', wave: state.waveIndex + 1, waveCount: state.waveCount });
    const next = state.pendingWaves.shift();
    if (!next) return finish(state, 'victory', events);
    state.waveIndex += 1;
    state.waveFresh = true;
    spawnWave(state, next);
    for (const ally of livingUnits(state, 'ally')) ally.flags.shieldedThisWave = [];
    events.push({
      type: 'wave.started',
      wave: state.waveIndex + 1,
      waveCount: state.waveCount,
      enemyIds: next.enemies.map((e) => e.unit.id),
      units: next.enemies.map((e) => unitView(e.unit)),
    });
    for (const ally of livingUnits(state, 'ally')) {
      const ctx = makeContext(state, ally, 'wave', events);
      ctx.trigger('onWaveStart', ally);
    }
    if (!livingUnits(state, 'ally').length) return finish(state, 'defeat', events);
  }
  const used = state.turnLimitMode === 'ally' ? state.allyTurns : state.turn;
  if (used >= state.turnLimit) return finish(state, state.timeUpIsDefeat ? 'defeat' : 'timeout', events);
  return null;
}

function validate(state: BattleState, decision: Decision): string | null {
  const pending = state.pending;
  if (!pending) return 'No decision is pending';
  if (decision.unitId !== pending.unitId) return `It is ${pending.unitId}'s turn`;
  const choice = pending.abilities.find((a) => a.abilityId === decision.abilityId);
  if (!choice) return `Unknown ability ${decision.abilityId}`;
  if (!choice.ready) return `${decision.abilityId} is not ready`;
  if (
    pending.forced &&
    (decision.abilityId !== pending.forced.abilityId || decision.targetId !== pending.forced.targetId)
  )
    return 'Provoked: only the A1 on the provoker is allowed';
  if (choice.targeting === 'none') return null;
  if (!decision.targetId || !choice.validTargets.includes(decision.targetId))
    return `Invalid target ${decision.targetId}`;
  return null;
}

/**
 * Advances one turn. With a pending request, `decision` resolves it; otherwise the next actor
 * takes their turn (or a request is returned for a manual ally).
 */
export function step(state: BattleState, decision?: Decision): StepResult {
  const events: BattleEvent[] = [];
  if (state.phase === 'ended') return { events, request: null, outcome: state.outcome };
  if (state.turn === 0 && !state.pending) {
    events.push({ type: 'battle.started', seed: state.seed, waveCount: state.waveCount });
    const firstWave = state.order.filter((id) => id.startsWith('w0e'));
    events.push({
      type: 'wave.started',
      wave: 1,
      waveCount: state.waveCount,
      enemyIds: firstWave,
      units: firstWave
        .map((id) => state.units[id])
        .filter((u) => !!u)
        .map(unitView),
    });
    for (const ally of livingUnits(state, 'ally')) {
      const ctx = makeContext(state, ally, 'wave', events);
      ctx.trigger('onWaveStart', ally);
    }
  }
  if (state.pending) {
    if (!decision) return { events, request: state.pending, outcome: null };
    const error = validate(state, decision);
    if (error) throw new Error(error);
    const unit = unitOrThrow(state, decision.unitId);
    state.pending = null;
    state.phase = 'running';
    // Only player decisions are logged; every other choice is reproducible from the seed.
    state.decisions.push(decision);
    act(state, unit, decision, events);
    endTurn(state, unit, events);
    const outcome = checkBoard(state, events);
    return { events, request: null, outcome };
  }
  const actor = advanceTurnMeter(state);
  if (!actor) return { events, request: null, outcome: finish(state, 'defeat', events) };
  const canAct = startTurn(state, actor, events);
  if (!canAct) {
    endTurn(state, actor, events);
    const outcome = checkBoard(state, events);
    return { events, request: null, outcome };
  }
  if (actor.side === 'ally' && state.control === 'manual') {
    state.pending = buildRequest(state, actor);
    state.phase = 'awaiting_decision';
    return { events, request: state.pending, outcome: null };
  }
  const chosen = autoDecide(state, actor);
  act(state, actor, chosen, events);
  endTurn(state, actor, events);
  const outcome = checkBoard(state, events);
  return { events, request: null, outcome };
}

/** Player retreat: ends the battle immediately. */
export function retreat(state: BattleState): StepResult {
  const events: BattleEvent[] = [];
  if (state.phase === 'ended') return { events, request: null, outcome: state.outcome };
  return { events, request: null, outcome: finish(state, 'retreat', events) };
}

export function setControl(state: BattleState, control: 'manual' | 'auto'): void {
  state.control = control;
}

/**
 * Marks the enemy every ally attacks while it stands (BATTLE.md §7.1), or clears the mark with
 * `null`. An input like `setControl`, not a recorded decision: it steers what the policy picks
 * rather than answering an open request, and a decision already pending keeps the preselection it
 * was built with until the player changes it or the next request is built.
 */
export function setFocus(state: BattleState, unitId: string | null): void {
  const unit = unitId ? state.units[unitId] : null;
  state.focusId = unit && unit.side === 'enemy' ? unit.id : null;
}

/** Runs the battle to its end with the AI deciding for every ally; returns every event. */
export function runAuto(
  state: BattleState,
  maxSteps = 10_000,
): { events: BattleEvent[]; outcome: BattleOutcome } {
  const events: BattleEvent[] = [];
  const previous = state.control;
  state.control = 'auto';
  let outcome: BattleOutcome | null = state.outcome;
  for (let i = 0; i < maxSteps && !outcome; i++) {
    const result = step(state);
    events.push(...result.events);
    outcome = result.outcome;
  }
  state.control = previous;
  if (!outcome) throw new Error('Battle did not end within the step budget');
  return { events, outcome };
}

/** Replays recorded decisions in manual mode; identical setup and seed reproduce every event. */
export function replay(
  setup: BattleSetup,
  seed: string,
  decisions: readonly Decision[],
): { events: BattleEvent[]; outcome: BattleOutcome | null } {
  const state = createBattle({ ...setup, control: 'manual' }, seed);
  const events: BattleEvent[] = [];
  let cursor = 0;
  let outcome: BattleOutcome | null = null;
  for (let i = 0; i < 10_000 && !outcome; i++) {
    const pending = state.pending;
    const next = pending ? decisions[cursor] : undefined;
    if (pending && !next) break;
    if (pending) cursor++;
    const result = step(state, next);
    events.push(...result.events);
    outcome = result.outcome;
  }
  return { events, outcome };
}

export { elementMatch };
