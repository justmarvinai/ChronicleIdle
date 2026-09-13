import { hit, status, strip, tm } from '@content/champions/dsl';
import { defineEnemy } from '@content/enemies/dsl';
import { defineFaction } from '@content/enemies/faction';

/** Settlement 12 — The Eclipse Gate: the cult that opened the rift, and its herald. */
const boss = defineEnemy({
  id: 'enemy.the_gatekeeper',
  archetype: 'boss',
  element: 'eclipse',
  role: 'attack',
  stats: [1_700, 115, 100, 102, 20, 70, 50, 45],
  art: { tint: '#9b5de5', scale: 1.45 },
  abilities: [
    {
      slot: 'a1',
      key: 'rift_lash',
      icon: 'spell.blood_void_lance',
      effects: [hit(3.2), tm(-0.15, 'single_enemy', 60)],
    },
    {
      slot: 'a2',
      key: 'unmake',
      icon: 'spell.rune_eclipse_mark',
      cooldown: 3,
      effects: [
        strip('all_enemies', 'all'),
        hit(2.8, 'all_enemies'),
        status('block_buffs', 2, { target: 'all_enemies', chance: 60 }),
      ],
    },
    {
      slot: 'a3',
      key: 'the_gate_opens',
      icon: 'spell.blood_crimson_gate',
      cooldown: 5,
      startsOnCooldown: true,
      effects: [
        hit(4.6, 'all_enemies'),
        status('burn', 3, { target: 'all_enemies', chance: 80, value: 4 }),
        status('atk_up', 3, { target: 'self', value: 50 }),
      ],
    },
  ],
  boss: {
    rotation: ['a1', 'a2', 'a3', 'a1', 'a2'],
    immunities: ['stun', 'freeze', 'sleep', 'provoke', 'fear', 'poison'],
    enrageAfterTurn: 8,
    damageTakenMult: 1,
  },
});

export default defineFaction({
  slug: 'eclipse_cult',
  element: 'eclipse',
  tint: '#8d5bd0',
  units: [
    { slug: 'void_acolyte', archetype: 'raider' },
    { slug: 'star_caller', archetype: 'marksman' },
    { slug: 'rift_hulk', archetype: 'brute' },
    { slug: 'eclipse_warden', archetype: 'warden' },
    { slug: 'nightbinder', archetype: 'hexer' },
    { slug: 'soul_tender', archetype: 'mender', element: 'faith' },
  ],
  boss,
});
