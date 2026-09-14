/**
 * How a piece of gear reads on screen: its name, its stats and what swapping it would do to a
 * champion. The rules are all in `@engine/gear/*`; this turns their numbers into strings and
 * into the before/after rows the compare panel draws.
 */
import type { SpellKey } from '@assets/manifest.generated';
import { GEAR_MAX_LEVEL, SUBSTAT_ROLL_LEVELS, type GearStat } from '@content/balance/gear';
import { STAT_IDS, type ChampionDef, type GearSlot, type StatId } from '@content/champions/types';
import type { GearSetDef } from '@content/sets/types';
import { content } from '@content/registry';
import type { ChampionInstance } from '@engine/champions/instance';
import { totalPower, totalStats } from '@engine/gear/champion-stats';
import type { GearInstance, GearSubStat } from '@engine/gear/instance';
import { setGroups, type SetGroup } from '@engine/gear/sets';
import { isPercentStat, mainOf } from '@engine/gear/stats';
import { t, translate, type I18nKey } from '@i18n/index';

export const setOf = (piece: GearInstance): GearSetDef | undefined => content.gearSetById(piece.setId);

/** The champion a piece is on, resolved for display; null while it sits on the rack. */
export function wearerName(wearer: ChampionInstance | null): string | null {
  if (!wearer) return null;
  const def = content.championById(wearer.defId);
  return def ? translate(def.name) : wearer.instanceId;
}

/** A piece wears its set's crest; a piece whose set vanished falls back to its slot glyph's kin. */
export function pieceIcon(piece: GearInstance): SpellKey {
  return setOf(piece)?.icon ?? 'spell.crest_ember_shield';
}

export const slotLabel = (slot: GearSlot): string => t(`champions.gear.slot.${slot}` as I18nKey);
export const gearStatLabel = (stat: GearStat): string => t(`gear.stat.${stat}` as I18nKey);
export const statLabel = (stat: StatId): string => t(`champions.stat.${stat}` as I18nKey);

/** "Warcry Weapon" — set first, because that is what a player is hunting for. */
export function pieceName(piece: GearInstance): string {
  const set = setOf(piece);
  return t('gear.piece', {
    set: set ? translate(set.name) : piece.setId,
    slot: slotLabel(piece.slot),
  });
}

/** `+1,240` or `+12 %`, the way the design doc writes them. */
export function formatGearValue(stat: GearStat, value: number): string {
  const rounded = Math.round(value);
  return isPercentStat(stat) ? `+${rounded} %` : `+${rounded.toLocaleString('en-US')}`;
}

export function mainStatLine(piece: GearInstance): string {
  const main = mainOf(piece);
  return `${gearStatLabel(main.stat)} ${formatGearValue(main.stat, main.value)}`;
}

export function subStatLine(sub: GearSubStat): string {
  return `${gearStatLabel(sub.stat)} ${formatGearValue(sub.stat, sub.value)}`;
}

/** A champion stat as the panels print it: percentage-shaped stats carry their sign. */
export function formatStat(stat: StatId, value: number): string {
  if (stat === 'critRate' || stat === 'critDmg') return `${value}%`;
  return value.toLocaleString('en-US');
}

/** The level of the next roll, or null once the piece is finished. */
export function nextRollLevel(piece: GearInstance): number | null {
  return SUBSTAT_ROLL_LEVELS.find((level) => level > piece.level) ?? null;
}

export const atMaxLevel = (piece: GearInstance): boolean => piece.level >= GEAR_MAX_LEVEL;

export interface SetLine {
  group: SetGroup;
  /** Pieces still missing before the next complete group. */
  missing: number;
}

/** What the champion's sets give right now, complete groups first. */
export function setLines(worn: readonly GearInstance[]): SetLine[] {
  return setGroups(worn, content.gearSetById)
    .map((group) => ({ group, missing: group.set.pieces - (group.worn % group.set.pieces) }))
    .sort((a, b) => b.group.groups - a.group.groups || a.group.worn - b.group.worn);
}

export interface StatDelta {
  stat: StatId;
  before: number;
  after: number;
  delta: number;
}

export interface GearCompare {
  rows: StatDelta[];
  power: { before: number; after: number; delta: number };
  /** Sets the swap completes, and sets it breaks. */
  gained: GearSetDef[];
  lost: GearSetDef[];
}

/**
 * What wearing `piece` would do (GEAR.md §7): every stat before and after, the power either side
 * and the set groups the swap makes or breaks. `piece` of null asks what taking the slot's piece
 * off would do.
 */
export function compareEquip(
  def: ChampionDef,
  instance: ChampionInstance,
  worn: readonly GearInstance[],
  slot: GearSlot,
  piece: GearInstance | null,
): GearCompare {
  const after = worn.filter((p) => p.slot !== slot);
  if (piece) after.push(piece);
  const before = totalStats(def, instance, worn, content.gearSetById);
  const next = totalStats(def, instance, after, content.gearSetById);
  const rows = STAT_IDS.map((stat) => ({
    stat,
    before: before[stat],
    after: next[stat],
    delta: next[stat] - before[stat],
  }));
  const powerBefore = totalPower(def, instance, worn, content.gearSetById);
  const powerAfter = totalPower(def, instance, after, content.gearSetById);
  const groupsBefore = countGroups(worn);
  const groupsAfter = countGroups(after);
  const gained: GearSetDef[] = [];
  const lost: GearSetDef[] = [];
  for (const [id, set] of setsIn([...worn, ...after])) {
    const was = groupsBefore.get(id) ?? 0;
    const now = groupsAfter.get(id) ?? 0;
    if (now > was) gained.push(set);
    else if (now < was) lost.push(set);
  }
  return {
    rows,
    power: { before: powerBefore, after: powerAfter, delta: powerAfter - powerBefore },
    gained,
    lost,
  };
}

function countGroups(worn: readonly GearInstance[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const group of setGroups(worn, content.gearSetById)) out.set(group.set.id, group.groups);
  return out;
}

function setsIn(pieces: readonly GearInstance[]): Map<string, GearSetDef> {
  const out = new Map<string, GearSetDef>();
  for (const piece of pieces) {
    const set = setOf(piece);
    if (set) out.set(set.id, set);
  }
  return out;
}
