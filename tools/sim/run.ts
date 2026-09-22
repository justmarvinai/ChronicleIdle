/**
 * Headless campaign simulation. One battle is `createBattle` + `runAuto`, so the sim measures the
 * same code the game plays — no separate model to drift out of sync.
 */
import { STAR3_TURN_LIMIT, STAR3_TURN_LIMIT_BOSS } from '@content/balance/campaign';
import type { Difficulty } from '@content/balance/battle';
import type { Element } from '@content/champions/types';
import { content } from '@content/registry';
import type { EncounterDef } from '@content/encounters/types';
import { createBattle } from '@engine/battle/create';
import { runAuto } from '@engine/battle/step';
import type { EnemyDef } from '@content/enemies/types';
import type { DungeonDifficulty } from '@content/balance/dungeon';
import { buildParty, type SimTeam } from './teams';

/**
 * A "what if" on the enemy side, for a tuning pass only: the multipliers a candidate set of
 * archetype bases would apply. The game path never passes one, so the report always measures the
 * numbers actually shipped unless a tuning flag asks otherwise.
 */
export interface EnemyTuning {
  hp: number;
  atk: number;
  def: number;
}

const tuned = (def: EnemyDef, t: EnemyTuning): EnemyDef => ({
  ...def,
  stats: {
    ...def.stats,
    hp: Math.round(def.stats.hp * t.hp),
    atk: Math.round(def.stats.atk * t.atk),
    def: Math.round(def.stats.def * t.def),
  },
});

export interface StageResult {
  stageId: string;
  difficulty: Difficulty;
  team: string;
  runs: number;
  wins: number;
  /** Wins / runs. */
  rate: number;
  /** Runs that would earn all three stars (no death, inside the star limit). */
  threeStars: number;
  /** Mean ally turns of the won runs, and mean waves cleared over all runs. */
  avgTurns: number;
  avgWaves: number;
}

/** Runs one stage `runs` times on fixed seeds, so a report is reproducible. */
export function simulateStage(
  stageId: string,
  difficulty: Difficulty,
  team: SimTeam,
  runs: number,
  scale = 1,
  tuning?: EnemyTuning,
): StageResult {
  const base = content.stageEncounter(stageId, difficulty);
  if (!base) throw new Error(`unknown stage ${stageId}`);
  const encounter = scale === 1 ? base : scaled(base, scale);
  const boss = content.stageById(stageId)?.boss ?? false;
  const starLimit = boss ? STAR3_TURN_LIMIT_BOSS : STAR3_TURN_LIMIT;
  let wins = 0;
  let threeStars = 0;
  let turns = 0;
  let waves = 0;
  for (let i = 0; i < runs; i += 1) {
    const state = createBattle(
      {
        encounter,
        party: buildParty(team),
        enemyById: (id) => {
          const def = content.enemyById(id);
          return def && tuning ? tuned(def, tuning) : def;
        },
        control: 'auto',
        // No Palace on purpose: the sim measures the campaign's curve against reference teams, and
        // a skill tree the player may or may not have bought would measure the chronicle instead.
      },
      `sim:${team.id}:${stageId}:${difficulty}:${i}`,
    );
    const { outcome } = runAuto(state);
    waves += outcome.wavesCleared;
    if (outcome.kind !== 'victory') continue;
    wins += 1;
    turns += outcome.allyTurns;
    const flawless = outcome.units.every((u) => u.side !== 'ally' || u.alive);
    if (flawless && outcome.allyTurns <= starLimit) threeStars += 1;
  }
  return {
    stageId,
    difficulty,
    team: team.id,
    runs,
    wins,
    rate: wins / runs,
    threeStars,
    avgTurns: wins ? turns / wins : 0,
    avgWaves: waves / runs,
  };
}

/** The same encounter with every enemy's stats multiplied — the tuning knob, not a game path. */
function scaled(encounter: EncounterDef, scale: number): EncounterDef {
  return {
    ...encounter,
    waves: encounter.waves.map((wave) => ({
      enemies: wave.enemies.map((e) => ({ ...e, statMult: (e.statMult ?? 1) * scale })),
    })),
  };
}

/** Win rate over a whole settlement (its ten stages), the unit the bands are written in. */
export function simulateSettlement(
  settlementIndex: number,
  difficulty: Difficulty,
  team: SimTeam,
  runs: number,
  tuning?: EnemyTuning,
): { rate: number; threeStarRate: number; stages: StageResult[] } {
  const settlement = content.settlementByIndex(settlementIndex);
  if (!settlement) throw new Error(`unknown settlement ${settlementIndex}`);
  const stages = settlement.stages.map((stage) => simulateStage(stage.id, difficulty, team, runs, 1, tuning));
  const total = stages.reduce((sum, s) => sum + s.runs, 0);
  return {
    rate: stages.reduce((sum, s) => sum + s.wins, 0) / total,
    threeStarRate: stages.reduce((sum, s) => sum + s.threeStars, 0) / total,
    stages,
  };
}

/**
 * The enemy stat multiplier at which `team` wins `target` of its runs on `stageId` — the number a
 * balance pass fits `DIFFICULTY_MULT` and `stageScale` to. Binary search on a monotone-ish
 * quantity, so a handful of steps is enough.
 */
export function requiredScale(
  stageId: string,
  difficulty: Difficulty,
  team: SimTeam,
  target = 0.85,
  runs = 12,
  steps = 10,
): number {
  let low = 0.02;
  let high = 64;
  for (let i = 0; i < steps; i += 1) {
    const mid = Math.sqrt(low * high);
    if (simulateStage(stageId, difficulty, team, runs, mid).rate >= target) low = mid;
    else high = mid;
  }
  return low;
}

/** What a brewery stage costs a team, measured the same way a campaign stand is (BREWERY.md §7). */
export interface BreweryResult {
  element: Element;
  stage: number;
  team: string;
  runs: number;
  wins: number;
  rate: number;
  /** Mean ally turns of the won runs, and mean turns of the lost ones. */
  avgTurns: number;
  /** Mean share of enemy HP still standing when a run was lost — how far off the team was. */
  avgHpLeft: number;
}

/**
 * Runs one brewery stage `runs` times on fixed seeds. A hall's stages all share one ladder, so
 * Justice is measured and the other three follow — except where a band names a hall of its own.
 */
export function simulateBrewery(
  element: Element,
  stage: number,
  team: SimTeam,
  runs: number,
  scale = 1,
): BreweryResult {
  const base = content.breweryEncounter(element, stage);
  if (!base) throw new Error(`unknown brewery stage ${element}.${stage}`);
  const encounter = scale === 1 ? base : scaled(base, scale);
  let wins = 0;
  let turns = 0;
  let hpLeft = 0;
  let losses = 0;
  for (let i = 0; i < runs; i += 1) {
    const state = createBattle(
      {
        encounter,
        party: buildParty(team),
        enemyById: (id) => content.enemyById(id),
        control: 'auto',
        // No Palace, for the reason `simulateStage` gives: the bands measure the ladder, not a tree.
      },
      `sim:brewery:${team.id}:${element}:${stage}:${i}`,
    );
    const { outcome } = runAuto(state);
    if (outcome.kind === 'victory') {
      wins += 1;
      turns += outcome.allyTurns;
    } else {
      losses += 1;
      hpLeft += outcome.enemyHpLeft;
    }
  }
  return {
    element,
    stage,
    team: team.id,
    runs,
    wins,
    rate: wins / runs,
    avgTurns: wins ? turns / wins : 0,
    avgHpLeft: losses ? hpLeft / losses : 0,
  };
}

/**
 * How much harder a brewery stage could be and still be won `target` of the time — a factor
 * *relative to the shipped `BREWERY_STAGE_SCALE`*, so 1.0 means the stage sits exactly on that
 * win rate and 2.0 means it has twice the headroom. Same binary search as `requiredScale`.
 */
export function requiredBreweryScale(
  element: Element,
  stage: number,
  team: SimTeam,
  target = 0.85,
  runs = 12,
  steps = 10,
): number {
  let low = 0.02;
  let high = 64;
  for (let i = 0; i < steps; i += 1) {
    const mid = Math.sqrt(low * high);
    if (simulateBrewery(element, stage, team, runs, mid).rate >= target) low = mid;
    else high = mid;
  }
  return low;
}

/** What a dungeon stage costs a team, measured the way a brewery stage is (DUNGEONS.md §7). */
export interface DungeonResult {
  slug: string;
  difficulty: DungeonDifficulty;
  stage: number;
  team: string;
  runs: number;
  wins: number;
  rate: number;
  avgTurns: number;
  avgHpLeft: number;
}

/**
 * Runs one dungeon stage `runs` times on fixed seeds.
 *
 * The party is four where the roster has four (`SimTeam.fourth`) and three where it does not —
 * which is what a new chronicle really fields, and what the opening stage has to be beatable with.
 */
export function simulateDungeon(
  slug: string,
  difficulty: DungeonDifficulty,
  stage: number,
  team: SimTeam,
  runs: number,
  scale = 1,
): DungeonResult {
  const base = content.dungeonEncounter(slug, difficulty, stage);
  if (!base) throw new Error(`unknown dungeon stage ${slug}.${difficulty}.${stage}`);
  const encounter = scale === 1 ? base : scaled(base, scale);
  let wins = 0;
  let turns = 0;
  let hpLeft = 0;
  let losses = 0;
  for (let i = 0; i < runs; i += 1) {
    const state = createBattle(
      {
        encounter,
        party: buildParty(team, true),
        enemyById: (id) => content.enemyById(id),
        control: 'auto',
        // No Palace, for the reason `simulateStage` gives: the bands measure the ladder, not a tree.
      },
      `sim:dungeon:${team.id}:${slug}:${difficulty}:${stage}:${i}`,
    );
    const { outcome } = runAuto(state);
    if (outcome.kind === 'victory') {
      wins += 1;
      turns += outcome.allyTurns;
    } else {
      losses += 1;
      hpLeft += outcome.enemyHpLeft;
    }
  }
  return {
    slug,
    difficulty,
    stage,
    team: team.id,
    runs,
    wins,
    rate: wins / runs,
    avgTurns: wins ? turns / wins : 0,
    avgHpLeft: losses ? hpLeft / losses : 0,
  };
}

/** The factor on the shipped scale at which `team` still wins `target` of its runs. */
export function requiredDungeonScale(
  slug: string,
  difficulty: DungeonDifficulty,
  stage: number,
  team: SimTeam,
  runs: number,
  target = 0.85,
): number {
  let low = 0.05;
  let high = 12;
  for (let i = 0; i < 12; i += 1) {
    const mid = (low + high) / 2;
    if (simulateDungeon(slug, difficulty, stage, team, runs, mid).rate >= target) low = mid;
    else high = mid;
  }
  return low;
}
