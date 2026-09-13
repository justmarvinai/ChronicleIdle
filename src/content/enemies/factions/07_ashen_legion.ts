import { extraTurn, hit, status } from '@content/champions/dsl';
import { defineEnemy } from '@content/enemies/dsl';
import { defineFaction } from '@content/enemies/faction';

/** Settlement 7 — Ashfall Plains: a legion still fighting a war that burned out. */
const boss = defineEnemy({
  id: 'enemy.warbrand_ulgrim',
  archetype: 'boss',
  element: 'valor',
  role: 'attack',
  stats: [2_200, 170, 100, 98, 15, 60, 40, 30],
  art: { tint: '#c04a22', scale: 1.34 },
  abilities: [
    {
      slot: 'a1',
      key: 'ashen_cut',
      icon: 'spell.weapon_flameblade',
      effects: [hit(3.1), status('burn', 2, { chance: 50, value: 4 })],
    },
    {
      slot: 'a2',
      key: 'warbrand_frenzy',
      icon: 'spell.skill_whirlwind',
      cooldown: 3,
      effects: [hit(2.0, { random_enemies: 3 }), extraTurn({ targetHpBelow: 30 })],
    },
    {
      slot: 'a3',
      key: 'pyre_of_the_fallen',
      icon: 'spell.fx_molten_core',
      cooldown: 5,
      startsOnCooldown: true,
      effects: [
        hit(3.8, 'all_enemies'),
        status('burn', 3, { target: 'all_enemies', chance: 80, value: 4 }),
        status('atk_up', 3, { target: 'self', value: 25 }),
      ],
    },
  ],
  boss: {
    rotation: ['a1', 'a2', 'a1', 'a3'],
    immunities: ['stun', 'freeze', 'sleep', 'provoke', 'fear'],
    enrageAfterTurn: 10,
    damageTakenMult: 1,
  },
});

export default defineFaction({
  slug: 'ashen_legion',
  element: 'valor',
  tint: '#b8563a',
  units: [
    { slug: 'ash_legionary', archetype: 'raider' },
    { slug: 'cinder_archer', archetype: 'marksman' },
    { slug: 'slag_bruiser', archetype: 'brute' },
    { slug: 'legion_bulwark', archetype: 'warden' },
    { slug: 'emberbinder', archetype: 'hexer', element: 'eclipse' },
    { slug: 'pyre_warden', archetype: 'mender', element: 'faith' },
  ],
  boss,
});
