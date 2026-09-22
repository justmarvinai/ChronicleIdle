/**
 * The Dungeons through the store (docs/design/DUNGEONS.md).
 *
 * The engine owns the rules — which stage is open, what a band drops, what a run pays — and this
 * spends the energy, hands the battle its encounter and files the gear. Energy goes *before* the
 * fight, like the campaign's, so a reload mid-battle cannot buy a free attempt and a defeat costs
 * what it cost.
 */
import {
  DUNGEON_STAGES,
  dungeonBand,
  dungeonStarEntries,
  type DungeonBand,
  type DungeonDifficulty,
} from '@content/balance/dungeon';
import type { DungeonDef } from '@content/dungeons/types';
import type { CurrencyAmount } from '@content/currencies/types';
import { content } from '@content/registry';
import type { BattleOutcome } from '@engine/battle/types';
import { spendEnergy } from '@engine/economy/energy';
import type { CurrencyChange } from '@engine/economy/wallet';
import { fail, ok, type Result } from '@engine/errors';
import {
  dungeonEncounterId,
  dungeonEnemyLevel,
  deepestLabel,
  highestOpenStage,
  isHardOpen,
  isStageOpen,
  nextStage,
  progressOf,
  recordClear,
  rollDungeonRewards,
  type DungeonProgress,
} from '@engine/dungeon/index';
import type { GearInstance } from '@engine/gear/instance';
import { addChampionXp } from '@engine/champions/xp';
import { bumpCounter, bumpCounterId } from '@engine/progression/counters';
import { createRng } from '@engine/rng/rng';
import type { SaveGame } from '@engine/schema/save';
import { mintGearPiece } from './gear';
import { payCurrencies } from './payout';
import { applyPlayerXp, NO_LEVEL_UP, type LevelUpResult } from './progression';

/**
 * Every keep is open from the first hour (the owner's brief) — what stops a new chronicle is the
 * ladder, not a gate. The Gilded Veil is the exception, and it is shut by its own content rather
 * than by a level.
 */
export function isDungeonOpen(def: DungeonDef): boolean {
  return def.lock === undefined;
}

export interface DungeonStageView {
  stage: number;
  band: DungeonBand;
  open: boolean;
  cleared: boolean;
  /** The deepest stage that may be entered — where the screen opens. */
  next: boolean;
  enemyLevel: number;
  stars: readonly number[];
}

export interface DungeonView {
  def: DungeonDef;
  progress: DungeonProgress;
  hardOpen: boolean;
  /** Null when the keep has never been taken. */
  deepest: { difficulty: DungeonDifficulty; stage: number } | null;
  stages: Readonly<Record<DungeonDifficulty, readonly DungeonStageView[]>>;
}

function stagesFor(progress: DungeonProgress, difficulty: DungeonDifficulty): readonly DungeonStageView[] {
  const open = highestOpenStage(progress, difficulty);
  const cleared = difficulty === 'hard' ? progress.hard : progress.normal;
  return Array.from({ length: DUNGEON_STAGES }, (_unused, index) => {
    const stage = index + 1;
    const band = dungeonBand(stage, difficulty);
    return {
      stage,
      band,
      open: isStageOpen(progress, difficulty, stage),
      cleared: stage <= cleared,
      next: stage === open,
      enemyLevel: dungeonEnemyLevel(stage, difficulty),
      stars: dungeonStarEntries(band).map((entry) => entry.item),
    };
  });
}

/** One keep as it stands. Pure: nothing is written. */
export function dungeonView(save: SaveGame, def: DungeonDef): DungeonView {
  const progress = progressOf(save.dungeons.cleared, def.slug);
  return {
    def,
    progress,
    hardOpen: isHardOpen(progress),
    deepest: deepestLabel(progress),
    stages: {
      normal: stagesFor(progress, 'normal'),
      hard: stagesFor(progress, 'hard'),
    },
  };
}

/** Every keep, in reading order — what the overview draws. */
export function dungeonsView(save: SaveGame): readonly DungeonView[] {
  return [...content.dungeons].sort((a, b) => a.order - b.order).map((def) => dungeonView(save, def));
}

export interface DungeonRunStarted {
  slug: string;
  difficulty: DungeonDifficulty;
  stage: number;
  encounterId: string;
  /** What the run cost, which the reward roll pays XP against. */
  energySpent: number;
  /** A run index, so a repeat batch seeds each run differently. */
  runIndex: number;
}

/**
 * Charges a run's energy and points the save at the stage it bought. A sealed keep, a stage that
 * is not open yet and an empty energy bar all refuse here rather than at the battle.
 */
export function applyDungeonRunStart(
  save: SaveGame,
  input: { slug: string; difficulty: DungeonDifficulty; stage: number; now: number },
): Result<DungeonRunStarted> {
  const def = content.dungeonBySlug(input.slug);
  if (!def) return fail('invalid_argument', `No dungeon ${input.slug}`);
  if (!isDungeonOpen(def)) return fail('locked', `${def.id} is sealed`);
  if (input.stage < 1 || input.stage > DUNGEON_STAGES)
    return fail('invalid_argument', `No stage ${input.stage} in ${def.id}`);
  const progress = progressOf(save.dungeons.cleared, def.slug);
  if (!isStageOpen(progress, input.difficulty, input.stage))
    return fail('locked', `${def.id} ${input.difficulty} ${input.stage} is not open yet`);

  const band = dungeonBand(input.stage, input.difficulty);
  const spent = spendEnergy(save.energy, band.energy, save.profile.level, input.now);
  if (!spent.ok) return spent;
  save.energy = spent.value;
  const runIndex = (save.stats['dungeon.runs'] ?? 0) + 1;
  return ok({
    slug: def.slug,
    difficulty: input.difficulty,
    stage: input.stage,
    encounterId: dungeonEncounterId(def.slug, input.difficulty, input.stage),
    energySpent: band.energy,
    runIndex,
  });
}

export interface DungeonRunSummary {
  slug: string;
  difficulty: DungeonDifficulty;
  stage: number;
  cleared: boolean;
  /** This clear took the keep deeper than it had ever been. */
  firstClear: boolean;
  /** This clear was Normal's twentieth. */
  openedHard: boolean;
  /** The pieces that made it onto the racks. */
  gear: GearInstance[];
  /** Pieces the full armoury turned away (`GEAR.md` §7). */
  gearLost: number;
  currencies: CurrencyAmount[];
  changes: CurrencyChange[];
  championXp: number;
  playerXp: number;
  /** Champions whose bar filled on this run. */
  levelUps: string[];
  /** The chronicle's own level-up, if the run crossed one — the shared celebration reads it. */
  levelUp: LevelUpResult;
}

/**
 * Banks a finished run. A defeat pays nothing — the energy is already gone — and a stage already
 * cleared pays in full every time, because that is what a dungeon is for.
 */
export function applyDungeonRunFinish(
  save: SaveGame,
  input: {
    slug: string;
    difficulty: DungeonDifficulty;
    stage: number;
    energySpent: number;
    runIndex: number;
    outcome: BattleOutcome;
    party: readonly string[];
    now: number;
  },
): Result<DungeonRunSummary> {
  const def = content.dungeonBySlug(input.slug);
  if (!def) return fail('invalid_argument', `No dungeon ${input.slug}`);
  const cleared = input.outcome.kind === 'victory';

  bumpCounter(save, 'dungeon.runs');
  bumpCounterId(save, 'dungeon.runs.', def.id);
  const summary: DungeonRunSummary = {
    slug: def.slug,
    difficulty: input.difficulty,
    stage: input.stage,
    cleared,
    firstClear: false,
    openedHard: false,
    gear: [],
    gearLost: 0,
    currencies: [],
    changes: [],
    championXp: 0,
    playerXp: 0,
    levelUps: [],
    levelUp: NO_LEVEL_UP,
  };
  if (!cleared) return ok(summary);

  const progress = progressOf(save.dungeons.cleared, def.slug);
  const clear = recordClear(progress, input.difficulty, input.stage);
  save.dungeons = {
    cleared: { ...save.dungeons.cleared, [def.slug]: clear.progress },
  };
  summary.firstClear = clear.first;
  summary.openedHard = clear.openedHard;
  if (clear.first) bumpCounter(save, 'dungeon.cleared');

  // One stream per run, seeded from the save's own root and the run's index, so a haul replays.
  const rng = createRng(`${save.seedRoot}:dungeon:${def.slug}:${input.difficulty}:${input.runIndex}`);
  const haul = rollDungeonRewards(
    {
      sets: def.sets,
      stage: input.stage,
      difficulty: input.difficulty,
      energySpent: input.energySpent,
    },
    rng,
  );

  for (const drop of haul.gear) {
    const piece = mintGearPiece(save, {
      setId: drop.setId,
      stars: drop.stars,
      rarity: drop.rarity,
      source: 'dungeon',
      now: input.now,
      rng,
    });
    if (piece) summary.gear.push(piece);
    else summary.gearLost += 1;
  }
  bumpCounter(save, 'dungeon.gear', summary.gear.length);

  summary.currencies = haul.currencies;
  summary.changes = payCurrencies(save, haul.currencies, input.now);
  summary.championXp = haul.championXp;
  summary.playerXp = haul.playerXp;
  for (const instanceId of input.party) {
    const champion = save.roster[instanceId];
    if (!champion) continue;
    const gain = addChampionXp(champion, haul.championXp);
    champion.level = gain.level;
    champion.xp = gain.xp;
    if (gain.levelsGained > 0) summary.levelUps.push(instanceId);
  }
  summary.levelUp = applyPlayerXp(save, haul.playerXp, input.now);
  summary.changes.push(...summary.levelUp.changes);
  return ok(summary);
}

/** Runs a repeat batch can still afford, capped by the requested count. */
export function affordableRuns(
  save: SaveGame,
  difficulty: DungeonDifficulty,
  stage: number,
  wanted: number,
): number {
  const band = dungeonBand(stage, difficulty);
  if (band.energy <= 0) return wanted;
  return Math.max(0, Math.min(wanted, Math.floor(save.energy.value / band.energy)));
}

export { nextStage };
