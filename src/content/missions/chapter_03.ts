/**
 * Chapter 3 — Sand and Road: the bazaar and the Kingsroad, the Forge's first bench and the daily gate.
 *
 * The table this file prints is `docs/design/QUESTS_MISSIONS.md` §4; the lines themselves live in
 * `src/i18n/en/missions.ts`, keyed by where each mission sits.
 */
import { chapter, mission } from './dsl';

export default chapter({
  index: 3,
  missions: [
    // 3.1 Clear Sunspire Bazaar 4-5
    mission({ type: 'clear_stage', settlement: 4, stage: 5, difficulty: 'intro' }, [
      { currency: 'gold', amount: 6_000 },
    ]),
    // 3.2 Deal 250,000 damage to Gravemaw (Easy) in a day
    mission({ type: 'boss_damage', boss: 'boss.gravemaw', tier: 'easy', amount: 250_000 }, [
      { currency: 'gems', amount: 20 },
    ]),
    // 3.3 Upgrade a gear piece to +8
    mission({ type: 'gear_reach_level', level: 8, count: 1 }, [{ currency: 'mat_refining_core', amount: 5 }]),
    // 3.4 Upgrade a skill
    mission({ type: 'skill_upgrades', count: 1 }, [{ currency: 'tome_rare', amount: 1 }]),
    // 3.5 Own an Epic champion
    mission({ type: 'own_champions', count: 1, rarity: 'epic' }, [{ currency: 'brew_universal', amount: 4 }]),
    // 3.6 Defeat High Zealot Qorath (4-10)
    mission({ type: 'clear_stage', settlement: 4, stage: 10, difficulty: 'intro' }, [
      { currency: 'shard_ancient', amount: 1 },
    ]),
    // 3.7 Clear The Old Kingsroad 5-5
    mission({ type: 'clear_stage', settlement: 5, stage: 5, difficulty: 'intro' }, [
      { currency: 'gold', amount: 8_000 },
    ]),
    // 3.8 Earn 30 stars in Millbrook Fields (Intro)
    mission({ type: 'settlement_stars', settlement: 2, difficulty: 'intro', stars: 30 }, [
      { currency: 'gems', amount: 25 },
    ]),
    // 3.9 Level a champion to 25
    mission({ type: 'champion_reach_level', level: 25, count: 1 }, [
      { currency: 'brew_universal', amount: 5 },
    ]),
    // 3.10 Summon with an Ancient Shard
    mission({ type: 'summon', count: 1, shard: 'ancient' }, [{ currency: 'shard_ancient', amount: 1 }]),
    // 3.11 Reach chronicle level 15
    mission({ type: 'player_level', level: 15 }, [{ currency: 'energy', amount: 300 }]),
    // 3.12 Defeat Ser Dagan the Oathbreaker (5-10)
    mission({ type: 'clear_stage', settlement: 5, stage: 10, difficulty: 'intro' }, [
      { currency: 'shard_sacred', amount: 1 },
    ]),
  ],
  chest: { currencies: [{ currency: 'shard_sacred', amount: 1 }] },
});
