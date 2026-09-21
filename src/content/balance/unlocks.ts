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
  'missions',
  'tavern_rank',
  'forge',
  'tavern_skills',
  'daily_boss',
  'quests_weekly',
  'weekly_boss',
  'gear_refine',
  'eternal_tower',
  'glorious_palace',
  'brewery',
  'auto_repeat_10',
  'auto_repeat_25',
  'auto_repeat_50',
] as const;

export type FeatureId = (typeof FEATURE_IDS)[number];

export const FEATURE_UNLOCK_LEVEL: Readonly<Record<FeatureId, number>> = {
  campaign: 1,
  champions: 1,
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
  missions: 1,
  tavern_rank: 7,
  forge: 8,
  tavern_skills: 9,
  daily_boss: 10,
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
  auto_repeat_10: 5,
  auto_repeat_25: 20,
  auto_repeat_50: 30,
};

/** Player level cap. */
export const PLAYER_MAX_LEVEL = 100;
