/**
 * Chapter 9 — Hard: every mercy taken out of the road already walked.
 *
 * The table this file prints is `docs/design/QUESTS_MISSIONS.md` §4; the lines themselves live in
 * `src/i18n/en/missions.ts`, keyed by where each mission sits.
 */
import { chapter, mission } from './dsl';

export default chapter({
  index: 9,
  missions: [
    // 9.1 Clear Thornwood Crossing 1-10 (Hard)
    mission({ type: 'clear_stage', settlement: 1, stage: 10, difficulty: 'hard' }, [
      { currency: 'gold', amount: 60_000 },
    ]),
    // 9.2 Earn all 360 stars in Intro
    mission({ type: 'difficulty_stars', difficulty: 'intro', stars: 360 }, [
      { currency: 'shard_sacred', amount: 1 },
    ]),
    // 9.3 Clear Sunspire Bazaar 4-10 (Hard)
    mission({ type: 'clear_stage', settlement: 4, stage: 10, difficulty: 'hard' }, [
      { currency: 'shard_sacred', amount: 1 },
    ]),
    // 9.4 Reach 50 % on Titan (Hard)
    mission(
      { type: 'boss_percent', boss: 'boss.titan', tier: 'hard', pct: 50 },
      [{ currency: 'gems', amount: 250 }],
      'glyph.cursed_eye',
    ),
    // 9.5 Have 6 gear pieces at +16 on one champion
    mission({ type: 'gear_reach_level', level: 16, count: 6, onOneChampion: true }, [
      { currency: 'mat_refining_core', amount: 30 },
    ]),
    // 9.6 Clear Ashfall Plains 7-10 (Hard)
    mission({ type: 'clear_stage', settlement: 7, stage: 10, difficulty: 'hard' }, [
      { currency: 'tome_legendary', amount: 1 },
    ]),
    // 9.7 Own 4 Legendary champions
    mission({ type: 'own_champions', count: 4, rarity: 'legendary' }, [
      { currency: 'tome_legendary', amount: 1 },
    ]),
    // 9.8 Defeat Gargoyle (Brutal)
    mission({ type: 'boss_percent', boss: 'boss.gargoyle', tier: 'brutal', pct: 100 }, [
      { currency: 'gems', amount: 300 },
    ]),
    // 9.9 Clear Duskmere Marsh 10-10 (Hard)
    mission({ type: 'clear_stage', settlement: 10, stage: 10, difficulty: 'hard' }, [
      { currency: 'shard_sacred', amount: 1 },
    ]),
    // 9.10 Earn all 360 stars in Normal
    mission({ type: 'difficulty_stars', difficulty: 'normal', stars: 360 }, [
      { currency: 'shard_primordial', amount: 1 },
    ]),
    // 9.11 Reach chronicle level 60
    mission({ type: 'player_level', level: 60 }, [{ currency: 'energy', amount: 800 }]),
    // 9.12 Defeat The Gatekeeper (12-10 Hard)
    mission({ type: 'clear_stage', settlement: 12, stage: 10, difficulty: 'hard' }, [
      { currency: 'shard_primordial', amount: 1 },
      { currency: 'gems', amount: 400 },
    ]),
  ],
  chest: {
    currencies: [
      { currency: 'shard_primordial', amount: 1 },
      { currency: 'tome_legendary', amount: 1 },
    ],
  },
});
