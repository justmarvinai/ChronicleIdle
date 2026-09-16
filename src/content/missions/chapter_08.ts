/**
 * Chapter 8 — The Long March: Normal to its end, and the Gatekeeper who opens Hard.
 *
 * The table this file prints is `docs/design/QUESTS_MISSIONS.md` §4; the lines themselves live in
 * `src/i18n/en/missions.ts`, keyed by where each mission sits.
 */
import { chapter, mission } from './dsl';

export default chapter({
  index: 8,
  missions: [
    // 8.1 Clear Frostvein Pass 8-10 (Normal)
    mission({ type: 'clear_stage', settlement: 8, stage: 10, difficulty: 'normal' }, [
      { currency: 'gold', amount: 40_000 },
    ]),
    // 8.2 Deal 20,000,000 damage to Gravemaw (Brutal) in a day
    mission({ type: 'boss_damage', boss: 'boss.gravemaw', tier: 'brutal', amount: 20_000_000 }, [
      { currency: 'gems', amount: 150 },
    ]),
    // 8.3 Level a champion to 60
    mission({ type: 'champion_reach_level', level: 60, count: 1 }, [
      { currency: 'brew_universal', amount: 15 },
    ]),
    // 8.4 Clear The Sunken Colosseum 9-10 (Normal)
    mission({ type: 'clear_stage', settlement: 9, stage: 10, difficulty: 'normal' }, [
      { currency: 'shard_sacred', amount: 1 },
    ]),
    // 8.5 Reach 25 % on Nyxara (Hard)
    mission(
      { type: 'boss_percent', boss: 'boss.nyxara', tier: 'hard', pct: 25 },
      [
        { currency: 'mat_glyph_sigil', amount: 1 },
        { currency: 'gems', amount: 100 },
      ],
      'glyph.cursed_eye',
    ),
    // 8.6 Clear Duskmere Marsh 10-10 (Normal)
    mission({ type: 'clear_stage', settlement: 10, stage: 10, difficulty: 'normal' }, [
      { currency: 'shard_ancient', amount: 1 },
    ]),
    // 8.7 Own 20 champions
    mission({ type: 'own_champions', count: 20 }, [{ currency: 'tome_legendary', amount: 2 }]),
    // 8.8 Clear Ironcrag Citadel 11-10 (Normal)
    mission({ type: 'clear_stage', settlement: 11, stage: 10, difficulty: 'normal' }, [
      { currency: 'shard_sacred', amount: 1 },
    ]),
    // 8.9 Have 3 champions at 6★
    mission({ type: 'champion_reach_stars', stars: 6, count: 3 }, [{ currency: 'gold', amount: 150_000 }]),
    // 8.10 Earn 200 stars in Normal
    mission({ type: 'difficulty_stars', difficulty: 'normal', stars: 200 }, [
      { currency: 'gems', amount: 200 },
    ]),
    // 8.11 Reach chronicle level 50
    mission({ type: 'player_level', level: 50 }, [{ currency: 'energy', amount: 600 }]),
    // 8.12 Defeat The Gatekeeper (12-10 Normal)
    mission({ type: 'clear_stage', settlement: 12, stage: 10, difficulty: 'normal' }, [
      { currency: 'shard_primordial', amount: 1 },
      { currency: 'gems', amount: 200 },
    ]),
  ],
  chest: {
    currencies: [
      { currency: 'shard_sacred', amount: 2 },
      { currency: 'tome_legendary', amount: 1 },
    ],
  },
});
