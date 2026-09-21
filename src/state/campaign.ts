import { BOSS_STAGE_NUMBER } from '@content/balance/campaign';
import { grantSettlementPoint } from './palace';
/**
 * Campaign progress as it touches the save (docs/design/CAMPAIGN.md §2, §7).
 *
 * The rules live in `@engine/campaign`; this module is the bookkeeping: which draft fields a run
 * start and a run finish change, in what order. The store's actions are thin wrappers so the
 * logic stays testable without a store, and so the file that holds every action stays readable.
 */
import type { Difficulty } from '@content/balance/battle';
import type { CurrencyAmount } from '@content/currencies/types';
import { content } from '@content/registry';
import type { BattleOutcome } from '@engine/battle/types';
import { stageEncounterId } from '@engine/campaign/encounter';
import {
  nextStage,
  unlockedDifficulties,
  type CampaignProgress,
  type StagePointer,
} from '@engine/campaign/progress';
import { affordableRuns, beginRun, runCost, settleRun, type StageRef } from '@engine/campaign/run';
import type { RunRewards } from '@engine/campaign/rewards';
import { addChampionXp } from '@engine/champions/xp';
import { addEnergy } from '@engine/economy/energy';
import { grant, type CurrencyChange } from '@engine/economy/wallet';
import { fail, ok, type Result } from '@engine/errors';
import { bumpCounter, counter } from '@engine/progression/counters';
import { createRng } from '@engine/rng/rng';
import type { GearInstance } from '@engine/gear/instance';
import { applyGearDrop } from './gear';
import { NO_LEVEL_UP, applyPlayerXp, type LevelUpResult } from './progression';
import type { SaveGame } from '@engine/schema/save';

/** The progress the engine reads, straight out of the save. */
export function progressOf(save: SaveGame): CampaignProgress {
  return { stars: save.campaign.stars, bestTurns: save.campaign.bestTurns };
}

/** The settlement and stage a pointer names, or `null` when the pointer is out of range. */
export function stageRefOf(pointer: StagePointer): StageRef | null {
  const settlement = content.settlementByIndex(pointer.settlement);
  const stage = settlement?.stages[pointer.stage - 1];
  if (!settlement || !stage) return null;
  return { settlement, stage, difficulty: pointer.difficulty };
}

/** Where the player is pointed: their last selection while it is still open, else the next stage. */
export function currentPointer(save: SaveGame): StagePointer {
  const progress = progressOf(save);
  const selected = save.campaign.selected;
  if (selected && stageRefOf(selected)) return selected;
  return nextStage(progress);
}

export interface RunStarted {
  /** The derived encounter to fight (`@engine/campaign/encounter`). */
  encounterId: string;
  /** Energy this run cost — the amount `applyRunFinish` pays XP against. */
  cost: number;
  /** Which run of this stage this is; it seeds the drop rolls so repeats differ. */
  runIndex: number;
}

const RUN_COUNTER = 'campaign.runs' as const;

/**
 * Charges a run and points the save at it. Energy is spent *before* the battle, so a crash or a
 * reload mid-fight cannot yield a free run (ROADMAP Phase 3 acceptance).
 */
export function applyRunStart(save: SaveGame, pointer: StagePointer, now: number): Result<RunStarted> {
  const ref = stageRefOf(pointer);
  if (!ref) return fail('invalid_argument', `No stage ${pointer.settlement}.${pointer.stage}`);
  const begun = beginRun(ref, {
    progress: progressOf(save),
    energy: save.energy,
    playerLevel: save.profile.level,
    now,
  });
  if (!begun.ok) return begun;
  const runIndex = counter(save, RUN_COUNTER) + 1;
  save.energy = begun.value.energy;
  save.campaign.selected = pointer;
  save.stats[RUN_COUNTER] = runIndex;
  // What the run cost, for the daily quest that asks for energy spent (QUESTS_MISSIONS.md §2).
  bumpCounter(save, 'energy.spent', begun.value.cost);
  return ok({
    encounterId: stageEncounterId(ref.stage.id, pointer.difficulty),
    cost: begun.value.cost,
    runIndex,
  });
}

export interface RunFinishInput {
  pointer: StagePointer;
  /** What `applyRunStart` returned for this run. */
  cost: number;
  runIndex: number;
  outcome: BattleOutcome;
  /** Instance ids that fought, in slot order — they take the champion XP. */
  party: readonly string[];
  now: number;
}

export interface ChampionLevelUp {
  instanceId: string;
  level: number;
  levelsGained: number;
}

export interface RunSummary {
  stars: number;
  starsBefore: number;
  firstClear: boolean;
  /** The clear beat this stage's best ally turns. */
  newRecord: boolean;
  chestThresholds: number[];
  /** Null on a loss: a defeat, a timeout and a retreat all pay nothing. */
  rewards: RunRewards | null;
  /** Wallet deltas, for the reward toast and the result screen. */
  changes: CurrencyChange[];
  levelUps: ChampionLevelUp[];
  /** Gear the run minted, and whether the armoury was too full to hold any of it (GEAR.md §7). */
  gear: GearInstance[];
  gearLost: number;
  playerLevelsGained: number;
  /** What the chronicle levels this run bought paid, for the celebration (ECONOMY.md §4). */
  levelUp: LevelUpResult;
  completedDifficulty: boolean;
  /** Skill points the Glorious Palace paid for this clear (GLORIOUS_PALACE.md §3). */
  palacePoints: number;
}

/** Records a finished run and pays what it owes. */
export function applyRunFinish(save: SaveGame, input: RunFinishInput): Result<RunSummary> {
  const ref = stageRefOf(input.pointer);
  if (!ref) return fail('invalid_argument', `No stage ${input.pointer.settlement}.${input.pointer.stage}`);
  const rng = createRng(
    `campaign:${save.seedRoot}:${ref.stage.id}:${input.pointer.difficulty}:${input.runIndex}`,
  );
  const settled = settleRun(ref, { progress: progressOf(save), energySpent: input.cost }, input.outcome, rng);
  save.campaign.stars = settled.record.progress.stars;
  save.campaign.bestTurns = settled.record.progress.bestTurns;

  const summary: RunSummary = {
    stars: settled.stars,
    starsBefore: settled.record.starsBefore,
    firstClear: settled.record.firstClear,
    newRecord: settled.record.newRecord,
    chestThresholds: settled.record.chestThresholds,
    rewards: settled.rewards,
    changes: [],
    levelUps: [],
    gear: [],
    gearLost: 0,
    playerLevelsGained: 0,
    levelUp: NO_LEVEL_UP,
    completedDifficulty: settled.record.completedDifficulty,
    palacePoints: 0,
  };
  /*
   * The Glorious Palace's one-time backbone: a settlement's boss stand falling pays a skill point,
   * once per difficulty (GLORIOUS_PALACE.md §3). Before the `rewards` early return, because a
   * stand that pays no spoils the second time round still has a point owed the first.
   */
  if (input.pointer.stage === BOSS_STAGE_NUMBER && settled.stars > 0)
    summary.palacePoints = grantSettlementPoint(save, input.pointer.difficulty, input.pointer.settlement);

  const rewards = settled.rewards;
  if (!rewards) return ok(summary);

  const amounts: CurrencyAmount[] = [...rewards.currencies];
  if (rewards.gems > 0) amounts.push({ currency: 'gems', amount: rewards.gems });
  const granted = grant(save.wallet, amounts);
  save.wallet = granted.wallet;
  summary.changes = granted.changes;
  if (rewards.energy > 0) {
    save.energy = addEnergy(save.energy, rewards.energy, save.profile.level, input.now);
    summary.changes.push({ currency: 'energy', delta: rewards.energy, total: save.energy.value });
  }

  // A dropped piece is rolled now, from the same seed the rest of the run used.
  for (const drop of rewards.gear) {
    const piece = applyGearDrop(save, {
      settlementIndex: input.pointer.settlement,
      difficulty: input.pointer.difficulty,
      fromSetPool: drop.fromSetPool,
      source: 'campaign_drop',
      now: input.now,
      rng,
    });
    if (piece) summary.gear.push(piece);
    else summary.gearLost += 1;
  }

  for (const instanceId of input.party) {
    const champion = save.roster[instanceId];
    if (!champion) continue;
    const gain = addChampionXp(champion, rewards.championXp);
    champion.level = gain.level;
    champion.xp = gain.xp;
    if (gain.levelsGained > 0)
      summary.levelUps.push({ instanceId, level: gain.level, levelsGained: gain.levelsGained });
  }

  // Chronicle XP is the last thing a run pays, so a level-up's refill lands on the new cap.
  const levelUp = applyPlayerXp(save, rewards.playerXp, input.now);
  summary.playerLevelsGained = levelUp.levels.length;
  summary.levelUp = levelUp;
  summary.changes.push(...levelUp.changes);

  // Lifetime counters the profile and the quest tracker read (`@engine/progression/counters`).
  bumpCounter(save, 'campaign.cleared');
  bumpCounter(save, 'campaign.stars', settled.record.starsAfter - settled.record.starsBefore);
  bumpCounter(save, 'campaign.gearDrops', rewards.gear.length);
  return ok(summary);
}

/** How many runs of the pointed stage the wallet can pay for right now (CAMPAIGN.md §9). */
export function runsAffordable(save: SaveGame, pointer: StagePointer, requested: number): number {
  const ref = stageRefOf(pointer);
  if (!ref) return 0;
  return affordableRuns(ref, save.energy.value, requested);
}

/** Energy one run of the pointed stage costs, for the battle-setup button. */
export function pointerCost(pointer: StagePointer): number {
  const ref = stageRefOf(pointer);
  return ref ? runCost(ref) : 0;
}

/** The difficulties a save may choose between (Intro always, the rest earned). */
export function availableDifficulties(save: SaveGame): Difficulty[] {
  return unlockedDifficulties(progressOf(save));
}
