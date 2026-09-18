/**
 * The Eternal Tower through the store (docs/design/ETERNAL_TOWER.md).
 *
 * The engine owns the rules; this spends the key, hands the battle its encounter, and banks what a
 * clear pays. The season is read at the door — `towerStateOf` — so a chronicle opened after thirty
 * days finds the climb reset without anything having had to run while it was closed.
 */
import { TOWER_FLOORS, TOWER_KEY_CAP, towerFaction } from '@content/balance/tower';
import { content } from '@content/registry';
import type { CurrencyAmount } from '@content/currencies/types';
import type { BattleOutcome } from '@engine/battle/types';
import { isDifficultyComplete } from '@engine/campaign/progress';
import { addChampionXp } from '@engine/champions/xp';
import type { CurrencyChange } from '@engine/economy/wallet';
import { fail, ok, type Result } from '@engine/errors';
import { bumpCounter, bumpCounterId } from '@engine/progression/counters';
import type { SaveGame } from '@engine/schema/save';
import { createRng } from '@engine/rng/rng';
import {
  currentSeason,
  canAttemptFloor,
  floorState,
  isBossFloor,
  msUntilNextKey,
  msUntilSeasonEnd,
  nextFloor,
  regenerateKeys,
  seasonNumber,
  shardOdds,
  towerEncounter,
  towerEncounterId,
  towerFloorRewards,
  withFloorCleared,
  type FloorState,
  type TowerSave,
} from '@engine/tower/index';
import { applyPlayerXp, NO_LEVEL_UP, type LevelUpResult } from './progression';
import { payCurrencies } from './payout';

/** Whether the tower is open at all: the whole Intro campaign behind the player. */
export function isTowerUnlocked(save: SaveGame): boolean {
  return isDifficultyComplete(save.campaign, 'intro');
}

/** The tower as it stands at `now`, with the keys ticked forward. Pure — nothing is written. */
export function towerStateOf(save: SaveGame, now: number): TowerSave {
  const season = currentSeason(save.tower, now);
  return { ...season, keys: regenerateKeys(season.keys, now) };
}

export interface TowerFloorView {
  floor: number;
  state: FloorState;
  boss: boolean;
  /** Which settlement's faction holds it, for the card's art and name. */
  settlement: number;
  /** Percent odds on a boss floor; zeroes elsewhere. */
  shards: { ancient: number; sacred: number };
}

export interface TowerView {
  unlocked: boolean;
  keys: number;
  keyCap: number;
  /** Milliseconds to the next key, or null at or above the cap. */
  msToKey: number | null;
  /** 0 until the first floor is attempted. */
  season: number;
  msToSeasonEnd: number | null;
  highestFloor: number;
  bestFloor: number;
  /** The one floor a key may open, or null at the top of the tower. */
  next: number | null;
  floors: TowerFloorView[];
}

/** Everything the tower screen draws, derived in one pass. */
export function towerView(save: SaveGame, now: number): TowerView {
  const state = towerStateOf(save, now);
  const floors: TowerFloorView[] = [];
  for (let floor = 1; floor <= TOWER_FLOORS; floor += 1)
    floors.push({
      floor,
      state: floorState(state, floor),
      boss: isBossFloor(floor),
      settlement: towerFaction(floor),
      shards: shardOdds(floor),
    });
  return {
    unlocked: isTowerUnlocked(save),
    keys: state.keys.value,
    keyCap: TOWER_KEY_CAP,
    msToKey: msUntilNextKey(state.keys, now),
    season: seasonNumber(state, now),
    msToSeasonEnd: msUntilSeasonEnd(state, now),
    highestFloor: state.highestFloor,
    bestFloor: state.bestFloor,
    next: nextFloor(state),
    floors,
  };
}

/** The encounter a floor fights, built from the faction holding it. */
export function towerFloorEncounter(floor: number): ReturnType<typeof towerEncounter> | null {
  const settlement = content.settlementByIndex(towerFaction(floor));
  if (!settlement) return null;
  const faction = content.factionById(settlement.faction);
  if (!faction) return null;
  return towerEncounter(floor, faction, settlement);
}

export interface TowerFloorStarted {
  floor: number;
  encounterId: string;
  /** Keys left after this one. */
  keysLeft: number;
}

/**
 * Spends a key and points the save at the floor it bought. The key goes *before* the fight, like
 * the campaign's energy, so a reload mid-battle cannot buy a free attempt; the season's clock also
 * starts here, on the first floor ever attempted.
 */
export function applyTowerFloorStart(
  save: SaveGame,
  input: { floor: number; now: number },
): Result<TowerFloorStarted> {
  if (!isTowerUnlocked(save)) return fail('locked', 'The tower waits on the whole Intro campaign');
  if (!towerFloorEncounter(input.floor)) return fail('invalid_argument', `No floor ${input.floor}`);
  const state = towerStateOf(save, input.now);
  const spent = canAttemptFloor(state, input.floor, input.now);
  if (!spent.ok) return spent;
  save.tower = {
    ...state,
    // A season is anchored to the first floor actually attempted, never to the save's birthday.
    seasonStartedAt: state.seasonStartedAt > 0 ? state.seasonStartedAt : input.now,
    keys: spent.value,
  };
  return ok({ floor: input.floor, encounterId: towerEncounterId(input.floor), keysLeft: spent.value.value });
}

export interface TowerFloorSummary {
  floor: number;
  boss: boolean;
  cleared: boolean;
  /** The climb after this fight. */
  highestFloor: number;
  /** This floor is a new best for the chronicle. */
  newBest: boolean;
  playerXp: number;
  championXp: number;
  levelUps: { instanceId: string; level: number; levelsGained: number }[];
  levelUp: LevelUpResult;
  changes: CurrencyChange[];
  /** The shards the boss floor rolled, for the result screen to call out. */
  shards: CurrencyAmount[];
}

/**
 * Banks a finished floor. A defeat pays nothing — the key is already spent — and a boss floor
 * fought again pays in full, which is what makes it worth a key (ETERNAL_TOWER.md §4).
 */
export function applyTowerFloorFinish(
  save: SaveGame,
  input: {
    floor: number;
    outcome: BattleOutcome;
    /** Champion instance ids that fought, for their XP. */
    party: readonly string[];
    now: number;
  },
): Result<TowerFloorSummary> {
  const settlement = content.settlementByIndex(towerFaction(input.floor));
  const faction = settlement ? content.factionById(settlement.faction) : undefined;
  if (!settlement || !faction) return fail('invalid_argument', `No floor ${input.floor}`);

  const before = towerStateOf(save, input.now);
  const cleared = input.outcome.kind === 'victory';
  const summary: TowerFloorSummary = {
    floor: input.floor,
    boss: isBossFloor(input.floor),
    cleared,
    highestFloor: before.highestFloor,
    newBest: false,
    playerXp: 0,
    championXp: 0,
    levelUps: [],
    levelUp: NO_LEVEL_UP,
    changes: [],
    shards: [],
  };
  bumpCounter(save, 'tower.attempts');
  if (!cleared) {
    save.tower = before;
    return ok(summary);
  }

  const state = withFloorCleared(before, input.floor);
  save.tower = state;
  summary.highestFloor = state.highestFloor;
  summary.newBest = state.bestFloor > before.bestFloor;

  // Seeded on the chronicle, the floor and the clear, so the same clear always pays the same thing.
  const rng = createRng(`${save.seedRoot}:tower:${input.floor}:${input.now}`);
  const rewards = towerFloorRewards({ floor: input.floor, element: faction.element }, rng);
  const amounts: CurrencyAmount[] = [...rewards.currencies];
  if (rewards.energy > 0) amounts.push({ currency: 'energy', amount: rewards.energy });
  summary.changes = payCurrencies(save, amounts, input.now);
  summary.shards = rewards.currencies.filter((entry) => entry.currency.startsWith('shard_'));

  summary.championXp = rewards.championXp;
  for (const instanceId of input.party) {
    const champion = save.roster[instanceId];
    if (!champion) continue;
    const gain = addChampionXp(champion, rewards.championXp);
    champion.level = gain.level;
    champion.xp = gain.xp;
    if (gain.levelsGained > 0)
      summary.levelUps.push({ instanceId, level: gain.level, levelsGained: gain.levelsGained });
  }

  // Chronicle XP last, so a level-up's energy refill lands on the new cap.
  const levelUp = applyPlayerXp(save, rewards.playerXp, input.now);
  summary.playerXp = rewards.playerXp;
  summary.levelUp = levelUp;
  summary.changes.push(...levelUp.changes);

  bumpCounter(save, 'tower.cleared');
  bumpCounterId(save, 'tower.floor.', String(input.floor));
  if (summary.boss) bumpCounter(save, 'tower.bosses');
  // A maximum rather than a tally, so it is written rather than added to.
  save.stats['tower.best'] = Math.max(save.stats['tower.best'] ?? 0, state.bestFloor);
  return ok(summary);
}
