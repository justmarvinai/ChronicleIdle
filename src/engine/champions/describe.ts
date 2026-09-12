/**
 * Live numbers for ability descriptions (docs/design/CHAMPIONS.md §3, UI_DESIGN.md §5.4).
 * Upgrades are applied here so a description always shows what the ability does *now*; the
 * battle engine (Phase 2) uses the same function to build the effective ability.
 */
import type { AbilityDef, AbilityUpgrade, Effect, PassiveEffect } from './imports';

export interface AbilityNumbers {
  /** Sum of damage multipliers as a percentage of the source stat ("350"). */
  dmg: string;
  /** Multiplier of the first damage effect ("350") and its hit count. */
  hits: number;
  chance: number;
  turns: number;
  value: number;
  heal: string;
  shield: number;
  tm: number;
  cooldown: number;
  defIgnore: number;
  /** Strongest and weakest single-hit multipliers for multi-part attacks ("330" / "120"). */
  dmg2: string;
}

/** Percentage bonus accumulated per upgrade type after `steps` tomes. */
export function upgradeTotals(
  upgrades: readonly AbilityUpgrade[],
  steps: number,
): Record<AbilityUpgrade['type'], number> {
  const totals: Record<AbilityUpgrade['type'], number> = {
    damage: 0,
    cooldown: 0,
    chance: 0,
    heal: 0,
    duration: 0,
    shield: 0,
    tm: 0,
  };
  for (const upgrade of upgrades.slice(0, Math.max(0, steps))) totals[upgrade.type] += upgrade.value;
  return totals;
}

/** The ability with `steps` upgrades folded into its numbers (new object; content is never mutated). */
export function effectiveAbility(ability: AbilityDef, steps: number): AbilityDef {
  const totals = upgradeTotals(ability.upgrades, steps);
  const apply = (effect: Effect): Effect => {
    switch (effect.kind) {
      case 'damage':
        return { ...effect, mult: round2(effect.mult * (1 + totals.damage / 100)) };
      case 'heal':
        return { ...effect, mult: round2(effect.mult * (1 + totals.heal / 100)) };
      case 'apply_status': {
        const next = {
          ...effect,
          chance: Math.min(100, effect.chance + totals.chance),
          turns: effect.turns + totals.duration,
        };
        if (effect.status === 'shield' && effect.value !== undefined)
          next.value = round2(effect.value * (1 + totals.shield / 100));
        return next;
      }
      case 'tm':
        return { ...effect, delta: round2(effect.delta * (1 + totals.tm / 100)) };
      case 'conditional':
        return {
          ...effect,
          then: effect.then.map(apply),
          ...(effect.else ? { else: effect.else.map(apply) } : {}),
        };
      default:
        return effect;
    }
  };
  return {
    ...ability,
    cooldown: Math.max(ability.slot === 'a1' ? 0 : 1, ability.cooldown - totals.cooldown),
    effects: ability.effects.map(apply),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pct(mult: number): string {
  return String(Math.round(mult * 100));
}

/** Numbers to interpolate into the ability's description key. */
export function abilityNumbers(ability: AbilityDef, steps = 0): AbilityNumbers {
  const effective = effectiveAbility(ability, steps);
  return numbersFromEffects(flatten(effective.effects), effective.cooldown);
}

const PASSIVE_ONLY_KINDS: ReadonlySet<string> = new Set([
  'stat_mod',
  'damage_bonus',
  'damage_bonus_per',
  'crit_rate_per',
  'damage_reduction',
  'counterattack',
  'survive_lethal',
  'status_value_override',
  'retarget_single_attacks',
  'extra_turn_chance',
  'shield_ally_below',
  'on_heal_grant',
  'on_stun_gain_tm',
]);

function isEffect(effect: PassiveEffect): effect is Effect {
  return !PASSIVE_ONLY_KINDS.has(effect.kind);
}

/**
 * Numbers for a passive or aura description. Plain effects (a status the passive applies, a
 * heal it grants) fill the fields exactly like an ability; passive-only effects fall back into
 * `value`, `chance`, `turns`, `shield` and `tm` so descriptions can quote their tunables.
 */
export function passiveNumbers(effects: readonly PassiveEffect[]): AbilityNumbers {
  const numbers = numbersFromEffects(flatten(effects.filter(isEffect)), 0);
  for (const effect of effects) {
    switch (effect.kind) {
      case 'stat_mod':
        numbers.value ||= effect.percent ?? effect.flat ?? 0;
        break;
      case 'damage_bonus':
      case 'damage_bonus_per':
      case 'crit_rate_per':
      case 'damage_reduction':
        numbers.value ||= effect.value;
        break;
      case 'survive_lethal':
        numbers.value ||= effect.hpPercent;
        numbers.shield ||= effect.shield ?? 0;
        break;
      case 'extra_turn_chance':
        numbers.chance ||= effect.chance;
        break;
      case 'shield_ally_below':
        numbers.value ||= effect.hpPercent;
        numbers.shield ||= effect.shield;
        numbers.turns ||= effect.turns;
        break;
      case 'on_heal_grant':
        numbers.turns ||= effect.turns;
        numbers.value ||= effect.value ?? 0;
        break;
      case 'on_stun_gain_tm':
        numbers.tm ||= Math.round(Math.abs(effect.delta) * 100);
        break;
      default:
        break;
    }
  }
  return numbers;
}

function numbersFromEffects(flat: readonly Effect[], cooldown: number): AbilityNumbers {
  const damages = flat.filter((e): e is Extract<Effect, { kind: 'damage' }> => e.kind === 'damage');
  const heals = flat.filter((e): e is Extract<Effect, { kind: 'heal' }> => e.kind === 'heal');
  const statuses = flat.filter(
    (e): e is Extract<Effect, { kind: 'apply_status' }> => e.kind === 'apply_status',
  );
  const tms = flat.filter((e): e is Extract<Effect, { kind: 'tm' }> => e.kind === 'tm');
  const first = damages[0];
  const mults = damages.map((d) => d.mult);
  const shield = statuses.find((s) => s.status === 'shield');
  const status = statuses.find((s) => s.status !== 'shield') ?? statuses[0];
  return {
    dmg: first ? pct(first.mult) : '0',
    hits: first?.hits ?? 1,
    chance: status?.chance ?? 0,
    turns: status?.turns ?? 0,
    value: status?.value ?? 0,
    heal: heals[0] ? pct(heals[0].mult) : '0',
    shield: shield?.value ?? 0,
    tm: tms[0] ? Math.round(Math.abs(tms[0].delta) * 100) : 0,
    cooldown,
    defIgnore: first?.defIgnore ? Math.round(first.defIgnore * 100) : 0,
    dmg2: mults.length > 1 ? pct(mults[1] ?? 0) : first ? pct(first.mult) : '0',
  };
}

function flatten(effects: readonly Effect[]): Effect[] {
  const out: Effect[] = [];
  for (const effect of effects) {
    out.push(effect);
    if (effect.kind === 'conditional') {
      out.push(...flatten(effect.then));
      if (effect.else) out.push(...flatten(effect.else));
    }
    if (effect.kind === 'damage' && effect.onKill) out.push(...flatten(effect.onKill));
  }
  return out;
}
