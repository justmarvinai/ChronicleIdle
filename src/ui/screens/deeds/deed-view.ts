/**
 * What the Hall of Deeds draws beyond the engine's view (docs/tech/UI_DESIGN.md §5.31): the order
 * the cards are dealt in, what each ledger owes, how far the renown has climbed towards the next
 * rank, and the frames and titles a rank or a challenge hangs up besides its currencies.
 */
import { DEED_LEDGERS, type DeedLedger, type PortraitFrameDef } from '@content/deeds/types';
import { content } from '@content/registry';
import type { TitleDef } from '@content/titles/types';
import type { AchievementView, ChallengeView, DeedStatus, HallView } from '@engine/deeds/hall';

/** The Hall's filter: one ledger, or every one of them. */
export type LedgerFilter = DeedLedger | 'all';
export const LEDGER_FILTERS: readonly LedgerFilter[] = ['all', ...DEED_LEDGERS];

const WEIGHT: Readonly<Record<DeedStatus, number>> = { claimable: 0, open: 1, done: 2 };

/**
 * What is owed first, what is being worked at next — the nearest to done at the top — and what is
 * finished last. Within a group the content's own order holds, so a card never jumps around
 * because another one moved a step.
 */
export function orderAchievements(
  views: readonly AchievementView[],
  filter: LedgerFilter,
): AchievementView[] {
  const share = (view: AchievementView): number =>
    view.progress ? view.progress.progress / Math.max(1, view.progress.target) : 0;
  return views
    .filter((view) => filter === 'all' || view.def.ledger === filter)
    .map((view, index) => ({ view, index }))
    .sort(
      (a, b) =>
        WEIGHT[a.view.status] - WEIGHT[b.view.status] ||
        (a.view.status === 'open' ? share(b.view) - share(a.view) : 0) ||
        a.index - b.index,
    )
    .map(({ view }) => view);
}

/** Challenges owed first, then the ones still to do, then the ones claimed. */
export function orderChallenges(views: readonly ChallengeView[]): ChallengeView[] {
  return views
    .map((view, index) => ({ view, index }))
    .sort((a, b) => WEIGHT[a.view.status] - WEIGHT[b.view.status] || a.index - b.index)
    .map(({ view }) => view);
}

/** Tiers waiting per ledger, and in all — the dots on the filter. */
export function ledgerOwed(views: readonly AchievementView[]): Readonly<Record<LedgerFilter, number>> {
  const owed = Object.fromEntries(LEDGER_FILTERS.map((filter) => [filter, 0])) as Record<
    LedgerFilter,
    number
  >;
  for (const view of views) {
    owed[view.def.ledger] += view.claimable;
    owed.all += view.claimable;
  }
  return owed;
}

/** How far the renown has come from the last rank claimed towards the next, 0–1. */
export function rankShare(view: Pick<HallView, 'renown' | 'next' | 'rank'>): number {
  if (!view.next) return 1;
  const from = content.hallRanks.find((def) => def.rank === view.rank)?.renown ?? 0;
  return Math.max(0, Math.min(1, (view.renown - from) / Math.max(1, view.next.renown - from)));
}

/** The frames and titles a rank or a challenge hangs up — read off the frames and titles themselves. */
export interface DeedExtras {
  frames: PortraitFrameDef[];
  titles: TitleDef[];
}

export function rankExtras(rank: number): DeedExtras {
  return {
    frames: content.frames.filter((frame) => frame.source.kind === 'rank' && frame.source.rank === rank),
    titles: content.titles.filter(
      (title) => title.condition.kind === 'hall_rank' && title.condition.rank === rank,
    ),
  };
}

export function challengeExtras(challengeId: string): DeedExtras {
  return {
    frames: content.frames.filter(
      (frame) => frame.source.kind === 'challenge' && frame.source.id === challengeId,
    ),
    titles: content.titles.filter(
      (title) => title.condition.kind === 'challenge' && title.condition.id === challengeId,
    ),
  };
}
