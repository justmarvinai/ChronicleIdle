/**
 * Chapter 2 — The Fields and the Harbor: the second and third settlements, and the Tavern's first rank-up.
 *
 * The table this file prints is `docs/design/QUESTS_MISSIONS.md` §4; the lines themselves live in
 * `src/i18n/en/missions.ts`, keyed by where each mission sits.
 */
import { chapter, mission } from './dsl';

export default chapter({
  index: 2,
  missions: [
    // 2.1 Clear Millbrook Fields 2-5
    mission({ type: 'clear_stage', settlement: 2, stage: 5, difficulty: 'intro' }, [
      { currency: 'gold', amount: 4_000 },
    ]),
    // 2.2 Own 6 champions
    mission({ type: 'own_champions', count: 6 }, [{ currency: 'brew_universal', amount: 2 }]),
    // 2.3 Level a champion to 15
    mission({ type: 'champion_reach_level', level: 15, count: 1 }, [
      { currency: 'brew_universal', amount: 4 },
    ]),
    // 2.4 Earn 20 stars in Thornwood Crossing (Intro)
    mission({ type: 'settlement_stars', settlement: 1, difficulty: 'intro', stars: 20 }, [
      { currency: 'gems', amount: 15 },
    ]),
    // 2.5 Rank up a champion
    mission({ type: 'rank_up_times', count: 1 }, [{ currency: 'gold', amount: 8_000 }]),
    // 2.6 Defeat The Sow of Millbrook (2-10)
    mission({ type: 'clear_stage', settlement: 2, stage: 10, difficulty: 'intro' }, [
      { currency: 'shard_ancient', amount: 1 },
    ]),
    // 2.7 Craft a gear piece
    mission({ type: 'craft', count: 1 }, [{ currency: 'mat_ember_alloy', amount: 10 }]),
    // 2.8 Spend a key on Gargoyle (Easy)
    mission({ type: 'boss_fights', boss: 'boss.gargoyle', tier: 'easy', count: 1 }, [
      { currency: 'tome_rare', amount: 1 },
    ]),
    // 2.9 Equip a full 2-piece set
    mission({ type: 'equip_full_set', pieces: 2 }, [{ currency: 'gold', amount: 5_000 }]),
    // 2.10 Clear Greyhaven Harbor 3-5
    mission({ type: 'clear_stage', settlement: 3, stage: 5, difficulty: 'intro' }, [
      { currency: 'gems', amount: 20 },
    ]),
    // 2.11 Reach chronicle level 10
    mission({ type: 'player_level', level: 10 }, [{ currency: 'energy', amount: 250 }]),
    // 2.12 Defeat Captain Morwenna Tide (3-10)
    mission({ type: 'clear_stage', settlement: 3, stage: 10, difficulty: 'intro' }, [
      { currency: 'shard_ancient', amount: 1 },
      { currency: 'tome_epic', amount: 1 },
    ]),
  ],
  chest: {
    currencies: [
      { currency: 'shard_ancient', amount: 1 },
      { currency: 'gems', amount: 50 },
    ],
  },
});
