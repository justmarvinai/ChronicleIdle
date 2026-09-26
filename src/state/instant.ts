/**
 * Instant clears as they touch the save (docs/design/CAMPAIGN.md §10).
 *
 * The rules are `@engine/campaign/instant`'s; this is the bookkeeping. A batch is charged, rolled
 * and paid one run at a time, in the order a batch of fought runs would have been — each run takes
 * the next run index, spends its energy, rolls on its own seed and pays its XP before the next one
 * begins — so a batch written down mints exactly what the same runs fought three-star would have.
 */
import type { CurrencyAmount, CurrencyId } from '@content/currencies/types';
import { beginInstantRun, instantBlock, rollInstantRun, type InstantBlock } from '@engine/campaign/instant';
import type { StagePointer } from '@engine/campaign/progress';
import { mergeRunRewards, type RunRewards } from '@engine/campaign/rewards';
import { affordableRuns, runCost } from '@engine/campaign/run';
import { sanitizeTeam } from '@engine/battle/teams';
import type { CurrencyChange } from '@engine/economy/wallet';
import { fail, ok, type Result } from '@engine/errors';
import type { GearInstance } from '@engine/gear/instance';
import { bumpCounter } from '@engine/progression/counters';
import type { SaveGame } from '@engine/schema/save';
import { boostedPlayerXp } from './boosts';
import {
  claimRunIndex,
  mintRunDrops,
  payChampionXp,
  progressOf,
  runRng,
  stageRefOf,
  type ChampionLevelUp,
} from './campaign';
import { inventoryRoom } from './gear';
import { payCurrencies } from './payout';
import { NO_LEVEL_UP, applyPlayerXp, mergeLevelUps, type LevelUpResult } from './progression';

/** The most champions a campaign stand fields, and so the most an instant run pays XP to. */
const PARTY_SIZE = 3;

/** What the battle setup and the settlement row need to offer an instant clear. */
export interface InstantView {
  /** The stand holds every star and the chronicle is old enough: the button is shown. */
  available: boolean;
  /** Why it cannot be pressed right now, or `null` when it can. */
  block: InstantBlock | null;
  /** Energy one run costs. */
  cost: number;
  /** Runs the energy pays for, capped at the count asked for. */
  affordable: number;
  /** Pieces the armoury still has room for — a batch that drops more loses the rest. */
  room: number;
}

/** Whether, and how far, this stand can be cleared instantly right now. */
export function instantView(save: SaveGame, pointer: StagePointer, requested: number): InstantView {
  const ref = stageRefOf(pointer);
  if (!ref) return { available: false, block: null, cost: 0, affordable: 0, room: 0 };
  const block = instantBlock(ref, {
    progress: progressOf(save),
    energy: save.energy.value,
    playerLevel: save.profile.level,
  });
  return {
    available: block === null || block.reason === 'energy',
    block,
    cost: runCost(ref),
    affordable: affordableRuns(ref, save.energy.value, requested),
    room: inventoryRoom(save),
  };
}

export interface InstantClearInput {
  pointer: StagePointer;
  /** Runs asked for; the batch clears as many of them as the energy pays for. */
  runs: number;
  /** The team that takes the champion XP, in slot order. */
  party: readonly string[];
  now: number;
}

export interface InstantClearSummary {
  pointer: StagePointer;
  /** Runs cleared — the count asked for, or fewer when the energy ran out first. */
  runs: number;
  /** Energy the batch spent. */
  energySpent: number;
  /** Everything the batch paid, merged (the gear as the drops that fell, minted below). */
  rewards: RunRewards;
  /** Wallet and energy deltas the rewards and any chronicle level made, one per currency. */
  changes: CurrencyChange[];
  /** The champion XP each member of the party took, after boosts, over the whole batch. */
  championXp: number;
  /** Champions who levelled: the level they reached and how many they climbed. */
  levelUps: ChampionLevelUp[];
  gear: GearInstance[];
  gearLost: number;
  /** The chronicle levels the batch paid for, merged in the order they were crossed. */
  levelUp: LevelUpResult;
}

/** One entry per currency: the deltas add up to what the batch paid, and the newest total wins. */
function mergeChanges(changes: readonly CurrencyChange[]): CurrencyChange[] {
  const merged = new Map<CurrencyId, CurrencyChange>();
  for (const change of changes) {
    const seen = merged.get(change.currency);
    merged.set(change.currency, seen ? { ...change, delta: seen.delta + change.delta } : { ...change });
  }
  return [...merged.values()];
}

/** Champion level-ups over a batch, one per champion: the level reached and every level climbed. */
function mergeChampionLevelUps(runs: readonly ChampionLevelUp[][]): ChampionLevelUp[] {
  const merged = new Map<string, ChampionLevelUp>();
  for (const levelUp of runs.flat()) {
    const seen = merged.get(levelUp.instanceId);
    merged.set(levelUp.instanceId, {
      instanceId: levelUp.instanceId,
      level: levelUp.level,
      levelsGained: (seen?.levelsGained ?? 0) + levelUp.levelsGained,
    });
  }
  return [...merged.values()];
}

/**
 * Clears a mastered stand `runs` times without a battle (CAMPAIGN.md §10). Refused whole — nothing
 * spent — when the feature is shut, the stand is not mastered, the party is empty or the energy
 * does not cover one run; otherwise it clears as many runs as the energy pays for.
 */
export function applyInstantClear(save: SaveGame, input: InstantClearInput): Result<InstantClearSummary> {
  const ref = stageRefOf(input.pointer);
  if (!ref) return fail('invalid_argument', `No stage ${input.pointer.settlement}.${input.pointer.stage}`);
  const party = sanitizeTeam(save.roster, input.party, PARTY_SIZE);
  if (!party.length) return fail('invalid_argument', 'An instant clear needs a team to take the XP');
  const block = instantBlock(ref, {
    progress: progressOf(save),
    energy: save.energy.value,
    playerLevel: save.profile.level,
  });
  if (block?.reason === 'energy')
    return fail('insufficient_energy', `An instant clear of ${ref.stage.id} costs ${block.cost} energy`);
  if (block) return fail('locked', `${ref.stage.id} cannot be cleared instantly (${block.reason})`);

  const planned = affordableRuns(ref, save.energy.value, Math.max(1, Math.round(input.runs)));
  const paid: RunRewards[] = [];
  const changes: CurrencyChange[] = [];
  const championLevels: ChampionLevelUp[][] = [];
  const gear: GearInstance[] = [];
  let gearLost = 0;
  let energySpent = 0;
  let championXp = 0;
  let levelUp: LevelUpResult = NO_LEVEL_UP;

  for (let run = 0; run < planned; run += 1) {
    const begun = beginInstantRun(ref, {
      progress: progressOf(save),
      energy: save.energy,
      playerLevel: save.profile.level,
      now: input.now,
    });
    if (!begun.ok) break;
    save.energy = begun.value.energy;
    energySpent += begun.value.cost;
    bumpCounter(save, 'energy.spent', begun.value.cost);
    const rng = runRng(save, ref, claimRunIndex(save));
    const rewards = rollInstantRun(ref, begun.value.cost, rng);
    paid.push(rewards);

    // A mastered repeat pays neither gems nor energy today; paying them through here keeps it
    // right if a repeat ever does.
    const amounts: CurrencyAmount[] = [...rewards.currencies];
    if (rewards.gems > 0) amounts.push({ currency: 'gems', amount: rewards.gems });
    if (rewards.energy > 0) amounts.push({ currency: 'energy', amount: rewards.energy });
    changes.push(...payCurrencies(save, amounts, input.now));

    const dropped = mintRunDrops(save, input.pointer, rewards, rng, input.now);
    gear.push(...dropped.gear);
    gearLost += dropped.lost;
    const trained = payChampionXp(save, party, rewards.championXp, input.now);
    championXp += trained.xp;
    championLevels.push(trained.levelUps);

    // Chronicle XP last, as a fought run pays it, so a level's refill lands on the new cap.
    const levels = applyPlayerXp(save, boostedPlayerXp(save, rewards.playerXp, input.now), input.now);
    changes.push(...levels.changes);
    levelUp = mergeLevelUps(levelUp, levels);

    bumpCounter(save, 'campaign.cleared');
    bumpCounter(save, 'campaign.instant');
    bumpCounter(save, 'campaign.gearDrops', rewards.gear.length);
  }
  if (!paid.length) return fail('insufficient_energy', `No energy for an instant clear of ${ref.stage.id}`);

  save.campaign.selected = input.pointer;
  const rewards = mergeRunRewards(paid);
  return ok({
    pointer: input.pointer,
    runs: paid.length,
    energySpent,
    rewards,
    changes: mergeChanges(changes),
    championXp,
    levelUps: mergeChampionLevelUps(championLevels),
    gear,
    gearLost,
    levelUp,
  });
}
