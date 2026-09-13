import { heal, hit, status } from '@content/champions/dsl';
import { defineEnemy } from '@content/enemies/dsl';
import { defineFaction } from '@content/enemies/faction';

/** Settlement 2 — Millbrook Fields: farmland gone wrong, beasts swollen with blight. */
const boss = defineEnemy({
  id: 'enemy.sow_of_millbrook',
  archetype: 'boss',
  element: 'faith',
  role: 'health',
  stats: [1_825, 80, 70, 84, 15, 60, 40, 30],
  art: { tint: '#7d8b4a', scale: 1.4 },
  abilities: [
    {
      slot: 'a1',
      key: 'gore',
      icon: 'spell.skill_iron_fist',
      effects: [hit(3.0), status('bleed', 2, { chance: 40, value: 5 })],
    },
    {
      slot: 'a2',
      key: 'trample',
      icon: 'spell.skill_titan_fist',
      cooldown: 3,
      effects: [hit(2.6, 'all_enemies'), status('stun', 1, { target: 'all_enemies', chance: 25 })],
    },
    {
      slot: 'a3',
      key: 'blighted_vigour',
      icon: 'spell.fx_lotus_spring',
      cooldown: 5,
      startsOnCooldown: true,
      effects: [heal(0.25, 'self'), status('atk_up', 3, { target: 'self', value: 50 })],
    },
  ],
  boss: {
    rotation: ['a1', 'a1', 'a2', 'a3'],
    immunities: ['stun', 'freeze', 'sleep', 'provoke'],
    enrageAfterTurn: 10,
    damageTakenMult: 1,
  },
});

export default defineFaction({
  slug: 'blighted_wildlife',
  element: 'faith',
  tint: '#8fa05a',
  units: [
    { slug: 'blight_wolf', archetype: 'raider' },
    { slug: 'quill_shrike', archetype: 'marksman' },
    { slug: 'rotting_bull', archetype: 'brute' },
    { slug: 'bark_elder', archetype: 'warden' },
    { slug: 'spore_crone', archetype: 'hexer', element: 'eclipse' },
    { slug: 'hollow_doe', archetype: 'mender' },
  ],
  boss,
});
