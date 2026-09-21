/**
 * Chapter 4 — Into the Barrow: the barrow and the plains, the weekly gate and the second craft bench.
 *
 * The table this file prints is `docs/design/QUESTS_MISSIONS.md` §4; the lines themselves live in
 * `src/i18n/en/missions.ts`, keyed by where each mission sits.
 */
import { chapter, mission } from './dsl';

export default chapter({
  index: 4,
  missions: [
    // 4.1 Clear Barrowdeep 6-5
    mission({ type: 'clear_stage', settlement: 6, stage: 5, difficulty: 'intro' }, [
      { currency: 'gold', amount: 10_000 },
    ]),
    // 4.2 Spend a key on Titan
    mission(
      { type: 'boss_fights', boss: 'boss.titan', count: 1 },
      [{ currency: 'mat_glyph_sigil', amount: 1 }],
      'glyph.cursed_eye',
    ),
    // 4.3 Rank up a champion to 4★
    mission({ type: 'champion_reach_stars', stars: 4, count: 1 }, [{ currency: 'gold', amount: 15_000 }]),
    // 4.4 Equip a full 4-piece set
    mission({ type: 'equip_full_set', pieces: 4 }, [{ currency: 'mat_refining_core', amount: 10 }]),
    // 4.5 Craft a Tier II gear piece
    mission({ type: 'craft', count: 1, tier: 'ember' }, [{ currency: 'mat_ember_alloy', amount: 15 }]),
    // 4.6 Defeat The Barrow Wight (6-10)
    mission({ type: 'clear_stage', settlement: 6, stage: 10, difficulty: 'intro' }, [
      { currency: 'shard_ancient', amount: 1 },
    ]),
    // 4.7 Clear Ashfall Plains 7-5
    mission({ type: 'clear_stage', settlement: 7, stage: 5, difficulty: 'intro' }, [
      { currency: 'gold', amount: 12_000 },
    ]),
    // 4.8 Deal 1,000,000 damage to Gargoyle (Normal) in a day
    mission({ type: 'boss_damage', boss: 'boss.gargoyle', tier: 'normal', amount: 1_000_000 }, [
      { currency: 'gems', amount: 40 },
    ]),
    // 4.9 Level a champion to 30
    mission({ type: 'champion_reach_level', level: 30, count: 1 }, [
      { currency: 'brew_universal', amount: 6 },
    ]),
    // 4.10 Complete 5 daily quests on 5 different days
    mission({ type: 'complete_daily_quests_days', count: 5, quests: 5 }, [{ currency: 'gems', amount: 40 }]),
    // 4.11 Own 12 champions
    mission({ type: 'own_champions', count: 12 }, [{ currency: 'tome_epic', amount: 1 }]),
    // 4.12 Defeat Warbrand Ulgrim (7-10)
    mission({ type: 'clear_stage', settlement: 7, stage: 10, difficulty: 'intro' }, [
      { currency: 'shard_sacred', amount: 1 },
      { currency: 'gems', amount: 20 },
    ]),
  ],
  chest: {
    currencies: [
      { currency: 'shard_sacred', amount: 1 },
      { currency: 'gems', amount: 100 },
    ],
  },
});
