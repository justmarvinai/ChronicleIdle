/**
 * `defineEnemy`: the enemy counterpart of `defineChampion`. Ids and i18n keys derive from the
 * enemy id (`enemy.remnant_raider` → `ab.remnant_raider.<key>`), abilities use the champion
 * effect builders, and the lizard placeholder is tinted per faction until faction models exist.
 */
import type { ModelKey, SpellKey } from '@assets/manifest.generated';
import { facingOf, PLACEHOLDER_MODEL as LIZARD } from '@content/champions/models';
import type {
  AbilityAi,
  AbilityDef,
  AbilitySlot,
  Effect,
  PassiveDef,
  PassiveEffect,
  PassiveTrigger,
} from '@content/champions/types';
import type { EnemyBossConfig, EnemyDef } from './types';

interface EnemyAbilityInput {
  slot: AbilitySlot;
  key: string;
  icon: SpellKey;
  cooldown?: number;
  startsOnCooldown?: boolean;
  /** The phase this ability opens in (BOSSES.md §3); the rotation passes it over until then. */
  minPhase?: number;
  effects: Effect[];
  ai?: AbilityAi;
}

interface EnemyPassiveInput {
  key: string;
  icon: SpellKey;
  trigger: PassiveTrigger;
  effects: PassiveEffect[];
  oncePerBattle?: boolean;
}

export interface EnemyInput {
  id: string;
  archetype: EnemyDef['archetype'];
  element: EnemyDef['element'];
  role: EnemyDef['role'];
  /** HP / ATK / DEF / SPD / C.RATE / C.DMG / RES / ACC at Intro, stage index 0. */
  stats: [number, number, number, number, number, number, number, number];
  art: UnitArt;
  abilities: EnemyAbilityInput[];
  passives?: EnemyPassiveInput[];
  boss?: EnemyBossConfig;
  version?: number;
}

/**
 * How a unit is drawn: **either** its own finished sheet **or** the placeholder wearing a tint.
 *
 * The two are exclusive, the same way `defineChampion`'s art is. Tinting a finished sheet is how
 * you get a sprite nobody drew, and `desaturate` exists only so a pale tint can read over the
 * lizard's own colours — neither has any business near real art. Before the Gargoyle and the Titan
 * were drawn, a tint was *required* here, so giving either of them their sheet meant leaving a
 * dead colour behind on it.
 */
export type UnitArt = { scale?: number } & ({ model: ModelKey } | { tint: string; desaturate?: boolean });

/** The stored art for a unit: a real sheet carries no tint, a placeholder carries nothing else. */
export function resolveArt(art: UnitArt): EnemyDef['art'] {
  const model = 'model' in art ? art.model : LIZARD;
  return {
    model,
    tint: 'model' in art ? null : art.tint,
    facing: facingOf(model),
    scale: art.scale ?? 1,
    ...('model' in art || !art.desaturate ? {} : { desaturate: true as const }),
  };
}

export function defineEnemy(input: EnemyInput): EnemyDef {
  const slug = input.id.replace(/^enemy\./, '');
  const [hp, atk, def, spd, critRate, critDmg, res, acc] = input.stats;
  const abilities: AbilityDef[] = input.abilities.map((a) => ({
    slot: a.slot,
    id: `ab.${slug}.${a.key}`,
    name: `ab.${slug}.${a.key}.name`,
    description: `ab.${slug}.${a.key}.description`,
    icon: a.icon,
    cooldown: a.cooldown ?? 0,
    ...(a.startsOnCooldown ? { startsOnCooldown: true } : {}),
    ...(a.minPhase === undefined ? {} : { minPhase: a.minPhase }),
    effects: a.effects,
    upgrades: [],
    // Campaign enemies prefer their strongest ready ability (CAMPAIGN.md §5, BATTLE.md §7).
    ai: a.ai ?? { priority: a.slot === 'a1' ? 1 : a.slot === 'a2' ? 2 : 3 },
  }));
  const passives: PassiveDef[] = (input.passives ?? []).map((p) => ({
    id: `ab.${slug}.${p.key}`,
    name: `ab.${slug}.${p.key}.name`,
    description: `ab.${slug}.${p.key}.description`,
    icon: p.icon,
    trigger: p.trigger,
    effects: p.effects,
    ...(p.oncePerBattle ? { oncePerBattle: true } : {}),
  }));
  return {
    id: input.id,
    name: `${input.id}.name`,
    archetype: input.archetype,
    element: input.element,
    role: input.role,
    stats: { hp, atk, def, spd, critRate, critDmg, res, acc },
    art: resolveArt(input.art),
    abilities,
    passives,
    ...(input.boss ? { boss: input.boss } : {}),
    version: input.version ?? 1,
  };
}
