import { hit, status, tm } from '@content/champions/dsl';
import { defineEnemy } from '@content/enemies/dsl';
import { defineFaction } from '@content/enemies/faction';

/** Settlement 3 — Greyhaven Harbor: privateers who took the port for themselves. */
const boss = defineEnemy({
  id: 'enemy.captain_morwenna',
  archetype: 'boss',
  element: 'justice',
  role: 'attack',
  stats: [2_000, 160, 95, 96, 15, 60, 40, 30],
  art: { tint: '#3f7fa0', scale: 1.3 },
  abilities: [
    {
      slot: 'a1',
      key: 'cutlass_dance',
      icon: 'spell.weapon_broadsword',
      effects: [hit(2.1, 'single_enemy', { hits: 2 })],
    },
    {
      slot: 'a2',
      key: 'grapeshot',
      icon: 'spell.hunt_arrow_storm',
      cooldown: 3,
      effects: [
        hit(2.4, 'all_enemies'),
        status('spd_down', 2, { target: 'all_enemies', chance: 50, value: 25 }),
      ],
    },
    {
      slot: 'a3',
      key: 'signal_the_fleet',
      icon: 'spell.crest_warmark',
      cooldown: 4,
      startsOnCooldown: true,
      effects: [tm(0.35, 'all_allies'), status('spd_up', 2, { target: 'all_allies', value: 30 })],
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
  slug: 'greyhaven_corsairs',
  element: 'justice',
  tint: '#4a7ca8',
  units: [
    { slug: 'corsair_cutlass', archetype: 'raider' },
    { slug: 'corsair_gunner', archetype: 'marksman' },
    { slug: 'corsair_boatswain', archetype: 'brute' },
    { slug: 'corsair_deck_warden', archetype: 'warden' },
    { slug: 'corsair_tide_hexer', archetype: 'hexer', element: 'eclipse' },
    { slug: 'corsair_surgeon', archetype: 'mender', element: 'faith' },
  ],
  boss,
});
