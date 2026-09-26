/**
 * Lifetime counters (docs/design/QUESTS_MISSIONS.md §1, `ARCHITECTURE.md` §4.1).
 *
 * `save.stats` is one flat record of numbers that only ever grows: the profile reads it, and from
 * Phase 12 the quest tracker measures every `count`-style goal as a delta against the moment a
 * period began. That makes the keys an interface, not an implementation detail — a goal that names
 * a key nobody writes would sit at zero for ever and look like a bug in the quest. So the names
 * live here, once, with the helper that writes them, and the content validator checks every goal
 * against `COUNTER_KEYS`.
 *
 * Keys are `<area>.<thing>`, and some carry a suffix the caller supplies (`boss.fights.<bossId>`,
 * `summon.pulls.<shardId>`). The suffixed families are declared as prefixes so the validator can
 * recognise them without knowing every id.
 */
import type { SaveGame } from '@engine/schema/save';

/**
 * Every counter the game writes, in the order a profile would read them. A new counter goes here
 * first; `bumpCounter` will not accept a name that is not one of these, so a typo cannot quietly
 * create a second counter that nothing reads.
 */
export const COUNTER_KEYS = [
  // Battles (`state/store.ts` on every finished fight)
  'battles.fought',
  'battles.victory',
  'battles.defeat',
  'battles.timeout',
  'battles.retreat',
  'battles.allyTurns',
  /** Victories the player steered themselves, for "win a battle in Manual mode". */
  'battles.won.manual',
  // The campaign
  'campaign.runs',
  'campaign.cleared',
  'campaign.stars',
  'campaign.gearDrops',
  /**
   * Runs written down rather than fought (CAMPAIGN.md §10). Each is also a `campaign.cleared` and
   * a `campaign.runs`, so a quest that asks for stands cleared counts them; none is a battle.
   */
  'campaign.instant',
  /** Energy the campaign and the boss gate have charged, for "spend N energy". */
  'energy.spent',
  // The Tavern
  'tavern.levelUps',
  'tavern.rankUps',
  'tavern.skillUpgrades',
  'tavern.foodEaten',
  // Gear and the Forge
  'gear.drops',
  'gear.levels',
  'forge.crafts',
  'forge.dismantles',
  'forge.refines',
  // The Portal
  'summon.pulls',
  'summon.choices',
  'summon.exchanged',
  // The Idle Chest
  'idle.claims',
  'idle.hours',
  // The Mine (MINE.md §7)
  /** Collections the player asked for; the one an upgrade makes on its way down is not one. */
  'mine.collections',
  /** Gems and Glyph Sigils the Mine has paid, by whichever collection paid them. */
  'mine.gems',
  'mine.sigils',
  /** Levels dug, which is the number the Mine's long goal is measured in. */
  'mine.upgrades',
  // The period bosses
  'boss.fights',
  'boss.damage',
  'boss.kills',
  'boss.chests',
  // Quests
  /** Days whose daily quests were all completed, for the weekly quest that counts them. */
  'quests.daily.days',
  /** Days on which at least five daily quests were claimed — the mission line's own ask. */
  'quests.daily.days5',
  'quests.claimed',
  'quests.chests',
  // The Chronicler's Path
  'missions.claimed',
  'missions.chests',
  // The Brewery
  'brewery.runs',
  /** Stages cleared for the first time, across all four halls. */
  'brewery.cleared',
  /** Brews the halls have handed over, whichever element they were. */
  'brewery.brews',
  // The Dungeons
  'dungeon.runs',
  /** Stages cleared for the first time, across all five keeps. */
  'dungeon.cleared',
  /** Pieces the keeps have handed over — the number the mode exists for. */
  'dungeon.gear',
  // The Eternal Tower
  'tower.attempts',
  'tower.cleared',
  /** Boss floors cleared, which is what the shard rolls come from. */
  'tower.bosses',
  /** Highest floor ever reached. Written as a maximum rather than added to. */
  'tower.best',
  // The Market, the Bag and the Calendar
  'market.purchases',
  /** Gold and gems put across the two counters, for the profile's ledger. */
  'market.gold.spent',
  'market.gems.spent',
  /** Consumables actually used, which is a different number from ones bought. */
  'bag.used',
  /** Days taken off the Login Calendar, across every round. */
  'login.claims',
  /**
   * Missions bought past with a Dispensation. Deliberately *not* folded into `missions.claimed`:
   * that counter answers "how many have been earned", and a bought one was not.
   */
  'missions.skipped',
  // The Wallet
  /** Energy bought with gems (ECONOMY.md §5), one per refill. */
  'energy.refills',
  /** Eternal Keys bought with gems (ECONOMY.md §5.2), one per refill. */
  'tower.key_refills',
] as const;

/** A quest chest's own claim count, for a chest whose payout runs on a cadence. */
export const QUEST_CHEST_COUNTER = 'quests.chest.' as const;

export type CounterKey = (typeof COUNTER_KEYS)[number];

/**
 * Families whose keys carry a caller's id (`battles.fought.stage.01.01`, `summon.pulls.faded`,
 * `boss.fights.boss.titan`). They are counted the same way; the prefix is what makes them
 * recognisable to the validator and to anyone reading a save.
 */
export const COUNTER_PREFIXES = [
  'battles.fought.',
  'battles.won.',
  /** `boss.fights.<bossId>` and `boss.fights.<bossId>.<tierId>`, for the missions that name a tier. */
  'boss.fights.',
  /** `brewery.runs.<hallId>`, so a quest can ask for runs in one element's hall. */
  'brewery.runs.',
  /** `dungeon.runs.<dungeonId>`, so a quest can name one keep. */
  'dungeon.runs.',
  /** `forge.crafts.<tier>`, for the missions that name a bench. */
  'forge.crafts.',
  'summon.pulls.',
  'summon.rarity.',
  /** `tower.floor.<n>`, so a mission may name a floor. */
  'tower.floor.',
  /** `market.bought.<shelfId>`, so a quest could later name one shelf entry. */
  'market.bought.',
  /** `bag.used.<itemId>`, so a mission could later ask for a particular item to be used. */
  'bag.used.',
  QUEST_CHEST_COUNTER,
] as const;

const KEYS = new Set<string>(COUNTER_KEYS);

/** Whether `key` is a counter the game writes — an exact name or a member of a suffixed family. */
export function isCounterKey(key: string): boolean {
  return KEYS.has(key) || COUNTER_PREFIXES.some((prefix) => key.startsWith(prefix) && key !== prefix);
}

/**
 * Adds to a counter. Zero and negative amounts are ignored: a counter never falls, so a caller
 * that computes a delta can hand it over without checking the sign first.
 */
export function bumpCounter(save: SaveGame, key: CounterKey, by = 1): void {
  if (by <= 0) return;
  save.stats[key] = (save.stats[key] ?? 0) + by;
}

/**
 * Adds to one of the suffixed families (`bumpCounterId(save, 'boss.fights.', bossId)`). The
 * prefix is typed, the suffix is the caller's own id.
 */
export function bumpCounterId(
  save: SaveGame,
  prefix: (typeof COUNTER_PREFIXES)[number],
  id: string,
  by = 1,
): void {
  if (by <= 0) return;
  const key = `${prefix}${id}`;
  save.stats[key] = (save.stats[key] ?? 0) + by;
}

/** What a counter stands at, zero when nothing has written it yet. */
export function counter(save: Pick<SaveGame, 'stats'>, key: string): number {
  return save.stats[key] ?? 0;
}
