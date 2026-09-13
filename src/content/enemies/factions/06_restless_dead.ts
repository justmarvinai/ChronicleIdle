import { hit, revive, status } from '@content/champions/dsl';
import { defineEnemy } from '@content/enemies/dsl';
import { defineFaction } from '@content/enemies/faction';

/** Settlement 6 — Barrowdeep: a tomb whose occupants refuse to stay in it. */
const boss = defineEnemy({
  id: 'enemy.barrow_wight',
  archetype: 'boss',
  element: 'eclipse',
  role: 'support',
  stats: [1_300, 95, 80, 94, 15, 60, 40, 40],
  art: { tint: '#6f7d8c', scale: 1.32 },
  abilities: [
    {
      slot: 'a1',
      key: 'grave_touch',
      icon: 'spell.blood_soul_ribbon',
      effects: [hit(2.9), status('atk_down', 2, { chance: 60, value: 25 })],
    },
    {
      slot: 'a2',
      key: 'barrow_chill',
      icon: 'spell.hunt_frost_bolt',
      cooldown: 3,
      effects: [hit(2.4, 'all_enemies'), status('freeze', 1, { target: 'all_enemies', chance: 35 })],
    },
    {
      slot: 'a3',
      key: 'call_the_barrow',
      icon: 'spell.blood_necromancer',
      cooldown: 5,
      startsOnCooldown: true,
      effects: [revive('all_allies', 40), status('atk_up', 2, { target: 'all_allies', value: 50 })],
    },
  ],
  boss: {
    rotation: ['a1', 'a2', 'a3', 'a1'],
    immunities: ['stun', 'freeze', 'sleep', 'provoke', 'fear'],
    enrageAfterTurn: 12,
    damageTakenMult: 1,
  },
});

export default defineFaction({
  slug: 'restless_dead',
  element: 'eclipse',
  tint: '#8d93a0',
  units: [
    { slug: 'grave_husk', archetype: 'raider' },
    { slug: 'bone_fletcher', archetype: 'marksman' },
    { slug: 'barrow_ghoul', archetype: 'brute' },
    { slug: 'tomb_sentinel', archetype: 'warden' },
    { slug: 'crypt_whisperer', archetype: 'hexer' },
    { slug: 'grave_tender', archetype: 'mender', element: 'faith' },
  ],
  boss,
});
