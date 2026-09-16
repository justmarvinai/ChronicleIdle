/**
 * Chapter 5 — The Cold and the Arena: the pass and the colosseum, and the first dent in Nyxara.
 *
 * The table this file prints is `docs/design/QUESTS_MISSIONS.md` §4; the lines themselves live in
 * `src/i18n/en/missions.ts`, keyed by where each mission sits.
 */
import { chapter, mission } from './dsl';

export default chapter({
  index: 5,
  missions: [
    // 5.1 Clear Frostvein Pass 8-5
    mission({ type: 'clear_stage', settlement: 8, stage: 5, difficulty: 'intro' }, [
      { currency: 'gold', amount: 15_000 },
    ]),
    // 5.2 Upgrade a gear piece to +12
    mission({ type: 'gear_reach_level', level: 12, count: 1 }, [
      { currency: 'mat_refining_core', amount: 10 },
    ]),
    // 5.3 Own a Legendary champion
    mission({ type: 'own_champions', count: 1, rarity: 'legendary' }, [{ currency: 'tome_epic', amount: 2 }]),
    // 5.4 Defeat Matriarch Yrsa Frostmaw (8-10)
    mission({ type: 'clear_stage', settlement: 8, stage: 10, difficulty: 'intro' }, [
      { currency: 'shard_ancient', amount: 1 },
    ]),
    // 5.5 Earn 30 stars in Greyhaven Harbor (Intro)
    mission({ type: 'settlement_stars', settlement: 3, difficulty: 'intro', stars: 30 }, [
      { currency: 'gems', amount: 30 },
    ]),
    // 5.6 Clear The Sunken Colosseum 9-5
    mission({ type: 'clear_stage', settlement: 9, stage: 5, difficulty: 'intro' }, [
      { currency: 'gold', amount: 18_000 },
    ]),
    // 5.7 Reach 2 % on Nyxara (Normal)
    mission(
      { type: 'boss_percent', boss: 'boss.nyxara', tier: 'normal', pct: 2 },
      [{ currency: 'gems', amount: 60 }],
      'glyph.cursed_eye',
    ),
    // 5.8 Rank up a champion to 5★
    mission({ type: 'champion_reach_stars', stars: 5, count: 1 }, [{ currency: 'gold', amount: 30_000 }]),
    // 5.9 Level a champion to 40
    mission({ type: 'champion_reach_level', level: 40, count: 1 }, [
      { currency: 'brew_universal', amount: 8 },
    ]),
    // 5.10 Upgrade 5 skills
    mission({ type: 'skill_upgrades', count: 5 }, [{ currency: 'tome_epic', amount: 2 }]),
    // 5.11 Reach chronicle level 25
    mission({ type: 'player_level', level: 25 }, [{ currency: 'energy', amount: 400 }]),
    // 5.12 Defeat The Undefeated (9-10)
    mission({ type: 'clear_stage', settlement: 9, stage: 10, difficulty: 'intro' }, [
      { currency: 'shard_sacred', amount: 1 },
    ]),
  ],
  chest: {
    currencies: [
      { currency: 'shard_sacred', amount: 1 },
      { currency: 'mat_glyph_sigil', amount: 1 },
    ],
  },
});
