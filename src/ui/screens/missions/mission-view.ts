/**
 * What the Chronicler's Path draws about a mission beyond its line (docs/tech/UI_DESIGN.md §5.15):
 * the family its goal belongs to — the crest's colour and the card's heading — and where the Path
 * stands, chapter by chapter, for the tabs.
 */
import type { GoalType } from '@content/quests/types';
import type { ChapterView } from '@engine/missions/path';
import type { GoalProgress } from '@engine/quests/goals';
import { translate } from '@i18n/index';

/**
 * Six kinds of asking, so a card is recognised before its line is read: the reference's "Arena
 * Mission", "Gear Mission" headings, in this world's words.
 */
export type MissionFamily = 'campaign' | 'champion' | 'gear' | 'summon' | 'boss' | 'chronicle';

const FAMILY: Readonly<Record<GoalType, MissionFamily>> = {
  clear_stage: 'campaign',
  clear_stages: 'campaign',
  win_battles: 'campaign',
  win_manual: 'campaign',
  spend_energy: 'campaign',
  settlement_stars: 'campaign',
  difficulty_stars: 'campaign',
  own_champions: 'champion',
  champion_reach_level: 'champion',
  champion_reach_stars: 'champion',
  level_champion_times: 'champion',
  rank_up_times: 'champion',
  skill_upgrades: 'champion',
  all_skills_maxed: 'champion',
  team_power: 'champion',
  equip_pieces: 'gear',
  equip_full_set: 'gear',
  gear_levels: 'gear',
  gear_reach_level: 'gear',
  craft: 'gear',
  dismantle: 'gear',
  gear_refine_times: 'gear',
  summon: 'summon',
  boss_fights: 'boss',
  boss_damage: 'boss',
  boss_percent: 'boss',
  player_level: 'chronicle',
  login: 'chronicle',
  claim_idle: 'chronicle',
  complete_daily_quests_days: 'chronicle',
  any: 'chronicle',
  all_previous: 'chronicle',
};

export function missionFamily(goal: GoalType): MissionFamily {
  return FAMILY[goal];
}

/**
 * The crest's colour a family: the campaign's blood, a champion's amber, the Forge's steel, the
 * Portal's violet, a boss's ember and the chronicle's own verdigris — muted, because six of them sit
 * side by side on dark stone.
 */
export const FAMILY_TINT: Readonly<Record<MissionFamily, string>> = {
  campaign: '#c0503f',
  champion: '#d9a441',
  gear: '#8fb0c8',
  summon: '#a35de3',
  boss: '#e0703a',
  chronicle: '#5fb39c',
};

/** "0 / 250,000": a goal's progress with its thousands marked, as the bar carries it. */
export function progressLine(progress: GoalProgress): string {
  return translate('missions.progress.count', {
    progress: progress.progress.toLocaleString('en-US'),
    target: progress.target.toLocaleString('en-US'),
  });
}

/** How far the Path has walked a chapter, for its tab. */
export type ChapterState = 'done' | 'current' | 'locked';

/**
 * `done` once all twelve are claimed, `locked` until the chapter before it is. That leaves one
 * chapter open and unfinished at a time — the Path is walked in order, so it is the one the
 * mission being walked sits in.
 */
export function chapterState(view: ChapterView): ChapterState {
  if (view.complete) return 'done';
  return view.unlocked ? 'current' : 'locked';
}

/** The share of a chapter walked, 0–1, for the thin bar under its tab. */
export function chapterShare(view: ChapterView): number {
  const total = view.chapter.missions.length;
  return total > 0 ? view.claimed / total : 0;
}
