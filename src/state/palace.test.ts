/**
 * The Glorious Palace through the store (docs/design/GLORIOUS_PALACE.md): the gate that opens it,
 * the four things that pay a point, what a point may be spent on, and the free reset.
 *
 * The arithmetic is `engine/palace/palace.test.ts`; these are the flows a chronicle actually takes.
 */
import { describe, expect, it } from 'vitest';
import { BOSS_STAGE_NUMBER, STAGES_PER_SETTLEMENT } from '@content/balance/campaign';
import { PALACE_CORE_HP_PCT, PALACE_POINT_SOURCES } from '@content/balance/palace';
import { PALACE_CORE_ID } from '@content/palace/index';
import { content } from '@content/registry';
import type { BattleOutcome } from '@engine/battle/types';
import { progressKey, stageIdOf } from '@engine/campaign/progress';
import { baseStats } from '@engine/champions/stats';
import { totalStats } from '@engine/gear/champion-stats';
import { FixedClock } from '@engine/time/clock';
import { isPalaceUnlocked, palaceBonusOf, palaceLedgerOf } from './palace';
import { createGameStore } from './store';

const T0 = new Date(2026, 8, 21, 12, 0).getTime();
/** The first node of the Valor branch, which the core opens. */
const VALOR_1 = 'palace.valor.r1.0';

function chronicle() {
  const clock = new FixedClock(T0);
  const { store, events } = createGameStore({ clock });
  const { actions } = store.getState();
  actions.newGame('Chronicler');
  actions.chooseStarter('champ.ser_corvin');
  store.setState((state) => {
    if (state.save) {
      state.save.seedRoot = 'test-seed';
      state.save.profile.level = 40;
    }
    return state;
  });
  return { clock, store, events, actions: store.getState().actions };
}

const save = (store: ReturnType<typeof chronicle>['store']) => {
  const current = store.getState().save;
  if (!current) throw new Error('no chronicle');
  return current;
};

/** Writes the nine stands before a settlement's boss, so the boss stand itself can be fought. */
function approach(store: ReturnType<typeof chronicle>['store'], settlement: number): void {
  store.setState((state) => {
    if (!state.save) return state;
    for (let stage = 1; stage < STAGES_PER_SETTLEMENT; stage += 1)
      state.save.campaign.stars[progressKey(stageIdOf(settlement, stage), 'intro')] = 3;
    return state;
  });
}

const victory = (): BattleOutcome => ({
  kind: 'victory',
  turns: 20,
  allyTurns: 9,
  wavesCleared: 3,
  waveCount: 3,
  units: [],
  enemyHpLeft: 0,
  seed: 'seed',
  decisions: [],
});

/** Gravemaw's Easy pool (`BOSSES.md` §1), which a kill has to empty. */
const GRAVEMAW_EASY_HP = 250_000;

/** A finished boss fight that did `damage` to Gravemaw. */
function bossFight(damage: number, kind: BattleOutcome['kind'] = 'timeout'): BattleOutcome {
  return {
    kind,
    turns: 50,
    allyTurns: 20,
    wavesCleared: kind === 'victory' ? 1 : 0,
    waveCount: 1,
    units: [
      {
        unitId: 'w0e0',
        defId: 'enemy.gravemaw_easy',
        instanceId: null,
        side: 'enemy',
        alive: kind !== 'victory',
        died: kind === 'victory',
        damageDealt: 1_000,
        damageTaken: damage,
        healingDone: 0,
        kills: 0,
      },
    ],
    enemyHpLeft: kind === 'victory' ? 0 : 0.5,
    seed: 'x',
    decisions: [],
  };
}

/** Fights one stand of a settlement and banks it. */
function fight(fixture: ReturnType<typeof chronicle>, settlement: number, stage: number): number {
  const { store, actions } = fixture;
  const pointer = { settlement, stage, difficulty: 'intro' } as const;
  const party = Object.keys(save(store).roster).slice(0, 3);
  const started = actions.startCampaignRun(pointer);
  if (!started.ok) throw new Error(started.error.message);
  const finished = actions.finishCampaignRun({
    pointer,
    cost: started.value.cost,
    runIndex: started.value.runIndex,
    outcome: victory(),
    party,
    now: T0,
  });
  if (!finished.ok) throw new Error(finished.error.message);
  return finished.value.palacePoints;
}

describe('the Palace’s doors', () => {
  it('open when the first settlement falls, not at a level', () => {
    const fixture = chronicle();
    expect(isPalaceUnlocked(save(fixture.store))).toBe(false);
    approach(fixture.store, 1);
    expect(isPalaceUnlocked(save(fixture.store))).toBe(false);

    fight(fixture, 1, BOSS_STAGE_NUMBER);
    expect(isPalaceUnlocked(save(fixture.store))).toBe(true);
  });
});

describe('what pays a skill point', () => {
  it('pays one for a settlement’s boss stand, and nothing for the stands before it', () => {
    const fixture = chronicle();
    approach(fixture.store, 1);
    expect(fight(fixture, 1, 1)).toBe(0);

    expect(fight(fixture, 1, BOSS_STAGE_NUMBER)).toBe(PALACE_POINT_SOURCES.settlement);
    expect(save(fixture.store).palace.earned).toBe(1);
    // Beaten again for the drops: the point was already paid.
    expect(fight(fixture, 1, BOSS_STAGE_NUMBER)).toBe(0);
    expect(save(fixture.store).palace.earned).toBe(1);
  });

  it('pays the tower every fifth floor', () => {
    const fixture = chronicle();
    const { store, actions } = fixture;
    // The tower asks for the whole Intro campaign; write it rather than fight 120 stands.
    store.setState((state) => {
      if (!state.save) return state;
      for (let settlement = 1; settlement <= 12; settlement += 1)
        for (let stage = 1; stage <= STAGES_PER_SETTLEMENT; stage += 1)
          state.save.campaign.stars[progressKey(stageIdOf(settlement, stage), 'intro')] = 3;
      return state;
    });
    const climbed = save(store).palace.earned;

    let paid = 0;
    for (let floor = 1; floor <= 5; floor += 1) {
      const started = actions.startTowerFloor(floor);
      if (!started.ok) throw new Error(started.error.message);
      const done = actions.finishTowerFloor({
        floor,
        outcome: { ...victory(), wavesCleared: 1, waveCount: 1 },
        party: [],
      });
      if (!done.ok) throw new Error(done.error.message);
      paid += done.value.palacePoints;
    }
    expect(paid).toBe(PALACE_POINT_SOURCES.towerFloor);
    expect(save(store).palace.earned).toBe(climbed + 1);
    expect(save(store).palace.tower.floorPaid).toBe(5);
  });

  it('pays the daily boss when its pool is emptied, and pays it once a day', () => {
    const fixture = chronicle();
    const { store, actions } = fixture;

    // A fight short of the pool pays nothing: the point is for the kill, not the attempt.
    actions.startBossFight('boss.gravemaw', 'easy');
    const scratched = actions.finishBossFight({
      bossId: 'boss.gravemaw',
      tierId: 'easy',
      outcome: bossFight(30_000),
      team: ['champ.ser_corvin'],
    });
    if (!scratched.ok) throw new Error(scratched.error.message);
    expect(scratched.value.percent).toBeLessThan(100);
    expect(scratched.value.palacePoints).toBe(0);

    actions.startBossFight('boss.gravemaw', 'easy');
    const killed = actions.finishBossFight({
      bossId: 'boss.gravemaw',
      tierId: 'easy',
      outcome: bossFight(GRAVEMAW_EASY_HP, 'victory'),
      team: ['champ.ser_corvin'],
    });
    if (!killed.ok) throw new Error(killed.error.message);
    expect(killed.value.percent).toBe(100);
    expect(killed.value.palacePoints).toBe(PALACE_POINT_SOURCES.dailyBoss);
    expect(save(store).palace.earned).toBe(1);

    // The same day, emptied again on another tier: the day is already paid.
    actions.startBossFight('boss.gravemaw', 'normal');
    const again = actions.finishBossFight({
      bossId: 'boss.gravemaw',
      tierId: 'normal',
      outcome: bossFight(5_000_000, 'victory'),
      team: ['champ.ser_corvin'],
    });
    if (!again.ok) throw new Error(again.error.message);
    expect(again.value.palacePoints).toBe(0);
    expect(save(store).palace.earned).toBe(1);
  });
});

describe('spending and reclaiming', () => {
  function withPoints(points: number) {
    const fixture = chronicle();
    fixture.store.setState((state) => {
      if (state.save) state.save.palace.earned = points;
      return state;
    });
    return fixture;
  }

  it('lights the core first, and nothing else until it is lit', () => {
    const { store, actions } = withPoints(4);
    const early = actions.unlockPalaceNode(VALOR_1);
    expect(early.ok).toBe(false);
    if (!early.ok) expect(early.error.code).toBe('locked');

    const core = actions.unlockPalaceNode(PALACE_CORE_ID);
    if (!core.ok) throw new Error(core.error.message);
    expect(core.value.ledger).toEqual({ earned: 4, spent: 1, available: 3 });
    expect(save(store).palace.nodes).toEqual([PALACE_CORE_ID]);

    expect(actions.unlockPalaceNode(VALOR_1).ok).toBe(true);
    expect(save(store).palace.nodes).toEqual([PALACE_CORE_ID, VALOR_1]);
    // Twice is not allowed, and costs nothing when refused.
    const again = actions.unlockPalaceNode(VALOR_1);
    expect(again.ok).toBe(false);
    expect(palaceLedgerOf(save(store).palace).spent).toBe(2);
  });

  it('refuses a node the points do not cover', () => {
    const { store, actions } = withPoints(1);
    expect(actions.unlockPalaceNode(PALACE_CORE_ID).ok).toBe(true);
    const broke = actions.unlockPalaceNode(VALOR_1);
    expect(broke.ok).toBe(false);
    if (!broke.ok) expect(broke.error.code).toBe('insufficient_currency');
    expect(palaceLedgerOf(save(store).palace).available).toBe(0);
  });

  it('refuses a node that is not in the tree', () => {
    const { actions } = withPoints(9);
    expect(actions.unlockPalaceNode('palace.nowhere').ok).toBe(false);
  });

  it('hands every point back on a reset, and keeps what was earned', () => {
    const { store, actions } = withPoints(9);
    actions.unlockPalaceNode(PALACE_CORE_ID);
    actions.unlockPalaceNode(VALOR_1);
    const reclaimed = actions.resetPalace();
    if (!reclaimed.ok) throw new Error(reclaimed.error.message);
    expect(reclaimed.value).toBe(2);
    expect(save(store).palace.nodes).toEqual([]);
    expect(palaceLedgerOf(save(store).palace)).toEqual({ earned: 9, spent: 0, available: 9 });
    // Nothing to reclaim is a refusal, not a silent no-op.
    expect(actions.resetPalace().ok).toBe(false);
  });

  it('raises the champions of the branch it was spent in, and only those', () => {
    const { store, actions } = withPoints(9);
    actions.unlockPalaceNode(PALACE_CORE_ID);
    actions.unlockPalaceNode(VALOR_1);
    const bonus = palaceBonusOf(save(store).palace.nodes);

    const valor = content.champions.find((c) => c.element === 'valor');
    const faith = content.champions.find((c) => c.element === 'faith');
    if (!valor || !faith) throw new Error('no roster');
    const instance = {
      instanceId: 'x',
      defId: valor.id,
      stars: 3,
      level: 20,
      xp: 0,
      skillSteps: {},
      gear: { weapon: null, helmet: null, shield: null, gauntlets: null, chestplate: null, boots: null },
      locked: false,
      favourite: false,
      obtainedAt: T0,
      source: 'starter' as const,
      seen: true,
    };
    const base = baseStats(valor.stats, 3, 20);
    const lifted = totalStats(valor, instance, [], (id) => content.gearSetById(id), bonus);
    const node = content.palace.byId[VALOR_1];
    const core = Math.round((base.hp * PALACE_CORE_HP_PCT) / 100);
    expect(lifted.hp).toBe(base.hp + (node?.grants.hp ?? 0) + core);

    // A Faith champion gets the core's percentage and nothing of Valor's branch.
    const other = { ...instance, defId: faith.id };
    const faithBase = baseStats(faith.stats, 3, 20);
    const faithLifted = totalStats(faith, other, [], (id) => content.gearSetById(id), bonus);
    expect(faithLifted.hp).toBe(faithBase.hp + Math.round((faithBase.hp * PALACE_CORE_HP_PCT) / 100));
    expect(faithLifted.atk).toBe(faithBase.atk);
  });
});
