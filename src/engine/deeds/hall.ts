/**
 * The Hall of Deeds as arithmetic (docs/design/ACHIEVEMENTS.md).
 *
 * Everything the Hall shows is derived from what the save says was claimed and from the goal
 * evaluator reading the chronicle now, against a baseline of zero: a tier is claimable when its
 * goal is met, renown is the sum of what was claimed, and the rank is where that sum stands on
 * the ladder. Nothing here is stored and nothing here writes — claiming is `@state/deeds`, which
 * asks these same functions first so the screen and the claim can never disagree.
 */
import type {
  AchievementDef,
  AchievementTierDef,
  ChallengeDef,
  HallRankDef,
  PortraitFrameDef,
} from '@content/deeds/types';
import { fail, ok, type Result } from '@engine/errors';
import { evaluateGoal, type GoalContext, type GoalProgress } from '@engine/quests/goals';
import type { DeedsSave } from '@engine/schema/save';

/** The Hall's content, handed in so the engine stays free of the registry. */
export interface HallContent {
  achievements: readonly AchievementDef[];
  challenges: readonly ChallengeDef[];
  ranks: readonly HallRankDef[];
}

/** Where a deed stands: its goal met and waiting, still being worked at, or claimed for good. */
export type DeedStatus = 'claimable' | 'open' | 'done';

export interface AchievementView {
  def: AchievementDef;
  /** Tiers claimed, 0–5. */
  claimed: number;
  /** The tier being worked towards — the first unclaimed — or null once all five are claimed. */
  tier: AchievementTierDef | null;
  /** How far along that tier's goal is; null once all five are claimed. */
  progress: GoalProgress | null;
  status: DeedStatus;
  /** Tiers that could be claimed one after another right now, the first of them included. */
  claimable: number;
}

export interface ChallengeView {
  def: ChallengeDef;
  progress: GoalProgress;
  /** `done` once claimed. */
  status: DeedStatus;
}

export interface RankView {
  def: HallRankDef;
  /** A rank reached but not yet claimed is `claimable`; ranks are claimed in order. */
  status: 'claimed' | 'claimable' | 'locked';
}

export interface HallView {
  achievements: AchievementView[];
  challenges: ChallengeView[];
  ranks: RankView[];
  renown: number;
  /** Ranks claimed. */
  rank: number;
  /** The rank after the last one claimed, reached or not; null once the last is claimed. */
  next: HallRankDef | null;
  /** Everything waiting to be claimed: tiers, challenges and ranks. */
  claimable: number;
}

/** Tiers of an achievement the save has claimed, clamped to the tiers the content has. */
export function tiersClaimed(def: AchievementDef, save: DeedsSave): number {
  return Math.max(0, Math.min(def.tiers.length, save.achievements[def.id] ?? 0));
}

/** One achievement as the Hall shows it: the tier in hand, its progress and what is waiting. */
export function achievementView(def: AchievementDef, save: DeedsSave, ctx: GoalContext): AchievementView {
  const claimed = tiersClaimed(def, save);
  const tier = def.tiers[claimed] ?? null;
  if (!tier) return { def, claimed, tier: null, progress: null, status: 'done', claimable: 0 };
  const progress = evaluateGoal(tier.goal, ctx);
  let claimable = 0;
  for (const next of def.tiers.slice(claimed)) {
    const met = next === tier ? progress.done : evaluateGoal(next.goal, ctx).done;
    if (!met) break;
    claimable += 1;
  }
  return { def, claimed, tier, progress, status: claimable > 0 ? 'claimable' : 'open', claimable };
}

/** One challenge as the Hall shows it. A claimed challenge keeps its bar full, whatever came after. */
export function challengeView(def: ChallengeDef, save: DeedsSave, ctx: GoalContext): ChallengeView {
  const progress = evaluateGoal(def.goal, ctx);
  if (save.challenges.includes(def.id))
    return {
      def,
      progress: { progress: progress.target, target: progress.target, done: true },
      status: 'done',
    };
  return { def, progress, status: progress.done ? 'claimable' : 'open' };
}

/**
 * Renown: what everything claimed was worth (ACHIEVEMENTS.md §2) — each achievement's claimed
 * tiers and each claimed challenge. Derived, so it cannot drift from the claims.
 */
export function renownOf(content: Pick<HallContent, 'achievements' | 'challenges'>, save: DeedsSave): number {
  let renown = 0;
  for (const def of content.achievements)
    for (const tier of def.tiers.slice(0, tiersClaimed(def, save))) renown += tier.renown;
  for (const def of content.challenges) if (save.challenges.includes(def.id)) renown += def.renown;
  return renown;
}

/** The ladder as it stands: claimed, reached and waiting, or still out of reach. */
export function rankViews(ranks: readonly HallRankDef[], save: DeedsSave, renown: number): RankView[] {
  return ranks.map((def) => ({
    def,
    status: def.rank <= save.ranks ? 'claimed' : renown >= def.renown ? 'claimable' : 'locked',
  }));
}

/** The whole Hall, for the screen and for the dot on its button. */
export function hallView(content: HallContent, save: DeedsSave, ctx: GoalContext): HallView {
  const achievements = content.achievements.map((def) => achievementView(def, save, ctx));
  const challenges = content.challenges.map((def) => challengeView(def, save, ctx));
  const renown = renownOf(content, save);
  const ranks = rankViews(content.ranks, save, renown);
  const claimable =
    achievements.reduce((sum, view) => sum + view.claimable, 0) +
    challenges.filter((view) => view.status === 'claimable').length +
    ranks.filter((view) => view.status === 'claimable').length;
  return {
    achievements,
    challenges,
    ranks,
    renown,
    rank: save.ranks,
    next: content.ranks.find((def) => def.rank === save.ranks + 1) ?? null,
    claimable,
  };
}

/** The tier an achievement would pay if claimed now — or why it would not. */
export function tierToClaim(
  def: AchievementDef,
  save: DeedsSave,
  ctx: GoalContext,
): Result<AchievementTierDef> {
  const view = achievementView(def, save, ctx);
  if (!view.tier) return fail('invalid_argument', `${def.id} has every tier claimed`);
  if (view.status !== 'claimable')
    return fail('invalid_argument', `${def.id} tier ${view.tier.tier} is not met`);
  return ok(view.tier);
}

/** Whether a challenge may be claimed now. */
export function challengeToClaim(def: ChallengeDef, save: DeedsSave, ctx: GoalContext): Result<ChallengeDef> {
  if (save.challenges.includes(def.id)) return fail('invalid_argument', `${def.id} is already claimed`);
  if (!evaluateGoal(def.goal, ctx).done) return fail('invalid_argument', `${def.id} is not met`);
  return ok(def);
}

/** The next rank, if the renown claimed so far reaches it. Ranks are claimed in order. */
export function rankToClaim(content: HallContent, save: DeedsSave): Result<HallRankDef> {
  const next = content.ranks.find((def) => def.rank === save.ranks + 1);
  if (!next) return fail('invalid_argument', 'Every rank of the Hall is claimed');
  const renown = renownOf(content, save);
  if (renown < next.renown)
    return fail(
      'invalid_argument',
      `Rank ${next.rank} stands on ${next.renown} renown; ${renown} is claimed`,
    );
  return ok(next);
}

/** Whether a portrait frame is earned: its rank claimed, or its challenge claimed (ACHIEVEMENTS.md §3). */
export function isFrameEarned(frame: PortraitFrameDef, save: DeedsSave): boolean {
  return frame.source.kind === 'rank'
    ? save.ranks >= frame.source.rank
    : save.challenges.includes(frame.source.id);
}

/** The frames a chronicle may wear, in the content's order. */
export function earnedFrames(frames: readonly PortraitFrameDef[], save: DeedsSave): PortraitFrameDef[] {
  return frames.filter((frame) => isFrameEarned(frame, save));
}
