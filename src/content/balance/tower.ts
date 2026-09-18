/**
 * The Eternal Tower (docs/design/ETERNAL_TOWER.md).
 *
 * One hundred floors climbed in order, one key per attempt, every tenth floor a boss. A floor is
 * authored nowhere: everything it fields, costs, grants and demands is derived from its number and
 * the numbers here, so adding floors 101–200 later is a change to `TOWER_FLOORS` and nothing else.
 *
 * The tower is the first mode that outlasts the campaign. It opens when the whole Intro campaign
 * is behind the player and its first floor is pitched just past Intro's last stand; its hundredth
 * is roughly four times the campaign's hardest, which no roster clears in one season.
 */
import type { CurrencyId } from '@content/currencies/types';
import { SETTLEMENT_COUNT } from './campaign';

/** Floors in the tower today. The curve is defined per floor, so this may grow without retuning. */
export const TOWER_FLOORS = 100;
/** Every tenth floor is a boss floor — the only ones that may be fought again. */
export const TOWER_BOSS_EVERY = 10;
/** All turns before the floor is lost; a tower floor is a fight, not a damage race. */
export const TOWER_TURN_LIMIT = 40;
export const TOWER_TURN_LIMIT_BOSS = 50;

// ---------------------------------------------------------------------------------------------
// The climb
// ---------------------------------------------------------------------------------------------

/**
 * Enemy scaling. A floor's enemies are `archetypeBase × towerScale(floor)`: the encounter itself
 * is pitched at Intro's flat multiplier and stage index 0, so this is the *only* curve acting on a
 * tower enemy and one number decides how hard a floor is (`BATTLE.md` §4.5 does the rest).
 *
 * Floor 1 sits just past the campaign's Intro ceiling (`DIFFICULTY_MULT.intro × stageScale(119)`
 * = 4.8). Compounding per floor reaches 24.1 by floor 50 and 119.7 by floor 100 — about four times
 * the campaign's last stand on Hard (6.0 × 4.8 = 28.8) — and simply carries on for floors added
 * later.
 */
export const TOWER_SCALE_BASE = 5;
export const TOWER_SCALE_GROWTH = 1.0326;

export function towerScale(floor: number): number {
  return TOWER_SCALE_BASE * TOWER_SCALE_GROWTH ** (Math.max(1, floor) - 1);
}

/** Plate level: display only, like the campaign's (owner's answer Q29). */
export const TOWER_ENEMY_LEVEL_BASE = 45;
export const TOWER_ENEMY_LEVEL_PER_FLOOR = 0.55;

export function towerEnemyLevel(floor: number): number {
  return Math.round(TOWER_ENEMY_LEVEL_BASE + TOWER_ENEMY_LEVEL_PER_FLOOR * (floor - 1));
}

/** Enemies on an ordinary floor, and on a boss floor beside its boss. */
export const TOWER_WAVE_SIZE = 4;
export const TOWER_BOSS_ESCORT = 2;

/**
 * Which faction holds a floor. The twelve campaign factions cycle as the tower climbs, so a floor
 * looks like somewhere the player has been and the tower needs no art of its own (`ASSETS.md`).
 */
export function towerFaction(floor: number): number {
  return ((floor - 1) % SETTLEMENT_COUNT) + 1;
}

// ---------------------------------------------------------------------------------------------
// The key (ECONOMY.md §5.2)
// ---------------------------------------------------------------------------------------------

/** One attempt, won or lost — charged before the fight, as energy and boss keys are. */
export const TOWER_KEY_COST = 1;
/** Regeneration fills to here and stops; a *grant* may carry a chronicle above it (16/10). */
export const TOWER_KEY_CAP = 10;
/** One key every fifteen minutes: ten floors in a sitting, four more an hour after that. */
export const TOWER_KEY_REGEN_SECONDS = 15 * 60;
/** Gem price of a key and how many it buys, mirroring the energy refill. */
export const TOWER_KEY_REFILL_GEMS = 40;
export const TOWER_KEY_REFILL_AMOUNT = 5;

// ---------------------------------------------------------------------------------------------
// The season
// ---------------------------------------------------------------------------------------------

/**
 * The tower resets every thirty days and is climbed again. The season is anchored to the first
 * floor the chronicle ever attempts rather than to a calendar epoch: a global one would reset a
 * new player's tower two days after they unlocked it (`USER_QUESTIONS.md` Q47).
 */
export const TOWER_SEASON_DAYS = 30;

// ---------------------------------------------------------------------------------------------
// What a floor pays (ETERNAL_TOWER.md §4)
// ---------------------------------------------------------------------------------------------

/**
 * Gold is the tower's main pay, growing with the floor. Floor 1 leaves 600 and floor 100 ≈ 46,800
 * (≈140,500 as a boss floor); a season climbed to the top is ≈1.33 M, about an eighth of what the
 * campaign pays over the same thirty days (`ECONOMY.md` §8), which is the size a second source
 * should be.
 */
export const TOWER_GOLD_BASE = 600;
export const TOWER_GOLD_GROWTH = 1.045;
/** A boss floor pays this multiple of its floor's gold. */
export const TOWER_GOLD_BOSS_MULT = 3;

export function towerGold(floor: number, boss: boolean): number {
  const gold = TOWER_GOLD_BASE * TOWER_GOLD_GROWTH ** (floor - 1);
  return Math.round(gold * (boss ? TOWER_GOLD_BOSS_MULT : 1));
}

/**
 * Energy per floor: one to five, a step every twenty floors. Exactly three hundred energy over a
 * full climb — five hours of the campaign's regeneration, handed over for playing something else.
 */
export const TOWER_ENERGY_PER_BAND = [1, 2, 3, 4, 5] as const;
export const TOWER_ENERGY_BAND_FLOORS = 20;

export function towerEnergy(floor: number): number {
  const band = Math.min(TOWER_ENERGY_PER_BAND.length - 1, Math.floor((floor - 1) / TOWER_ENERGY_BAND_FLOORS));
  return TOWER_ENERGY_PER_BAND[band] ?? TOWER_ENERGY_PER_BAND[TOWER_ENERGY_PER_BAND.length - 1] ?? 1;
}

/**
 * Brews level champions (`ECONOMY.md` §3.1), and the tower is where a player who has run out of
 * campaign to farm gets them. Every floor leaves Universal Brews; a boss floor also leaves the
 * brew of its faction's element, which is what a build actually wants.
 */
export const TOWER_BREW_BASE = 1;
export const TOWER_BREW_PER_FLOORS = 25;
export const TOWER_BREW_BOSS_ELEMENT = 3;

export function towerBrews(floor: number): number {
  return TOWER_BREW_BASE + Math.floor((floor - 1) / TOWER_BREW_PER_FLOORS);
}

/** Chronicle XP for a floor, and the multiple a boss floor pays. */
export const TOWER_PLAYER_XP_BASE = 40;
export const TOWER_PLAYER_XP_PER_FLOOR = 4;
export const TOWER_PLAYER_XP_BOSS_MULT = 3;

export function towerPlayerXp(floor: number, boss: boolean): number {
  const xp = TOWER_PLAYER_XP_BASE + TOWER_PLAYER_XP_PER_FLOOR * (floor - 1);
  return Math.round(xp * (boss ? TOWER_PLAYER_XP_BOSS_MULT : 1));
}

/** Champion XP per floor, on the same shape as the chronicle's. */
export const TOWER_CHAMPION_XP_BASE = 300;
export const TOWER_CHAMPION_XP_PER_FLOOR = 30;
export const TOWER_CHAMPION_XP_BOSS_MULT = 3;

export function towerChampionXp(floor: number, boss: boolean): number {
  const xp = TOWER_CHAMPION_XP_BASE + TOWER_CHAMPION_XP_PER_FLOOR * (floor - 1);
  return Math.round(xp * (boss ? TOWER_CHAMPION_XP_BOSS_MULT : 1));
}

// ---------------------------------------------------------------------------------------------
// Boss-floor shards (the owner's table)
// ---------------------------------------------------------------------------------------------

/**
 * A boss floor's shard odds, as percentages, exactly as the owner set them. Boss floors are the
 * only floors that may be fought again, and this is why: the chance is small, the floor is
 * repeatable, and a key is the whole cost.
 *
 * Floors past the last row keep that row's odds — the table does not keep climbing when floors are
 * added (the owner's instruction), so floor 110 rolls floor 100's chances.
 */
export interface TowerShardOdds {
  /** Boss floor the row applies from. */
  floor: number;
  /** Percent chance of one Ancient Shard. */
  ancient: number;
  /** Percent chance of one Sacred Shard. */
  sacred: number;
}

export const TOWER_SHARD_ODDS: readonly TowerShardOdds[] = [
  { floor: 10, ancient: 0.1, sacred: 0 },
  { floor: 20, ancient: 0.25, sacred: 0 },
  { floor: 30, ancient: 0.5, sacred: 0 },
  { floor: 40, ancient: 0.75, sacred: 0 },
  { floor: 50, ancient: 1, sacred: 0.05 },
  { floor: 60, ancient: 1.5, sacred: 0.1 },
  { floor: 70, ancient: 2, sacred: 0.15 },
  { floor: 80, ancient: 2.5, sacred: 0.25 },
  { floor: 90, ancient: 4, sacred: 0.5 },
  { floor: 100, ancient: 5, sacred: 0.65 },
];

/** The brews a faction's element pays on a boss floor, by element. */
export const TOWER_ELEMENT_BREW: Readonly<Record<string, CurrencyId>> = {
  justice: 'brew_justice',
  valor: 'brew_valor',
  faith: 'brew_faith',
  eclipse: 'brew_eclipse',
};
