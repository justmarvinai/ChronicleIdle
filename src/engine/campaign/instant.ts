/**
 * Instant clears (docs/design/CAMPAIGN.md §10).
 *
 * A stand a chronicle has mastered — every star it can hold on that difficulty — can be written
 * down instead of fought. An instant run costs the energy a fought run costs and pays what a
 * mastered stand's repeat pays: the same gold, the same XP, the same rolls on the same seed a
 * fought run of that index would use. What it cannot pay is anything a stand pays *once* — the
 * first clear, a star chest, the difficulty's milestone — because a mastered stand has paid all
 * three already. It records no stars and no best turns: nothing was fought.
 */
import { STAGE_MAX_STARS, globalStageIndex } from '@content/balance/campaign';
import { spendEnergy, type EnergyState } from '@engine/economy/energy';
import { fail, ok, type Result } from '@engine/errors';
import { isFeatureUnlocked, unlockLevel } from '@engine/progression/unlocks';
import type { Rng } from '@engine/rng/rng';
import { starsOf, type CampaignProgress } from './progress';
import { rollRunRewards, type RunRewards } from './rewards';
import { runCost, type StageRef } from './run';

/** What stands between a stand and an instant clear, in the order a player can put it right. */
export type InstantBlock =
  /** The chronicle is too young for instant clears. */
  | { reason: 'level'; opensAt: number }
  /** The stand holds fewer than every star on this difficulty. */
  | { reason: 'stars'; stars: number }
  /** The energy does not cover a single run. */
  | { reason: 'energy'; cost: number };

/** A stand holding every star it can on its difficulty (CAMPAIGN.md §3). */
export function isStandMastered(progress: CampaignProgress, ref: StageRef): boolean {
  return starsOf(progress, ref.stage.id, ref.difficulty) >= STAGE_MAX_STARS;
}

/**
 * Why this stand cannot be cleared instantly right now, or `null` when it can: the chronicle's
 * level first (nothing else matters until the feature is open), then the stars, then the energy.
 */
export function instantBlock(
  ref: StageRef,
  state: { progress: CampaignProgress; energy: number; playerLevel: number },
): InstantBlock | null {
  if (!isFeatureUnlocked('instant_clear', state.playerLevel))
    return { reason: 'level', opensAt: unlockLevel('instant_clear') };
  const stars = starsOf(state.progress, ref.stage.id, ref.difficulty);
  if (stars < STAGE_MAX_STARS) return { reason: 'stars', stars };
  const cost = runCost(ref);
  if (state.energy < cost) return { reason: 'energy', cost };
  return null;
}

/**
 * Charges one instant run. Refused — as a `Result`, because refusing is the normal way a press
 * goes wrong — while the feature is shut, the stand is short of its stars, or the energy is short.
 */
export function beginInstantRun(
  ref: StageRef,
  state: { progress: CampaignProgress; energy: EnergyState; playerLevel: number; now: number },
): Result<{ energy: EnergyState; cost: number }> {
  if (!isFeatureUnlocked('instant_clear', state.playerLevel))
    return fail('locked', `Instant clears open at level ${unlockLevel('instant_clear')}`);
  if (!isStandMastered(state.progress, ref))
    return fail('locked', `${ref.stage.id} is not mastered on ${ref.difficulty}`, {
      stageId: ref.stage.id,
      difficulty: ref.difficulty,
    });
  const cost = runCost(ref);
  const spent = spendEnergy(state.energy, cost, state.playerLevel, state.now);
  if (!spent.ok) return spent;
  return ok({ energy: spent.value, cost });
}

/**
 * What one instant run pays: a mastered stand's repeat, rolled through `rollRunRewards` so the
 * two can never drift apart — with no first clear, no star chest and no milestone in it.
 */
export function rollInstantRun(ref: StageRef, energySpent: number, rng: Rng): RunRewards {
  return rollRunRewards(
    {
      settlementIndex: ref.settlement.index,
      stageNumber: ref.stage.number,
      globalIndex: globalStageIndex(ref.settlement.index, ref.stage.number),
      difficulty: ref.difficulty,
      boss: ref.stage.boss,
      element: ref.settlement.element,
      energySpent,
      firstClear: false,
      chestThresholds: [],
      mastered: false,
    },
    rng,
  );
}
