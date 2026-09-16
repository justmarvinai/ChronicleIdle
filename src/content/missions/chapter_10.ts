/**
 * Chapter 10 — The Last Page: what a finished chronicle looks like, and Eldric's own reward for writing it.
 *
 * The table this file prints is `docs/design/QUESTS_MISSIONS.md` §4; the lines themselves live in
 * `src/i18n/en/missions.ts`, keyed by where each mission sits.
 */
import { chapter, mission } from './dsl';

export default chapter({
  index: 10,
  missions: [
    // 10.1 Have 5 champions at 6★ and level 60
    mission({ type: 'champion_reach_level', level: 60, count: 5, stars: 6 }, [
      { currency: 'gold', amount: 200_000 },
    ]),
    // 10.2 Reach 12 % on Nyxara (Nightmare)
    mission(
      { type: 'boss_percent', boss: 'boss.nyxara', tier: 'nightmare', pct: 12 },
      [{ currency: 'gems', amount: 300 }],
      'glyph.cursed_eye',
    ),
    // 10.3 Own a Mythic champion
    mission({ type: 'own_champions', count: 1, rarity: 'mythic' }, [{ currency: 'tome_mythic', amount: 1 }]),
    // 10.4 Earn 200 stars in Hard
    mission({ type: 'difficulty_stars', difficulty: 'hard', stars: 200 }, [
      { currency: 'shard_sacred', amount: 1 },
    ]),
    // 10.5 Fully upgrade every skill of a Legendary champion
    mission({ type: 'all_skills_maxed', rarity: 'legendary' }, [{ currency: 'tome_legendary', amount: 1 }]),
    // 10.6 Craft 20 Tier III gear pieces
    mission({ type: 'craft', count: 20, tier: 'star' }, [{ currency: 'mat_starsteel', amount: 30 }]),
    // 10.7 Reach 25 % on Nyxara (Nightmare)
    mission(
      { type: 'boss_percent', boss: 'boss.nyxara', tier: 'nightmare', pct: 25 },
      [{ currency: 'shard_primordial', amount: 1 }],
      'glyph.cursed_eye',
    ),
    // 10.8 Bring a party to 150,000 power
    mission({ type: 'team_power', power: 150_000 }, [{ currency: 'gems', amount: 400 }]),
    // 10.9 Earn all 360 stars in Hard
    mission({ type: 'difficulty_stars', difficulty: 'hard', stars: 360 }, [
      { currency: 'shard_primordial', amount: 1 },
    ]),
    // 10.10 Reach chronicle level 75
    mission({ type: 'player_level', level: 75 }, [{ currency: 'energy', amount: 1_000 }]),
    // 10.11 Defeat Nyxara (Nightmare)
    mission(
      { type: 'boss_percent', boss: 'boss.nyxara', tier: 'nightmare', pct: 100 },
      [
        { currency: 'tome_mythic', amount: 1 },
        { currency: 'gems', amount: 500 },
      ],
      'glyph.cursed_eye',
    ),
    // 10.12 Complete every mission before this one
    mission({ type: 'all_previous' }, [{ currency: 'gems', amount: 500 }]),
  ],
  /*
   * The Path's own reward (QUESTS_MISSIONS.md §4): Eldric puts down the quill, and the
   * chronicle names the 6★ Legendary piece he leaves with it. The last mission pays the
   * gems the design lists beside him.
   */
  chest: {
    currencies: [],
    champion: 'champ.eldric_chronicler',
    gearChoice: { rarity: 'legendary', stars: 6 },
  },
});
