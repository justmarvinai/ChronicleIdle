import { hit, status, strip } from '@content/champions/dsl';
import { defineEnemy } from '@content/enemies/dsl';
import { defineFaction } from '@content/enemies/faction';

/** Settlement 4 — Sunspire Bazaar: a desert city under a cult that worships the eclipse. */
const boss = defineEnemy({
  id: 'enemy.high_zealot_qorath',
  archetype: 'boss',
  element: 'eclipse',
  role: 'support',
  stats: [1_225, 100, 70, 98, 15, 60, 40, 40],
  art: { tint: '#8a5fc0', scale: 1.3 },
  abilities: [
    {
      slot: 'a1',
      key: 'sun_curse',
      icon: 'spell.blood_hex_mark',
      effects: [hit(2.8), status('def_down', 2, { chance: 60, value: 30 })],
    },
    {
      slot: 'a2',
      key: 'strip_the_faithful',
      icon: 'spell.rune_obsidian_seal',
      cooldown: 3,
      effects: [strip('all_enemies', 1), status('block_buffs', 2, { target: 'all_enemies', chance: 50 })],
    },
    {
      slot: 'a3',
      key: 'eclipse_rite',
      icon: 'spell.rune_eclipse_mark',
      cooldown: 5,
      startsOnCooldown: true,
      effects: [hit(3.6, 'all_enemies'), status('burn', 3, { target: 'all_enemies', chance: 70, value: 4 })],
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
  slug: 'sand_cult',
  element: 'eclipse',
  tint: '#b08a4a',
  units: [
    { slug: 'dune_stalker', archetype: 'raider' },
    { slug: 'sling_zealot', archetype: 'marksman' },
    { slug: 'sand_colossus', archetype: 'brute' },
    { slug: 'mirror_guard', archetype: 'warden', element: 'justice' },
    { slug: 'sun_cursed', archetype: 'hexer' },
    { slug: 'oasis_keeper', archetype: 'mender', element: 'faith' },
  ],
  boss,
});
