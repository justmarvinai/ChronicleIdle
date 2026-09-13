/**
 * Team validation and presets (docs/design/BATTLE.md §1, UI_DESIGN.md §5.8): an ordered list
 * of owned roster instance ids, slot 0 the leader, no duplicates, sized by the encounter.
 */
import type { Roster } from '@engine/champions/instance';
import { fail, ok, type Result } from '@engine/errors';

export interface TeamCheck {
  instanceIds: string[];
}

/** Drops unknown or duplicate ids and trims to `partySize` (used when loading a preset). */
export function sanitizeTeam(roster: Roster, instanceIds: readonly string[], partySize: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of instanceIds) {
    if (!roster[id] || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= partySize) break;
  }
  return out;
}

/** A team the battle can start with: 1..partySize owned, distinct champions. */
export function validateTeam(
  roster: Roster,
  instanceIds: readonly string[],
  partySize: number,
): Result<TeamCheck> {
  if (instanceIds.length === 0) return fail('invalid_argument', 'A team needs at least one champion');
  if (instanceIds.length > partySize)
    return fail('invalid_argument', `This encounter fields at most ${partySize} champions`, { partySize });
  const seen = new Set<string>();
  for (const id of instanceIds) {
    if (!roster[id]) return fail('invalid_argument', `Unknown champion ${id}`, { instanceId: id });
    if (seen.has(id)) return fail('invalid_argument', `${id} is already in the team`, { instanceId: id });
    seen.add(id);
  }
  return ok({ instanceIds: [...instanceIds] });
}

/** Suggests a team: last used if still valid, else the strongest owned champions by power. */
export function suggestTeam(
  roster: Roster,
  lastUsed: readonly string[],
  partySize: number,
  powerOf: (instanceId: string) => number,
): string[] {
  const kept = sanitizeTeam(roster, lastUsed, partySize);
  if (kept.length === partySize) return kept;
  const rest = Object.keys(roster)
    .filter((id) => !kept.includes(id))
    .sort((a, b) => powerOf(b) - powerOf(a) || a.localeCompare(b));
  return [...kept, ...rest].slice(0, partySize);
}
