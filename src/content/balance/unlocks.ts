/**
 * Feature unlocks by player level (docs/design/GAME_DESIGN.md §6). Progress-based unlocks
 * (Normal/Hard difficulty, ×3/×4 speed) are evaluated by the campaign engine, not by level.
 */
export const FEATURE_IDS = [
  'campaign',
  'champions',
  'tavern_level',
  'gear',
  'summoning',
  'quests_daily',
  'idle_chest',
  'mine',
  'missions',
  'tavern_rank',
  'forge',
  'tavern_skills',
  'daily_boss',
  'instant_clear',
  'quests_weekly',
  'weekly_boss',
  'gear_refine',
  'eternal_tower',
  'glorious_palace',
  'brewery',
  'dungeons',
  'market',
  'login_calendar',
  'auto_repeat_10',
  'auto_repeat_25',
  'auto_repeat_50',
] as const;

export type FeatureId = (typeof FEATURE_IDS)[number];

export const FEATURE_UNLOCK_LEVEL: Readonly<Record<FeatureId, number>> = {
  campaign: 1,
  champions: 1,
  /**
   * The Market and the Calendar open with the chronicle. Both are meta rather than power: the Gold
   * Market's shelf is only worth reading once there is gold to spend, and a calendar that starts
   * counting on day one is the only kind that is fair to a player who found the game late.
   */
  market: 1,
  login_calendar: 1,
  tavern_level: 2,
  /**
   * Gear is equippable from the first hour (the owner's third batch). A piece drops in the
   * campaign's opening stands, and a chronicle that may not wear what it has just found is
   * holding a reward it cannot use.
   */
  gear: 1,
  summoning: 4,
  quests_daily: 5,
  idle_chest: 5,
  /**
   * The Mine (MINE.md §1): the one level between the daily board (5) and the Tavern's rank-up (7)
   * that opens nothing else, so its lesson has the hub to itself. Its first level is dug already.
   */
  mine: 6,
  missions: 1,
  tavern_rank: 7,
  forge: 8,
  tavern_skills: 9,
  daily_boss: 10,
  /**
   * Instant clears (CAMPAIGN.md §10): a mastered stand written down rather than fought. Late
   * enough that the first settlements were fought and three-starred by hand, and the one level
   * between the Gargoyle (10) and the weekly board (12) that opens nothing else, so its lesson has
   * the battle setup to itself.
   */
  instant_clear: 11,
  quests_weekly: 12,
  weekly_boss: 15,
  gear_refine: 18,
  /**
   * The tower is gated on *progress*, not on level: the whole Intro campaign behind you
   * (`isDifficultyComplete`). Level 1 here so the level gate never speaks for it — the Game Modes
   * card and the route both ask the campaign.
   */
  eternal_tower: 1,
  /**
   * The Palace is gated on *progress* too: the first settlement's boss stand fallen
   * (`isPalaceUnlocked`). Level 1 so the level gate never speaks for it.
   */
  glorious_palace: 1,
  /** The Brewery: brews are what a champion levels on, so it opens early (owner's brief). */
  brewery: 3,
  /**
   * The Dungeons open from the first hour (the owner's brief). What stops a new chronicle is the
   * ladder — Normal 1 is a day-one fight and Normal 20 is not — rather than a level on the door.
   */
  dungeons: 1,
  auto_repeat_10: 5,
  auto_repeat_25: 20,
  auto_repeat_50: 30,
};

/** Player level cap. */
export const PLAYER_MAX_LEVEL = 100;
