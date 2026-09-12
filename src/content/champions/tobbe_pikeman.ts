import { defineChampion, hit, up } from './dsl';

/** Uncommon Justice attacker: thrust and a line charge on everyone (CHAMPIONS.md §4.2). */
export default defineChampion({
  id: 'champ.tobbe_pikeman',
  rarity: 'uncommon',
  element: 'justice',
  role: 'attack',
  stats: [10_600, 1_160, 720, 98, 15, 50, 20, 0],
  art: { placeholderTint: '#8a97a8' },
  obtain: ['summon', 'campaign_drop'],
  abilities: [
    {
      slot: 'a1',
      key: 'pike_thrust',
      icon: 'spell.weapon_longsword_gold',
      effects: [hit(3.5)],
      upgrades: [up.dmg(5), up.dmg(5)],
    },
    {
      slot: 'a2',
      key: 'line_charge',
      icon: 'spell.hero_vanguard',
      cooldown: 4,
      effects: [hit(2.4, 'all_enemies')],
      upgrades: [up.dmg(5), up.dmg(5), up.cd()],
      ai: { priority: 3, when: { enemiesAlive: { gte: 2 } } },
    },
  ],
});
