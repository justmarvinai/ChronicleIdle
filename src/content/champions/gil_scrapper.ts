import { defineChampion, hit, up } from './dsl';

/** Common Valor attacker: rank-up food with a single cleave (CHAMPIONS.md §4.1). */
export default defineChampion({
  id: 'champ.gil_scrapper',
  rarity: 'common',
  element: 'valor',
  role: 'attack',
  stats: [9_200, 1_010, 640, 96, 15, 50, 20, 0],
  art: { placeholderTint: '#8b4a2b' },
  obtain: ['summon', 'starter'],
  abilities: [
    {
      slot: 'a1',
      key: 'rusty_cleave',
      icon: 'spell.weapon_cleaver_axe',
      effects: [hit(3.6)],
      upgrades: [up.dmg(5), up.dmg(5)],
    },
  ],
});
