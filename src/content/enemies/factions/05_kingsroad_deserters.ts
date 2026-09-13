import { hit, status } from '@content/champions/dsl';
import { defineEnemy } from '@content/enemies/dsl';
import { defineFaction } from '@content/enemies/faction';

/** Settlement 5 — The Old Kingsroad: soldiers who walked away from their oaths. */
const boss = defineEnemy({
  id: 'enemy.ser_dagan',
  archetype: 'boss',
  element: 'valor',
  role: 'defense',
  stats: [2_100, 120, 200, 90, 15, 60, 40, 30],
  art: { tint: '#a05a3a', scale: 1.32 },
  abilities: [
    {
      slot: 'a1',
      key: 'oathbreakers_edge',
      icon: 'spell.weapon_longsword_red',
      effects: [hit(2.8, 'single_enemy', { stat: 'DEF' })],
    },
    {
      slot: 'a2',
      key: 'broken_vow',
      icon: 'spell.crest_warded_shield',
      cooldown: 3,
      effects: [
        status('def_up', 3, { target: 'self', value: 60 }),
        status('counter', 2, { target: 'self' }),
        status('provoke', 1, { target: 'all_enemies', chance: 100 }),
      ],
    },
    {
      slot: 'a3',
      key: 'execution_order',
      icon: 'spell.skill_crushing_grip',
      cooldown: 5,
      startsOnCooldown: true,
      effects: [
        hit(6.2, 'single_enemy', { stat: 'DEF' }),
        status('heal_reduction', 2, { chance: 80, value: 50 }),
      ],
    },
  ],
  boss: {
    rotation: ['a2', 'a1', 'a1', 'a3'],
    immunities: ['stun', 'freeze', 'sleep', 'provoke', 'fear'],
    enrageAfterTurn: 14,
    damageTakenMult: 1,
  },
});

export default defineFaction({
  slug: 'kingsroad_deserters',
  element: 'valor',
  tint: '#9a6a42',
  units: [
    { slug: 'deserter_blade', archetype: 'raider' },
    { slug: 'turncoat_crossbow', archetype: 'marksman' },
    { slug: 'road_breaker', archetype: 'brute' },
    { slug: 'oathless_guard', archetype: 'warden' },
    { slug: 'camp_charlatan', archetype: 'hexer', element: 'eclipse' },
    { slug: 'field_chirurgeon', archetype: 'mender', element: 'faith' },
  ],
  boss,
});
