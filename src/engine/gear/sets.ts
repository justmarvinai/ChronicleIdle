/**
 * Which set bonuses a build has earned (docs/design/GEAR.md §5). Two-piece sets stack — six
 * slots can hold three complete groups — and a four-piece set takes two thirds of a build, so at
 * most one of those plus one two-piece group.
 */
import type { GearSetDef } from '@content/sets/types';
import type { PassiveDef } from '@content/champions/types';
import type { GearInstance } from './instance';

export interface SetGroup {
  set: GearSetDef;
  /** Pieces worn from this set, and how many complete groups they make. */
  worn: number;
  groups: number;
}

/**
 * Counts the worn pieces per set and reports every complete group. A set with five pieces of a
 * two-piece bonus counts twice, not two and a half.
 */
export function setGroups(
  worn: readonly GearInstance[],
  setById: (id: string) => GearSetDef | undefined,
): SetGroup[] {
  const counts = new Map<string, number>();
  for (const piece of worn) counts.set(piece.setId, (counts.get(piece.setId) ?? 0) + 1);
  const groups: SetGroup[] = [];
  for (const [id, count] of counts) {
    const set = setById(id);
    if (!set) continue;
    groups.push({ set, worn: count, groups: Math.floor(count / set.pieces) });
  }
  return groups.sort((a, b) => a.set.id.localeCompare(b.set.id));
}

/** The passives a build's complete groups grant, one copy per group (GEAR.md §5). */
export function setPassives(
  worn: readonly GearInstance[],
  setById: (id: string) => GearSetDef | undefined,
): PassiveDef[] {
  const passives: PassiveDef[] = [];
  for (const group of setGroups(worn, setById))
    for (let i = 0; i < group.groups; i += 1)
      for (const passive of group.set.passives)
        // One id per group, so `oncePerBattle` bookkeeping and the battle log stay unambiguous.
        passives.push(i === 0 ? passive : { ...passive, id: `${passive.id}_g${i + 1}` });
  return passives;
}

/** How many more pieces of a set the build needs for its next group — for the compare panel. */
export function piecesToNextGroup(group: SetGroup): number {
  return group.set.pieces - (group.worn % group.set.pieces);
}
