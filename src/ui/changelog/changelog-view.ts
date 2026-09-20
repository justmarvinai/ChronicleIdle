/**
 * What the Chronicle of Changes shows: the releases, filtered to one kind of line and ordered
 * the way the reader asked for (docs/tech/UI_DESIGN.md §5.21).
 *
 * The content is authored newest first and printed as authored, so "oldest first" is a reversal
 * rather than a sort — the panel never has to know how to compare two version strings.
 */
import { CHANGE_KINDS, type ChangeDef, type ChangeKind, type ReleaseDef } from '@content/changelog/types';

/** The filter chips: one per kind, plus the everything chip the panel opens on. */
export type ChangeFilter = ChangeKind | 'all';
export const CHANGE_FILTERS: readonly ChangeFilter[] = ['all', ...CHANGE_KINDS];

export type ChangeOrder = 'newest' | 'oldest';

export interface ReleaseView {
  release: ReleaseDef;
  /** The lines that survived the filter; a release with none of them is dropped. */
  changes: readonly ChangeDef[];
  /** The newest release there is, whichever end of the list it is printed at. */
  latest: boolean;
}

/** The releases to print, in reading order, with releases the filter empties left out. */
export function releaseViews(
  releases: readonly ReleaseDef[],
  filter: ChangeFilter,
  order: ChangeOrder,
): ReleaseView[] {
  const newest = releases[0];
  const views = releases.flatMap((release) => {
    const changes = filter === 'all' ? release.changes : release.changes.filter((c) => c.kind === filter);
    return changes.length === 0 ? [] : [{ release, changes, latest: release === newest }];
  });
  return order === 'newest' ? views : views.reverse();
}

/** How many lines of each kind the chronicle holds, for the numbers on the chips. */
export function kindCounts(releases: readonly ReleaseDef[]): Record<ChangeFilter, number> {
  const counts = Object.fromEntries(CHANGE_FILTERS.map((f) => [f, 0])) as Record<ChangeFilter, number>;
  for (const release of releases)
    for (const change of release.changes) {
      counts.all += 1;
      counts[change.kind] += 1;
    }
  return counts;
}
