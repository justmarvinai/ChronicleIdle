/**
 * Small builders that keep champion files readable (docs/tech/CONTENT_AUTHORING.md §2). They only
 * assemble plain objects; validation happens in `@engine/schema/content`.
 */
import type { AvatarKey, ModelKey, SpellKey } from '@assets/manifest.generated';
import type {
  AbilityAi,
  AbilityDef,
  AbilitySlot,
  AbilityUpgrade,
  AuraDef,
  ChampionArt,
  ChampionDef,
  ChampionId,
  Condition,
  DamageStat,
  Effect,
  HealStat,
  PassiveDef,
  PassiveEffect,
  PassiveTrigger,
  StatusId,
  Target,
} from './types';

type DamageExtra = Partial<Omit<Extract<Effect, { kind: 'damage' }>, 'kind' | 'target' | 'mult' | 'stat'>>;

/** `k × ATK` (or another stat) on a target. */
export function hit(
  mult: number,
  target: Target = 'single_enemy',
  extra: DamageExtra & { stat?: DamageStat } = {},
): Effect {
  const { stat = 'ATK', ...rest } = extra;
  return { kind: 'damage', target, mult, stat, ...rest };
}

/** Apply a buff/debuff with a landing chance (100 = guaranteed before RES/ACC). */
export function status(
  id: StatusId,
  turns: number,
  opts: { target?: Target; chance?: number; value?: number; maxTargets?: number } = {},
): Effect {
  const { target = 'single_enemy', chance = 100, value, maxTargets } = opts;
  return {
    kind: 'apply_status',
    target,
    status: id,
    turns,
    chance,
    ...(value === undefined ? {} : { value }),
    ...(maxTargets === undefined ? {} : { maxTargets }),
  };
}

/** Heal `mult × stat` on the target (`TARGET_MAX_HP` = percentage of the target's own max HP). */
export function heal(
  mult: number,
  target: Target = 'single_ally',
  stat: HealStat = 'TARGET_MAX_HP',
  opts: { per?: 'target_debuff' } = {},
): Effect {
  return { kind: 'heal', target, mult, stat, ...(opts.per === undefined ? {} : { per: opts.per }) };
}

export function cleanse(target: Target, count: number | 'all'): Effect {
  return { kind: 'remove_status', target, which: 'debuffs', count };
}

export function strip(target: Target, count: number | 'all'): Effect {
  return { kind: 'remove_status', target, which: 'buffs', count };
}

/** Turn-meter change as a fraction of the bar (+0.2 = Increase TM 20 %). */
export function tm(delta: number, target: Target, chance?: number): Effect {
  return chance === undefined ? { kind: 'tm', target, delta } : { kind: 'tm', target, delta, chance };
}

export function revive(target: Target, hpPercent: number): Effect {
  return { kind: 'revive', target, hpPercent };
}

export function extraTurn(condition?: Condition): Effect {
  return condition
    ? { kind: 'extra_turn', target: 'self', if: condition }
    : { kind: 'extra_turn', target: 'self' };
}

export function leech(percentOfDamage: number): Effect {
  return { kind: 'leech', percentOfDamage };
}

export function when(condition: Condition, then: Effect[], otherwise?: Effect[]): Effect {
  return otherwise
    ? { kind: 'conditional', if: condition, then, else: otherwise }
    : { kind: 'conditional', if: condition, then };
}

export const up = {
  dmg: (value: number): AbilityUpgrade => ({ type: 'damage', value }),
  cd: (value = 1): AbilityUpgrade => ({ type: 'cooldown', value }),
  chance: (value: number): AbilityUpgrade => ({ type: 'chance', value }),
  heal: (value: number): AbilityUpgrade => ({ type: 'heal', value }),
  duration: (value = 1): AbilityUpgrade => ({ type: 'duration', value }),
  shield: (value: number): AbilityUpgrade => ({ type: 'shield', value }),
  tm: (value: number): AbilityUpgrade => ({ type: 'tm', value }),
};

interface AbilityInput {
  slot: AbilitySlot;
  /** Short key; the id becomes `ab.<champion>.<key>` and the i18n keys follow the same path. */
  key: string;
  icon: SpellKey;
  cooldown?: number;
  startsOnCooldown?: boolean;
  effects: Effect[];
  upgrades?: AbilityUpgrade[];
  ai?: AbilityAi;
}

interface PassiveInput {
  key: string;
  icon: SpellKey;
  trigger: PassiveTrigger;
  effects: PassiveEffect[];
  oncePerBattle?: boolean;
}

interface AuraInput {
  key: string;
  icon: SpellKey;
  effects: PassiveEffect[];
  scope?: AuraDef['scope'];
}

export interface ChampionInput {
  id: ChampionId;
  rarity: ChampionDef['rarity'];
  element: ChampionDef['element'];
  role: ChampionDef['role'];
  /** HP / ATK / DEF / SPD / C.RATE / C.DMG / RES / ACC at 6★ level 60. */
  stats: [number, number, number, number, number, number, number, number];
  /** A finished model, or a placeholder tint for the lizard. */
  art: { model: ModelKey; avatar: AvatarKey; facing: 'left' | 'right' } | { placeholderTint: string };
  obtain: ChampionDef['obtain'];
  abilities: AbilityInput[];
  passive?: PassiveInput;
  aura?: AuraInput;
  version?: number;
}

const PLACEHOLDER: Omit<ChampionArt, 'tint'> = {
  model: 'model.teritorial_lizard',
  avatar: 'avatar.teritorial_lizard',
  facing: 'left',
  placeholder: true,
};

function slug(id: ChampionId): string {
  return id.replace(/^champ\./, '');
}

/** Builds a fully keyed champion definition; only numbers and keys are authored by hand. */
export function defineChampion(input: ChampionInput): ChampionDef {
  const champ = slug(input.id);
  const [hp, atk, def, spd, critRate, critDmg, res, acc] = input.stats;
  const art: ChampionArt =
    'placeholderTint' in input.art
      ? { ...PLACEHOLDER, tint: input.art.placeholderTint }
      : { ...input.art, tint: null, placeholder: false };
  const abilities: AbilityDef[] = input.abilities.map((a) => ({
    slot: a.slot,
    id: `ab.${champ}.${a.key}`,
    name: `ab.${champ}.${a.key}.name`,
    description: `ab.${champ}.${a.key}.description`,
    icon: a.icon,
    cooldown: a.cooldown ?? 0,
    ...(a.startsOnCooldown ? { startsOnCooldown: true } : {}),
    effects: a.effects,
    upgrades: a.upgrades ?? [],
    ai: a.ai ?? { priority: a.slot === 'a1' ? 1 : 2 },
  }));
  const passive: PassiveDef | undefined = input.passive
    ? {
        id: `ab.${champ}.${input.passive.key}`,
        name: `ab.${champ}.${input.passive.key}.name`,
        description: `ab.${champ}.${input.passive.key}.description`,
        icon: input.passive.icon,
        trigger: input.passive.trigger,
        effects: input.passive.effects,
        ...(input.passive.oncePerBattle ? { oncePerBattle: true } : {}),
      }
    : undefined;
  const aura: AuraDef | undefined = input.aura
    ? {
        id: `ab.${champ}.${input.aura.key}`,
        name: `ab.${champ}.${input.aura.key}.name`,
        description: `ab.${champ}.${input.aura.key}.description`,
        icon: input.aura.icon,
        effects: input.aura.effects,
        ...(input.aura.scope ? { scope: input.aura.scope } : {}),
      }
    : undefined;
  return {
    id: input.id,
    name: `${input.id}.name`,
    lore: `${input.id}.lore`,
    rarity: input.rarity,
    element: input.element,
    role: input.role,
    stats: { hp, atk, def, spd, critRate, critDmg, res, acc },
    art,
    obtain: input.obtain,
    abilities,
    ...(passive ? { passive } : {}),
    ...(aura ? { aura } : {}),
    version: input.version ?? 1,
  };
}
