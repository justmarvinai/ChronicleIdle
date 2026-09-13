import { heal, hit, status } from '@content/champions/dsl';
import { defineEnemy } from '@content/enemies/dsl';
import { defineFaction } from '@content/enemies/faction';

/** Settlement 10 — Duskmere Marsh: things in the water that were people once. */
const boss = defineEnemy({
  id: 'enemy.grandmother_mire',
  archetype: 'boss',
  element: 'eclipse',
  role: 'support',
  stats: [2_100, 150, 130, 92, 15, 60, 45, 40],
  art: { tint: '#5f7a4a', scale: 1.36 },
  abilities: [
    {
      slot: 'a1',
      key: 'bog_grasp',
      icon: 'spell.blood_serpent_coil',
      effects: [hit(2.8), status('poison', 2, { chance: 70, value: 5 })],
    },
    {
      slot: 'a2',
      key: 'drowning_lullaby',
      icon: 'spell.blood_witch',
      cooldown: 3,
      effects: [
        status('sleep', 1, { target: 'all_enemies', chance: 40 }),
        status('heal_reduction', 2, { target: 'all_enemies', chance: 60, value: 50 }),
      ],
    },
    {
      slot: 'a3',
      key: 'the_marsh_takes',
      icon: 'spell.fx_thorn_bloom',
      cooldown: 4,
      startsOnCooldown: true,
      effects: [hit(3.4, 'all_enemies'), heal(0.2, 'self')],
    },
  ],
  boss: {
    rotation: ['a1', 'a2', 'a1', 'a3'],
    immunities: ['stun', 'freeze', 'sleep', 'provoke', 'fear'],
    enrageAfterTurn: 12,
    damageTakenMult: 1,
  },
});

export default defineFaction({
  slug: 'marsh_horrors',
  element: 'eclipse',
  tint: '#6f8a55',
  units: [
    { slug: 'bog_lurker', archetype: 'raider' },
    { slug: 'spit_toad', archetype: 'marksman' },
    { slug: 'mire_hulk', archetype: 'brute' },
    { slug: 'reed_warden', archetype: 'warden', element: 'faith' },
    { slug: 'fen_witch', archetype: 'hexer' },
    { slug: 'leech_mother', archetype: 'mender' },
  ],
  boss,
});
