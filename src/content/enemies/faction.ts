/**
 * `defineFaction`: a settlement's roster (docs/design/CAMPAIGN.md §5–§6). A faction fields the six
 * archetypes under its own names, element and tint, plus one named stage boss with its own kit.
 *
 * Rank-and-file units share the archetype ability ids and strings, so a faction file is names and
 * colours — never a copy of a kit. The boss is authored with `defineEnemy` like a champion.
 */
import type { Element, Role } from '@content/champions/types';
import { ARCHETYPES } from './archetypes';
import type { EnemyDef, FactionArchetype } from './types';

export interface FactionUnitInput {
  /** `<faction>_<unit>`, e.g. `thornwood_cutpurse`; the enemy id becomes `enemy.<slug>`. */
  slug: string;
  archetype: FactionArchetype;
  /** Defaults to the faction's dominant element. */
  element?: Element;
}

export interface FactionInput {
  /** `<snake_case>`, e.g. `thornwood_bandits`; the faction id becomes `faction.<slug>`. */
  slug: string;
  /** Dominant element: the settlement is best fought with the element that beats it. */
  element: Element;
  /** Multiply tint over the placeholder model until faction models exist (CLAUDE.md §2.7). */
  tint: string;
  units: readonly FactionUnitInput[];
  boss: EnemyDef;
  version?: number;
}

export interface FactionDef {
  id: string;
  /** i18n key. */
  name: string;
  element: Element;
  tint: string;
  /** The six rank-and-file units, in archetype order. */
  units: readonly EnemyDef[];
  boss: EnemyDef;
  /** Archetype → enemy id, for the stage DSL's wave shorthand. */
  byArchetype: Readonly<Record<FactionArchetype, string>>;
  version: number;
}

function unitDef(input: FactionUnitInput, faction: FactionInput): EnemyDef {
  const kit = ARCHETYPES[input.archetype];
  const [hp, atk, def, spd, critRate, critDmg, res, acc] = kit.stats;
  return {
    id: `enemy.${input.slug}`,
    name: `enemy.${input.slug}.name`,
    archetype: input.archetype,
    element: input.element ?? faction.element,
    role: kit.role as Role,
    stats: { hp, atk, def, spd, critRate, critDmg, res, acc },
    art: {
      model: 'model.teritorial_lizard',
      tint: faction.tint,
      facing: 'left',
      scale: kit.scale ?? 1,
    },
    abilities: kit.abilities.map((a) => ({
      slot: a.slot,
      id: `ab.arch.${input.archetype}.${a.key}`,
      name: `ab.arch.${input.archetype}.${a.key}.name`,
      description: `ab.arch.${input.archetype}.${a.key}.description`,
      icon: a.icon,
      cooldown: a.cooldown ?? 0,
      effects: a.effects,
      upgrades: [],
      ai: a.ai ?? { priority: a.slot === 'a1' ? 1 : 2 },
    })),
    passives: [],
    version: faction.version ?? 1,
  };
}

export function defineFaction(input: FactionInput): FactionDef {
  const units = input.units.map((u) => unitDef(u, input));
  const byArchetype = Object.fromEntries(
    input.units.map((u, i) => [u.archetype, units[i]?.id ?? '']),
  ) as Record<FactionArchetype, string>;
  return {
    id: `faction.${input.slug}`,
    name: `faction.${input.slug}.name`,
    element: input.element,
    tint: input.tint,
    units,
    boss: input.boss,
    byArchetype,
    version: input.version ?? 1,
  };
}
