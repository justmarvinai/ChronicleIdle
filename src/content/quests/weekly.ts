/**
 * The weekly board (docs/design/QUESTS_MISSIONS.md §3): eight quests worth a hundred points
 * between them, four chests on the track, and a reset in the night from Sunday to Monday.
 *
 * The weekly board asks for a week of play rather than a day of it: sixty stages, ten daily-boss
 * keys, three weekly ones. Half of it needs features a chronicle earns on the way to level 15, so
 * the same replacement quest stands in — *Win twenty battles*, a week's worth of the one thing
 * every chronicle can do — and the hundred stays reachable the week the board opens.
 */
import { board, quest } from './dsl';

export default board({
  period: 'weekly',
  feature: 'quests_weekly',
  replacement: quest({
    slug: 'win_battles_weekly',
    icon: 'glyph.crossed_swords',
    goal: { type: 'win_battles', count: 20 },
    points: 10,
    rewards: [{ currency: 'gold', amount: 10_000 }],
    feature: null,
  }),
  quests: [
    quest({
      slug: 'daily_days',
      icon: 'glyph.hourglass',
      goal: { type: 'complete_daily_quests_days', count: 5 },
      points: 20,
      rewards: [{ currency: 'gems', amount: 50 }],
      feature: 'quests_daily',
    }),
    quest({
      slug: 'clear_stages_weekly',
      icon: 'glyph.crossed_swords',
      goal: { type: 'clear_stages', count: 60 },
      points: 15,
      rewards: [{ currency: 'brew_universal', amount: 5 }],
      feature: null,
    }),
    quest({
      slug: 'daily_boss_keys',
      icon: 'glyph.flaming_skull',
      goal: { type: 'boss_fights', boss: 'boss.gravemaw', count: 10 },
      points: 15,
      rewards: [{ currency: 'tome_epic', amount: 2 }],
      feature: 'daily_boss',
    }),
    quest({
      slug: 'weekly_boss_keys',
      icon: 'glyph.cursed_eye',
      goal: { type: 'boss_fights', boss: 'boss.nyxara', count: 3 },
      points: 15,
      rewards: [{ currency: 'mat_glyph_sigil', amount: 1 }],
      feature: 'weekly_boss',
    }),
    quest({
      slug: 'summon_ten',
      icon: 'glyph.spirit_vortex',
      goal: { type: 'summon', count: 10 },
      points: 10,
      rewards: [{ currency: 'shard_ancient', amount: 1 }],
      feature: 'summoning',
    }),
    quest({
      slug: 'rank_up',
      icon: 'glyph.shooting_stars',
      goal: { type: 'rank_up_times', count: 1 },
      points: 10,
      rewards: [{ currency: 'gold', amount: 20_000 }],
      feature: 'tavern_rank',
    }),
    quest({
      slug: 'gear_twelve',
      icon: 'glyph.hammer_hit',
      goal: { type: 'gear_reach_level', level: 12, count: 1 },
      points: 10,
      rewards: [{ currency: 'mat_refining_core', amount: 10 }],
      feature: 'gear',
    }),
    quest({
      slug: 'claim_idle_seven',
      icon: 'glyph.trophy_cup',
      goal: { type: 'claim_idle', count: 7 },
      points: 5,
      rewards: [{ currency: 'energy', amount: 100 }],
      feature: 'idle_chest',
    }),
  ],
  chests: [
    { points: 25, currencies: [{ currency: 'gold', amount: 20_000 }] },
    { points: 50, currencies: [{ currency: 'shard_ancient', amount: 1 }] },
    {
      points: 75,
      currencies: [
        { currency: 'gems', amount: 60 },
        { currency: 'tome_epic', amount: 1 },
      ],
    },
    { points: 100, currencies: [{ currency: 'shard_sacred', amount: 1 }] },
  ],
});
