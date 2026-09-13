import { cleanse, hit, status } from '@content/champions/dsl';
import { defineEnemy } from '@content/enemies/dsl';
import { defineFaction } from '@content/enemies/faction';

/** Settlement 11 — Ironcrag Citadel: knights who hold the last fortress, wrongly. */
const boss = defineEnemy({
  id: 'enemy.castellan_vaughn',
  archetype: 'boss',
  element: 'justice',
  role: 'defense',
  stats: [1_550, 90, 145, 94, 15, 60, 45, 35],
  art: { tint: '#9aa8c0', scale: 1.34 },
  abilities: [
    {
      slot: 'a1',
      key: 'castellans_hammer',
      icon: 'spell.weapon_warhammer',
      effects: [hit(2.9, 'single_enemy', { stat: 'DEF' }), status('def_down', 2, { chance: 50, value: 30 })],
    },
    {
      slot: 'a2',
      key: 'close_the_gate',
      icon: 'spell.crest_stone_guard',
      cooldown: 3,
      effects: [
        cleanse('all_allies', 'all'),
        status('def_up', 3, { target: 'all_allies', value: 60 }),
        status('ally_protection', 2, { target: 'all_allies', value: 40 }),
      ],
    },
    {
      slot: 'a3',
      key: 'judgement_of_ironcrag',
      icon: 'spell.rune_radiance',
      cooldown: 5,
      startsOnCooldown: true,
      effects: [
        hit(4.2, 'all_enemies', { stat: 'DEF' }),
        status('block_buffs', 2, { target: 'all_enemies', chance: 70 }),
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
  slug: 'citadel_knights',
  element: 'justice',
  tint: '#a8b4c8',
  units: [
    { slug: 'citadel_blade', archetype: 'raider' },
    { slug: 'wall_archer', archetype: 'marksman' },
    { slug: 'siege_knight', archetype: 'brute' },
    { slug: 'gate_warden', archetype: 'warden' },
    { slug: 'chapel_inquisitor', archetype: 'hexer', element: 'eclipse' },
    { slug: 'field_cleric', archetype: 'mender', element: 'faith' },
  ],
  boss,
});
