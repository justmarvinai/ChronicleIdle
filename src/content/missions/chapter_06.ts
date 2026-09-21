/**
 * Chapter 6 — Marsh, Citadel, Gate: the last three settlements of Intro, and the Gatekeeper who opens Normal.
 *
 * The table this file prints is `docs/design/QUESTS_MISSIONS.md` §4; the lines themselves live in
 * `src/i18n/en/missions.ts`, keyed by where each mission sits.
 */
import { chapter, mission } from './dsl';

export default chapter({
  index: 6,
  missions: [
    // 6.1 Clear Duskmere Marsh 10-5
    mission({ type: 'clear_stage', settlement: 10, stage: 5, difficulty: 'intro' }, [
      { currency: 'gold', amount: 20_000 },
    ]),
    // 6.2 Craft 5 gear pieces
    mission({ type: 'craft', count: 5 }, [{ currency: 'mat_ember_alloy', amount: 20 }]),
    // 6.3 Refine a gear piece
    mission({ type: 'gear_refine_times', count: 1 }, [{ currency: 'mat_refining_core', amount: 10 }]),
    // 6.4 Defeat Old Grandmother Mire (10-10)
    mission({ type: 'clear_stage', settlement: 10, stage: 10, difficulty: 'intro' }, [
      { currency: 'shard_ancient', amount: 1 },
    ]),
    // 6.5 Deal 5,000,000 damage to Gargoyle (Hard) in a day
    mission({ type: 'boss_damage', boss: 'boss.gargoyle', tier: 'hard', amount: 5_000_000 }, [
      { currency: 'gems', amount: 80 },
    ]),
    // 6.6 Clear Ironcrag Citadel 11-5
    mission({ type: 'clear_stage', settlement: 11, stage: 5, difficulty: 'intro' }, [
      { currency: 'gold', amount: 25_000 },
    ]),
    // 6.7 Bring a champion to 6★
    mission({ type: 'champion_reach_stars', stars: 6, count: 1 }, [{ currency: 'gold', amount: 100_000 }]),
    // 6.8 Defeat Castellan Vaughn (11-10)
    mission({ type: 'clear_stage', settlement: 11, stage: 10, difficulty: 'intro' }, [
      { currency: 'shard_sacred', amount: 1 },
    ]),
    // 6.9 Own 3 Epic champions
    mission({ type: 'own_champions', count: 3, rarity: 'epic' }, [{ currency: 'tome_epic', amount: 2 }]),
    // 6.10 Clear The Eclipse Gate 12-5
    mission({ type: 'clear_stage', settlement: 12, stage: 5, difficulty: 'intro' }, [
      { currency: 'gold', amount: 30_000 },
    ]),
    // 6.11 Reach chronicle level 30
    mission({ type: 'player_level', level: 30 }, [{ currency: 'energy', amount: 500 }]),
    // 6.12 Defeat The Gatekeeper (12-10 Intro)
    mission({ type: 'clear_stage', settlement: 12, stage: 10, difficulty: 'intro' }, [
      { currency: 'shard_primordial', amount: 1 },
      { currency: 'gems', amount: 100 },
    ]),
  ],
  chest: { currencies: [{ currency: 'shard_primordial', amount: 1 }] },
});
