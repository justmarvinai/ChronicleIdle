import { defineChampion, hit, up } from './dsl';

/** Common Justice defender: DEF-scaling jab (CHAMPIONS.md §4.1). */
export default defineChampion({
  id: 'champ.bran_militia',
  rarity: 'common',
  element: 'justice',
  role: 'defense',
  stats: [11_600, 660, 980, 92, 15, 50, 25, 0],
  art: { placeholderTint: '#c9932e' },
  obtain: ['summon', 'starter', 'campaign_drop'],
  abilities: [
    {
      slot: 'a1',
      key: 'shield_jab',
      icon: 'spell.crest_stone_guard',
      effects: [hit(3.0, 'single_enemy', { stat: 'DEF' })],
      upgrades: [up.dmg(5), up.dmg(5)],
    },
  ],
});
