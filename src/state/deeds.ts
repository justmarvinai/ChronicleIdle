/**
 * The Hall of Deeds in the save (docs/design/ACHIEVEMENTS.md).
 *
 * Everything the Hall shows is derived (`@engine/deeds/hall`); this module is the four things
 * that write — claiming an achievement's next tier, claiming a challenge, claiming the next rank,
 * choosing the frame worn — and "Claim all", which is the first three in turn. Every claim asks
 * the engine first, so a press the screen showed as claimable is exactly one the claim accepts,
 * and a second press is refused rather than paid twice.
 */
import { BOSS_STAGE_NUMBER } from '@content/balance/campaign';
import type { ChampionId } from '@content/champions/types';
import type { CurrencyAmount } from '@content/currencies/types';
import { content } from '@content/registry';
import type { BattleOutcome } from '@engine/battle/types';
import { parseStageEncounterId } from '@engine/campaign/encounter';
import { parseStageId } from '@engine/campaign/progress';
import { featsOf, type FeatKey } from '@engine/deeds/feats';
import {
  challengeToClaim,
  earnedFrames,
  hallView,
  isFrameEarned,
  rankToClaim,
  renownOf,
  tierToClaim,
  type HallContent,
  type HallView,
} from '@engine/deeds/hall';
import { fail, ok, type Result } from '@engine/errors';
import type { CurrencyChange } from '@engine/economy/wallet';
import { bumpCounter } from '@engine/progression/counters';
import { isFeatureUnlocked, unlockLevel } from '@engine/progression/unlocks';
import type { GoalContext } from '@engine/quests/goals';
import type { SaveGame } from '@engine/schema/save';
import { GOAL_LOOKUPS } from './goal-lookups';
import { palaceBonusOf } from './palace';
import { mergeAmounts, payCurrencies } from './payout';
import { titlesOf } from './progression';

/** The feature that opens the Hall (`GAME_DESIGN.md` §6). */
const FEATURE = 'deeds' as const;

/** The Hall's content, bound once. */
export const HALL: HallContent = {
  achievements: content.achievements,
  challenges: content.challenges,
  ranks: content.hallRanks,
};

/**
 * What the Hall's goals read: the whole chronicle against a baseline of zero, so a counter goal is
 * the counter's lifetime value and the Hall remembers everything done before it opened.
 */
export function deedsContext(save: SaveGame, now: number): GoalContext {
  return { save, baseline: {}, now, lookups: GOAL_LOOKUPS, palace: palaceBonusOf(save.palace.nodes) };
}

export interface DeedsState extends HallView {
  unlocked: boolean;
  unlockLevel: number;
}

/** Everything the Hall's screen, and the dot on its button, read. */
export function deedsState(save: SaveGame, now: number): DeedsState {
  return {
    ...hallView(HALL, save.deeds, deedsContext(save, now)),
    unlocked: isFeatureUnlocked(FEATURE, save.profile.level),
    unlockLevel: unlockLevel(FEATURE),
  };
}

/** What the Hall owes — tiers, challenges and ranks — for the dot; zero while it is shut. */
export function deedsClaimable(save: SaveGame, now: number): number {
  if (!isFeatureUnlocked(FEATURE, save.profile.level)) return 0;
  return hallView(HALL, save.deeds, deedsContext(save, now)).claimable;
}

/** One thing claimed, with everything it moved and everything it hung up. */
export interface DeedClaim {
  kind: 'achievement' | 'challenge' | 'rank';
  id: string;
  /** The achievement tier (1–5) or the rank (1–10) claimed; null for a challenge. */
  step: number | null;
  currencies: CurrencyAmount[];
  changes: CurrencyChange[];
  /** Renown claimed so far, this claim included. */
  renown: number;
  /** Frames and titles this claim earned — derived before and after, never stored. */
  frames: string[];
  titles: string[];
}

/** What a "Claim all" took, as one payout. */
export interface DeedClaimAll {
  claims: DeedClaim[];
  currencies: CurrencyAmount[];
  changes: CurrencyChange[];
  renown: number;
  frames: string[];
  titles: string[];
}

/** The frames and titles a chronicle wears the right to, for telling what a claim added. */
function rights(save: SaveGame): { frames: Set<string>; titles: Set<string> } {
  return {
    frames: new Set(earnedFrames(content.frames, save.deeds).map((frame) => frame.id)),
    titles: new Set(titlesOf(save)),
  };
}

/** Pays a claim and says what it added. */
function settle(
  save: SaveGame,
  claim: Pick<DeedClaim, 'kind' | 'id' | 'step'>,
  currencies: readonly CurrencyAmount[],
  before: { frames: Set<string>; titles: Set<string> },
  now: number,
): DeedClaim {
  const changes = payCurrencies(save, currencies, now);
  const after = rights(save);
  return {
    ...claim,
    currencies: [...currencies],
    changes,
    renown: renownOf(HALL, save.deeds),
    frames: [...after.frames].filter((id) => !before.frames.has(id)),
    titles: [...after.titles].filter((id) => !before.titles.has(id)),
  };
}

const shut = (): Result<never> => fail('locked', `The Hall of Deeds opens at level ${unlockLevel(FEATURE)}`);

/** Claims an achievement's next tier. */
export function applyAchievementClaim(save: SaveGame, achievementId: string, now: number): Result<DeedClaim> {
  if (!isFeatureUnlocked(FEATURE, save.profile.level)) return shut();
  const def = content.achievementById(achievementId);
  if (!def) return fail('invalid_argument', `No achievement ${achievementId}`);
  const tier = tierToClaim(def, save.deeds, deedsContext(save, now));
  if (!tier.ok) return tier;
  const before = rights(save);
  save.deeds.achievements[def.id] = tier.value.tier;
  return ok(
    settle(save, { kind: 'achievement', id: def.id, step: tier.value.tier }, tier.value.rewards, before, now),
  );
}

/** Claims a challenge, once. */
export function applyChallengeClaim(save: SaveGame, challengeId: string, now: number): Result<DeedClaim> {
  if (!isFeatureUnlocked(FEATURE, save.profile.level)) return shut();
  const def = content.challengeById(challengeId);
  if (!def) return fail('invalid_argument', `No challenge ${challengeId}`);
  const checked = challengeToClaim(def, save.deeds, deedsContext(save, now));
  if (!checked.ok) return checked;
  const before = rights(save);
  save.deeds.challenges.push(def.id);
  return ok(settle(save, { kind: 'challenge', id: def.id, step: null }, def.rewards, before, now));
}

/** Claims the next rank of the Hall, when the renown claimed so far reaches it. */
export function applyRankClaim(save: SaveGame, now: number): Result<DeedClaim> {
  if (!isFeatureUnlocked(FEATURE, save.profile.level)) return shut();
  const next = rankToClaim(HALL, save.deeds);
  if (!next.ok) return next;
  const before = rights(save);
  save.deeds.ranks = next.value.rank;
  return ok(
    settle(save, { kind: 'rank', id: next.value.id, step: next.value.rank }, next.value.rewards, before, now),
  );
}

/**
 * Claims everything the Hall owes, in the order the screen lists it: every achievement's waiting
 * tiers, then the challenges, then every rank the renown now reaches — a tier claimed first can
 * lift the renown over a rank that was out of reach when the press was made.
 */
export function applyClaimAllDeeds(save: SaveGame, now: number): Result<DeedClaimAll> {
  if (!isFeatureUnlocked(FEATURE, save.profile.level)) return shut();
  const claims: DeedClaim[] = [];
  for (const def of HALL.achievements)
    for (let claimed = applyAchievementClaim(save, def.id, now); claimed.ok;) {
      claims.push(claimed.value);
      claimed = applyAchievementClaim(save, def.id, now);
    }
  for (const def of HALL.challenges) {
    const claimed = applyChallengeClaim(save, def.id, now);
    if (claimed.ok) claims.push(claimed.value);
  }
  for (let claimed = applyRankClaim(save, now); claimed.ok; claimed = applyRankClaim(save, now))
    claims.push(claimed.value);
  if (claims.length === 0) return fail('invalid_argument', 'Nothing in the Hall is waiting to be claimed');

  const currencies = mergeAmounts(claims.flatMap((claim) => claim.currencies));
  // The changes: one per currency, carrying the batch's whole delta and the wallet's final total.
  const totals = new Map<string, CurrencyChange>();
  for (const change of claims.flatMap((claim) => claim.changes)) {
    const seen = totals.get(change.currency);
    totals.set(change.currency, seen ? { ...change, delta: seen.delta + change.delta } : { ...change });
  }
  return ok({
    claims,
    currencies,
    changes: [...totals.values()],
    renown: renownOf(HALL, save.deeds),
    frames: claims.flatMap((claim) => claim.frames),
    titles: claims.flatMap((claim) => claim.titles),
  });
}

/** Wears an earned frame, or `null` for the chronicle's own gold. */
export function applyWearFrame(save: SaveGame, frameId: string | null): Result<string | null> {
  if (frameId === null) {
    save.deeds.frame = null;
    return ok(null);
  }
  const frame = content.frameById(frameId);
  if (!frame) return fail('invalid_argument', `No frame ${frameId}`);
  if (!isFrameEarned(frame, save.deeds)) return fail('locked', `${frameId} is not earned yet`);
  save.deeds.frame = frame.id;
  return ok(frame.id);
}

/** The frame a chronicle wears, when it still has the right to it; null for its own gold. */
export function wornFrame(save: Pick<SaveGame, 'deeds'>): string | null {
  const id = save.deeds.frame;
  const frame = id ? content.frameById(id) : undefined;
  return frame && isFrameEarned(frame, save.deeds) ? frame.id : null;
}

/**
 * Bumps a counter for each feat a finished battle showed (ACHIEVEMENTS.md §7). Written whether or
 * not the Hall is open yet: the Hall reads the whole chronicle, feats included, the day it opens.
 */
export function recordFeats(save: SaveGame, outcome: BattleOutcome, encounterId: string): FeatKey[] {
  const stage = parseStageEncounterId(encounterId);
  const where = stage ? parseStageId(stage.stageId) : null;
  const feats = featsOf({
    outcome,
    stand: stage && where ? { difficulty: stage.difficulty, boss: where.stage === BOSS_STAGE_NUMBER } : null,
    champion: (defId) => content.championById(defId as ChampionId),
  });
  for (const feat of feats) bumpCounter(save, feat);
  return feats;
}
