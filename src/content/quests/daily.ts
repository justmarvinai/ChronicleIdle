/**
 * The daily board (docs/design/QUESTS_MISSIONS.md §2): ten quests worth ten points each, five
 * chests on the track, and a reset at 00:00 local.
 *
 * Six of the ten need a feature the chronicle may not have yet. Each of those is hidden until it
 * opens and the replacement quest — *Win three battles*, which every chronicle can do from its
 * first hour — stands in for their points, so the hundred is reachable on the day the board itself
 * unlocks and on every day after (`@engine/quests/board`).
 */
import { board, quest } from './dsl';

export default board({
  period: 'daily',
  feature: 'quests_daily',
  replacement: quest({
    slug: 'win_battles',
    icon: 'glyph.crossed_swords',
    goal: { type: 'win_battles', count: 3 },
    points: 10,
    rewards: [{ currency: 'gold', amount: 2_000 }],
    feature: null,
  }),
  quests: [
    quest({
      slug: 'login',
      icon: 'glyph.hourglass',
      goal: { type: 'login' },
      points: 10,
      rewards: [{ currency: 'shard_faded', amount: 1 }],
      feature: null,
    }),
    quest({
      slug: 'claim_idle',
      icon: 'glyph.trophy_cup',
      goal: { type: 'claim_idle', count: 1 },
      points: 10,
      rewards: [{ currency: 'gold', amount: 5_000 }],
      feature: 'idle_chest',
    }),
    quest({
      slug: 'clear_stages',
      icon: 'glyph.crossed_swords',
      goal: { type: 'clear_stages', count: 5 },
      points: 10,
      // Two brews of the elements a chronicle always has a use for.
      rewards: [
        { currency: 'brew_universal', amount: 1 },
        { currency: 'brew_justice', amount: 1 },
      ],
      feature: null,
    }),
    quest({
      slug: 'spend_energy',
      icon: 'glyph.magic_flame',
      goal: { type: 'spend_energy', amount: 60 },
      points: 10,
      rewards: [{ currency: 'energy', amount: 40 }],
      feature: null,
    }),
    quest({
      slug: 'level_champions',
      icon: 'glyph.shooting_stars',
      goal: { type: 'level_champion_times', count: 3 },
      points: 10,
      rewards: [{ currency: 'gold', amount: 3_000 }],
      feature: 'tavern_level',
    }),
    quest({
      slug: 'gear_levels',
      icon: 'glyph.hammer_hit',
      goal: { type: 'gear_levels', count: 5 },
      points: 10,
      rewards: [{ currency: 'mat_arcane_dust', amount: 5 }],
      feature: 'gear',
    }),
    quest({
      slug: 'daily_boss',
      icon: 'glyph.flaming_skull',
      goal: { type: 'boss_fights', boss: 'boss.gargoyle', count: 2 },
      points: 10,
      rewards: [{ currency: 'tome_rare', amount: 1 }],
      feature: 'daily_boss',
    }),
    quest({
      slug: 'summon',
      icon: 'glyph.spirit_vortex',
      goal: { type: 'summon', count: 1 },
      points: 10,
      rewards: [{ currency: 'gold', amount: 2_000 }],
      feature: 'summoning',
    }),
    quest({
      slug: 'win_manual',
      icon: 'glyph.fist_punch',
      goal: { type: 'win_manual', count: 1 },
      points: 10,
      rewards: [{ currency: 'brew_universal', amount: 1 }],
      feature: null,
    }),
    quest({
      slug: 'forge',
      icon: 'glyph.spiked_cleaver',
      // Either bench answers it: the Forge's two everyday jobs (QUESTS_MISSIONS.md §2).
      goal: {
        type: 'any',
        goals: [
          { type: 'craft', count: 1 },
          { type: 'dismantle', count: 1 },
        ],
      },
      points: 10,
      rewards: [{ currency: 'mat_scrap_iron', amount: 10 }],
      feature: 'forge',
    }),
  ],
  chests: [
    { points: 20, currencies: [{ currency: 'gold', amount: 3_000 }] },
    {
      points: 40,
      currencies: [
        { currency: 'gems', amount: 10 },
        { currency: 'brew_universal', amount: 2 },
      ],
    },
    {
      points: 60,
      currencies: [
        { currency: 'shard_faded', amount: 1 },
        { currency: 'mat_ember_alloy', amount: 5 },
      ],
    },
    { points: 80, currencies: [{ currency: 'gems', amount: 20 }] },
    {
      points: 100,
      currencies: [
        { currency: 'gems', amount: 30 },
        { currency: 'tome_rare', amount: 2 },
      ],
      // Every third full board pays a shard instead (QUESTS_MISSIONS.md §2).
      cycle: { every: 3, instead: [{ currency: 'shard_ancient', amount: 1 }] },
    },
  ],
});
