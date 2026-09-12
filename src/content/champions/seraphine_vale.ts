import { cleanse, defineChampion, heal, hit, revive, status, up } from './dsl';

/** Legendary Faith healer with revives and a halo that never stops (CHAMPIONS.md §4.5). */
export default defineChampion({
  id: 'champ.seraphine_vale',
  rarity: 'legendary',
  element: 'faith',
  role: 'support',
  stats: [16_800, 1_180, 1_200, 108, 15, 50, 40, 20],
  art: { placeholderTint: '#f4e2a8' },
  obtain: ['summon'],
  abilities: [
    {
      slot: 'a1',
      key: 'grace',
      icon: 'spell.fire_golden_flame',
      effects: [hit(3.0), status('heal_reduction', 2, { chance: 30, value: 50 })],
      upgrades: [up.dmg(5), up.dmg(5)],
    },
    {
      slot: 'a2',
      key: 'renewal',
      icon: 'spell.earth_crystal_bloom',
      cooldown: 4,
      effects: [heal(0.25, 'all_allies'), cleanse('all_allies', 2)],
      upgrades: [up.heal(5), up.heal(5), up.cd()],
      ai: { priority: 3, when: { alliesBelowHp: { percent: 70, count: 1 } } },
    },
    {
      slot: 'a3',
      key: 'guardian_wings',
      icon: 'spell.hunt_bird_flight',
      cooldown: 5,
      effects: [status('revive_on_death', 2, { target: 'all_allies', value: 30 })],
      upgrades: [up.cd(), up.cd(), up.duration()],
      ai: { priority: 4, when: { alliesBelowHp: { percent: 40, count: 1 } } },
    },
    {
      slot: 'a4',
      key: 'ascension',
      icon: 'spell.fire_phoenix_rise',
      cooldown: 7,
      effects: [
        revive('all_dead_allies', 50),
        heal(0.2, 'all_allies'),
        status('block_debuffs', 2, { target: 'all_allies' }),
      ],
      upgrades: [up.heal(10), up.cd(), up.cd()],
      ai: { priority: 5 },
    },
  ],
  passive: {
    key: 'halo',
    icon: 'spell.earth_sunstone_ring',
    trigger: 'onTurnStart',
    effects: [heal(0.05, 'lowest_hp_ally')],
  },
  aura: {
    key: 'grace_aura',
    icon: 'spell.fire_phoenix_flight',
    effects: [{ kind: 'stat_mod', stat: 'hp', percent: 15 }],
  },
});
