import { hit, leech, status } from '@content/champions/dsl';
import { defineEnemy } from '@content/enemies/dsl';
import { defineFaction } from '@content/enemies/faction';

/** Settlement 9 — The Sunken Colosseum: champions who never stopped fighting. */
const boss = defineEnemy({
  id: 'enemy.the_undefeated',
  archetype: 'boss',
  element: 'justice',
  role: 'attack',
  stats: [2_300, 175, 130, 100, 20, 70, 40, 35],
  art: { tint: '#d9c07a', scale: 1.34 },
  abilities: [
    {
      slot: 'a1',
      key: 'crowd_pleaser',
      icon: 'spell.weapon_longsword_gold',
      effects: [hit(1.9, 'single_enemy', { hits: 2 }), leech(20)],
    },
    {
      slot: 'a2',
      key: 'first_blood',
      icon: 'spell.hunt_gilded_blade',
      cooldown: 3,
      effects: [hit(5.0), status('bleed', 2, { chance: 70, value: 5 })],
      ai: { priority: 3, prefer: 'lowest_hp_percent' },
    },
    {
      slot: 'a3',
      key: 'undefeated',
      icon: 'spell.crest_gilded_crown',
      cooldown: 5,
      startsOnCooldown: true,
      effects: [
        status('crit_rate_up', 3, { target: 'self', value: 30 }),
        status('revive_on_death', 3, { target: 'self' }),
        hit(3.2, 'all_enemies'),
      ],
    },
  ],
  boss: {
    rotation: ['a1', 'a2', 'a3', 'a1'],
    immunities: ['stun', 'freeze', 'sleep', 'provoke', 'fear'],
    enrageAfterTurn: 10,
    damageTakenMult: 1,
  },
});

export default defineFaction({
  slug: 'gladiator_shades',
  element: 'justice',
  tint: '#c9b477',
  units: [
    { slug: 'shade_duelist', archetype: 'raider' },
    { slug: 'net_caster', archetype: 'marksman' },
    { slug: 'arena_colossus', archetype: 'brute' },
    { slug: 'shield_champion', archetype: 'warden' },
    { slug: 'crowd_whisperer', archetype: 'hexer', element: 'eclipse' },
    { slug: 'arena_physician', archetype: 'mender', element: 'faith' },
  ],
  boss,
});
