/**
 * One campaign run, start to finish (docs/design/CAMPAIGN.md §2, §3, §7).
 *
 * The engine owns the rules — is the stage open, what does it cost, how many stars did that
 * outcome earn, what does it pay — and hands back plain values. The state layer decides when to
 * write them to the save, which is what keeps "a reload does not double-spend" a question of one
 * ordered write rather than of engine bookkeeping.
 */
import type { Difficulty } from '@content/balance/battle';
import { AUTO_REPEAT_TIERS, globalStageIndex } from '@content/balance/campaign';
import type { FeatureId } from '@content/balance/unlocks';
import type { SettlementDef, StageDef } from '@content/stages/types';
import type { BattleOutcome } from '@engine/battle/types';
import { spendEnergy, type EnergyState } from '@engine/economy/energy';
import { fail, ok, type Result } from '@engine/errors';
import { isFeatureUnlocked } from '@engine/progression/unlocks';
import type { Rng } from '@engine/rng/rng';
import { stageEnergyCost } from './encounter';
import { evaluateStars, isStageUnlocked, recordRun, type CampaignProgress, type RunRecord } from './progress';
import { rollRunRewards, type RunRewards } from './rewards';

export interface StageRef {
  settlement: SettlementDef;
  stage: StageDef;
  difficulty: Difficulty;
}

/** Energy one run of this stage costs (CAMPAIGN.md §2). */
export function runCost(ref: StageRef): number {
  return stageEnergyCost(ref.settlement.index, ref.stage.boss, ref.difficulty);
}

/**
 * Spends the energy for a run. Failing here is the normal way a run is refused — the stage is
 * locked, or the wallet is short — so it returns a `Result` rather than throwing.
 */
export function beginRun(
  ref: StageRef,
  state: { progress: CampaignProgress; energy: EnergyState; playerLevel: number; now: number },
): Result<{ energy: EnergyState; cost: number }> {
  if (!isStageUnlocked(state.progress, ref.settlement.index, ref.stage.number, ref.difficulty))
    return fail('locked', `${ref.stage.id} is not unlocked on ${ref.difficulty}`, {
      stageId: ref.stage.id,
      difficulty: ref.difficulty,
    });
  const cost = runCost(ref);
  const spent = spendEnergy(state.energy, cost, state.playerLevel, state.now);
  if (!spent.ok) return spent;
  return ok({ energy: spent.value, cost });
}

export interface SettledRun {
  stars: number;
  record: RunRecord;
  rewards: RunRewards | null;
}

/**
 * Settles a finished battle: stars from the outcome, progress from the stars, rewards from the
 * progress. A defeat, a timeout or a retreat earns nothing — the energy is already spent, which is
 * what makes a loss cost something (CAMPAIGN.md §3).
 */
export function settleRun(
  ref: StageRef,
  state: { progress: CampaignProgress; energySpent: number },
  outcome: BattleOutcome,
  rng: Rng,
): SettledRun {
  const stars = evaluateStars(outcome, ref.stage.turnLimit3Star);
  const record = recordRun(state.progress, {
    settlement: ref.settlement.index,
    stage: ref.stage.number,
    difficulty: ref.difficulty,
    stars,
    allyTurns: outcome.allyTurns,
  });
  if (stars === 0) return { stars, record, rewards: null };
  const rewards = rollRunRewards(
    {
      settlementIndex: ref.settlement.index,
      stageNumber: ref.stage.number,
      globalIndex: globalStageIndex(ref.settlement.index, ref.stage.number),
      difficulty: ref.difficulty,
      boss: ref.stage.boss,
      element: ref.settlement.element,
      energySpent: state.energySpent,
      firstClear: record.firstClear,
      chestThresholds: record.chestThresholds,
    },
    rng,
  );
  return { stars, record, rewards };
}

/** Run counts the auto-repeat selector offers at this player level (CAMPAIGN.md §9). */
export function autoRepeatTiers(playerLevel: number): number[] {
  return [
    1,
    ...AUTO_REPEAT_TIERS.filter((tier) => isFeatureUnlocked(tier.feature as FeatureId, playerLevel)).map(
      (tier) => tier.runs,
    ),
  ];
}

/** How many runs of a stage the current energy pays for, capped by the chosen count. */
export function affordableRuns(ref: StageRef, energy: number, requested: number): number {
  const cost = runCost(ref);
  if (cost <= 0) return requested;
  return Math.max(0, Math.min(requested, Math.floor(energy / cost)));
}
