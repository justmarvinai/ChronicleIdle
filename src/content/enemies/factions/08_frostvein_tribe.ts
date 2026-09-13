import { hit, status } from '@content/champions/dsl';
import { defineEnemy } from '@content/enemies/dsl';
import { defineFaction } from '@content/enemies/faction';

/** Settlement 8 — Frostvein Pass: a mountain tribe that fights with the cold. */
const boss = defineEnemy({
  id: 'enemy.yrsa_frostmaw',
  archetype: 'boss',
  element: 'faith',
  role: 'health',
  stats: [3_000, 135, 120, 88, 15, 60, 40, 30],
  art: { tint: '#6fa8c8', scale: 1.4 },
  abilities: [
    {
      slot: 'a1',
      key: 'frostmaw_swipe',
      icon: 'spell.weapon_frost_axe',
      effects: [hit(3.0), status('spd_down', 2, { chance: 50, value: 25 })],
    },
    {
      slot: 'a2',
      key: 'white_out',
      icon: 'spell.fx_frost_comet',
      cooldown: 3,
      effects: [hit(2.6, 'all_enemies'), status('freeze', 1, { target: 'all_enemies', chance: 40 })],
    },
    {
      slot: 'a3',
      key: 'hearth_of_the_pass',
      icon: 'spell.crest_ember_shield',
      cooldown: 4,
      startsOnCooldown: true,
      effects: [
        status('shield', 3, { target: 'all_allies', value: 25 }),
        status('block_debuffs', 2, { target: 'self' }),
      ],
    },
  ],
  boss: {
    rotation: ['a1', 'a2', 'a3', 'a1'],
    immunities: ['stun', 'freeze', 'sleep', 'provoke', 'fear'],
    enrageAfterTurn: 14,
    damageTakenMult: 1,
  },
});

export default defineFaction({
  slug: 'frostvein_tribe',
  element: 'faith',
  tint: '#7fb0cc',
  units: [
    { slug: 'frost_reaver', archetype: 'raider' },
    { slug: 'icicle_thrower', archetype: 'marksman' },
    { slug: 'mammoth_rider', archetype: 'brute' },
    { slug: 'glacier_guard', archetype: 'warden' },
    { slug: 'rime_shaman', archetype: 'hexer', element: 'eclipse' },
    { slug: 'hearth_keeper', archetype: 'mender' },
  ],
  boss,
});
