/**
 * `mission` and `chapter`: the builders the Path's ten files are written with
 * (docs/tech/CONTENT_AUTHORING.md §8). They assemble plain objects — a mission's id, its i18n key
 * and its glyph all follow from where it sits in the line, so a chapter file is goals and rewards.
 */
import type { GlyphKey } from '@assets/manifest.generated';
import type { CurrencyAmount } from '@content/currencies/types';
import type { Goal, GoalType } from '@content/quests/types';
import type { ChapterChestDef, MissionChapterDef, MissionDef } from './types';

/** Two digits, so `mission.03.07` sorts the way the Path is walked. */
const pad = (n: number): string => `${n}`.padStart(2, '0');

/**
 * The glyph a mission wears, by the family its goal belongs to: one icon per kind of asking, so a
 * card is recognisable before its line is read. A mission may override it (the Titan rows wear
 * its eye rather than a skull).
 */
const ICONS: Readonly<Record<GoalType, GlyphKey>> = {
  login: 'glyph.hourglass',
  any: 'glyph.spell_book',
  clear_stage: 'glyph.crossed_swords',
  clear_stages: 'glyph.crossed_swords',
  win_battles: 'glyph.fist_punch',
  win_manual: 'glyph.fist_punch',
  spend_energy: 'glyph.magic_flame',
  settlement_stars: 'glyph.shooting_stars',
  difficulty_stars: 'glyph.shooting_stars',
  own_champions: 'glyph.cloaked_figure',
  champion_reach_level: 'glyph.magic_feather',
  champion_reach_stars: 'glyph.shooting_stars',
  level_champion_times: 'glyph.magic_feather',
  rank_up_times: 'glyph.shooting_stars',
  skill_upgrades: 'glyph.spell_book',
  all_skills_maxed: 'glyph.spell_book',
  player_level: 'glyph.celestial_body',
  team_power: 'glyph.stomp_impact',
  equip_pieces: 'glyph.ribcage_armor',
  equip_full_set: 'glyph.ribcage_armor',
  gear_levels: 'glyph.hammer_hit',
  gear_reach_level: 'glyph.hammer_hit',
  craft: 'glyph.spiked_cleaver',
  dismantle: 'glyph.spiked_cleaver',
  gear_refine_times: 'glyph.spiked_cleaver',
  summon: 'glyph.spirit_vortex',
  claim_idle: 'glyph.trophy_cup',
  boss_fights: 'glyph.flaming_skull',
  boss_damage: 'glyph.flaming_skull',
  boss_percent: 'glyph.flaming_skull',
  complete_daily_quests_days: 'glyph.burning_scroll',
  all_previous: 'glyph.owl',
};

/**
 * One mission, still missing where it sits — `chapter` supplies that, so a mission cannot end up
 * with an id that disagrees with the line it is in.
 */
export function mission(
  goal: Goal,
  rewards: CurrencyAmount[],
  icon?: GlyphKey,
): (chapter: number, index: number) => MissionDef {
  return (chapter, index) => ({
    id: `mission.${pad(chapter)}.${pad(index)}`,
    chapter,
    index,
    name: `mission.${pad(chapter)}.${pad(index)}.name`,
    icon: icon ?? ICONS[goal.type],
    goal,
    rewards,
    version: 1,
  });
}

export interface ChapterInput {
  index: number;
  missions: ((chapter: number, index: number) => MissionDef)[];
  chest: ChapterChestDef;
  version?: number;
}

export function chapter(input: ChapterInput): MissionChapterDef {
  return {
    id: `chapter.${pad(input.index)}`,
    index: input.index,
    name: `chapter.${pad(input.index)}.name`,
    eldric: `chapter.${pad(input.index)}.eldric`,
    missions: input.missions.map((make, position) => make(input.index, position + 1)),
    chest: input.chest,
    version: input.version ?? 1,
  };
}
