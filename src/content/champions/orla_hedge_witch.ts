import { defineChampion, heal, hit, status, up } from './dsl';

/** Uncommon Faith support: a slowing whip and a poultice (CHAMPIONS.md §4.2). */
export default defineChampion({
  id: 'champ.orla_hedge_witch',
  rarity: 'uncommon',
  element: 'faith',
  role: 'support',
  stats: [11_800, 880, 880, 102, 15, 50, 30, 10],
  art: { placeholderTint: '#6f8f3a' },
  obtain: ['summon'],
  abilities: [
    {
      slot: 'a1',
      key: 'thorn_whip',
      icon: 'spell.fx_vine_lash',
      effects: [hit(3.2), status('spd_down', 2, { chance: 25, value: 15 })],
      upgrades: [up.dmg(5), up.chance(10)],
    },
    {
      slot: 'a2',
      key: 'poultice',
      icon: 'spell.tech_alchemy_pour',
      cooldown: 4,
      effects: [heal(0.25, 'lowest_hp_ally', 'CASTER_MAX_HP')],
      upgrades: [up.heal(10), up.heal(10), up.cd()],
      ai: { priority: 3, when: { alliesBelowHp: { percent: 60, count: 1 } } },
    },
  ],
});
