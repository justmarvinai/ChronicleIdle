/**
 * Champion instances as stored in the save (docs/design/CHAMPIONS.md §6). Instances hold only
 * what changes per copy; everything else is looked up on the definition by `defId`.
 */
import { GEAR_SLOTS, type ChampionDef, type ChampionId, type GearSlot, type ObtainSource } from './imports';
import { baseStars } from './stats';

export interface ChampionInstance {
  instanceId: string;
  defId: ChampionId;
  level: number;
  xp: number;
  stars: number;
  /** Skill Tome steps applied per ability id. */
  skillUpgrades: Record<string, number>;
  gear: Record<GearSlot, string | null>;
  locked: boolean;
  favourite: boolean;
  acquiredAt: number;
  source: ObtainSource;
}

export type Roster = Record<string, ChampionInstance>;

export function emptyGear(): Record<GearSlot, string | null> {
  return Object.fromEntries(GEAR_SLOTS.map((slot) => [slot, null])) as Record<GearSlot, string | null>;
}

/** Instance ids are `<def>-<n>` with `n` the save's running counter, so they are stable and readable. */
export function instanceIdFor(defId: ChampionId, serial: number): string {
  return `${defId.replace(/^champ\./, '')}-${serial}`;
}

/** A fresh copy at the rarity's base stars, level 1, no XP, no gear. */
export function createInstance(
  def: ChampionDef,
  input: { instanceId: string; now: number; source: ObtainSource },
): ChampionInstance {
  return {
    instanceId: input.instanceId,
    defId: def.id,
    level: 1,
    xp: 0,
    stars: baseStars(def.rarity),
    skillUpgrades: {},
    gear: emptyGear(),
    locked: false,
    favourite: false,
    acquiredAt: input.now,
    source: input.source,
  };
}
