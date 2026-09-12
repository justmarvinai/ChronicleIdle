import { defineChampion, hit, status, up } from './dsl';

/** Uncommon Eclipse attacker — the lizardfolk whose model every placeholder borrows (CHAMPIONS.md §4.2). */
export default defineChampion({
  id: 'champ.mire_stalker',
  rarity: 'uncommon',
  element: 'eclipse',
  role: 'attack',
  stats: [10_200, 1_200, 700, 104, 15, 55, 20, 10],
  art: { placeholderTint: '#4f7a3a' },
  obtain: ['summon', 'campaign_drop'],
  abilities: [
    {
      slot: 'a1',
      key: 'venom_bite',
      icon: 'spell.hunt_venom_dart',
      effects: [hit(3.3), status('poison', 2, { chance: 30, value: 5 })],
      upgrades: [up.dmg(5), up.chance(10)],
    },
    {
      slot: 'a2',
      key: 'ambush',
      icon: 'spell.hunt_prowling_cat',
      cooldown: 4,
      effects: [hit(5.4, 'single_enemy', { critBonus: 20 })],
      upgrades: [up.dmg(5), up.dmg(5), up.dmg(10)],
      ai: { priority: 3 },
    },
  ],
});
