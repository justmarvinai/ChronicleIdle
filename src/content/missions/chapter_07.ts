/**
 * Chapter 7 — Normal: the same twelve settlements in a heavier hand.
 *
 * The table this file prints is `docs/design/QUESTS_MISSIONS.md` §4; the lines themselves live in
 * `src/i18n/en/missions.ts`, keyed by where each mission sits.
 */
import { chapter, mission } from './dsl';

export default chapter({
  index: 7,
  missions: [
    // 7.1 Clear Thornwood Crossing 1-10 (Normal)
    mission({ type: 'clear_stage', settlement: 1, stage: 10, difficulty: 'normal' }, [
      { currency: 'gold', amount: 30_000 },
    ]),
    // 7.2 Earn all 30 stars in Thornwood Crossing (Intro)
    mission({ type: 'settlement_stars', settlement: 1, difficulty: 'intro', stars: 30 }, [
      { currency: 'gems', amount: 50 },
    ]),
    // 7.3 Level a champion to 50
    mission({ type: 'champion_reach_level', level: 50, count: 1 }, [
      { currency: 'brew_universal', amount: 10 },
    ]),
    // 7.4 Equip 6 gear pieces of 4★ or better on one champion
    mission({ type: 'equip_pieces', count: 6, minStars: 4 }, [{ currency: 'mat_refining_core', amount: 15 }]),
    // 7.5 Clear Sunspire Bazaar 4-10 (Normal)
    mission({ type: 'clear_stage', settlement: 4, stage: 10, difficulty: 'normal' }, [
      { currency: 'shard_ancient', amount: 1 },
    ]),
    // 7.6 Reach 12 % on Titan (Normal)
    mission(
      { type: 'boss_percent', boss: 'boss.titan', tier: 'normal', pct: 12 },
      [{ currency: 'gems', amount: 100 }],
      'glyph.cursed_eye',
    ),
    // 7.7 Craft a Tier III gear piece
    mission({ type: 'craft', count: 1, tier: 'star' }, [{ currency: 'mat_starsteel', amount: 10 }]),
    // 7.8 Clear Barrowdeep 6-10 (Normal)
    mission({ type: 'clear_stage', settlement: 6, stage: 10, difficulty: 'normal' }, [
      { currency: 'shard_sacred', amount: 1 },
    ]),
    // 7.9 Upgrade a gear piece to +16
    mission({ type: 'gear_reach_level', level: 16, count: 1 }, [
      { currency: 'mat_refining_core', amount: 20 },
    ]),
    // 7.10 Own 2 Legendary champions
    mission({ type: 'own_champions', count: 2, rarity: 'legendary' }, [
      { currency: 'tome_legendary', amount: 1 },
    ]),
    // 7.11 Clear Ashfall Plains 7-10 (Normal)
    mission({ type: 'clear_stage', settlement: 7, stage: 10, difficulty: 'normal' }, [
      { currency: 'shard_ancient', amount: 1 },
    ]),
    // 7.12 Reach chronicle level 40
    mission({ type: 'player_level', level: 40 }, [{ currency: 'gems', amount: 100 }]),
  ],
  chest: {
    currencies: [
      { currency: 'shard_primordial', amount: 1 },
      { currency: 'gems', amount: 200 },
    ],
  },
});
