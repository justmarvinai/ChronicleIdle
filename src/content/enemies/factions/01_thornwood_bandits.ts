import { hit, leech, status } from '@content/champions/dsl';
import { defineEnemy } from '@content/enemies/dsl';
import { defineFaction } from '@content/enemies/faction';

/** Settlement 1 — Thornwood Crossing: highwaymen on a forest road (docs/design/CAMPAIGN.md §6). */
const boss = defineEnemy({
  id: 'enemy.redcap_halvar',
  archetype: 'boss',
  element: 'valor',
  role: 'health',
  stats: [2_600, 130, 110, 86, 15, 60, 40, 30],
  art: { tint: '#8b1a1a', scale: 1.35 },
  abilities: [
    { slot: 'a1', key: 'red_hatchet', icon: 'spell.weapon_hatchet', effects: [hit(3.2)] },
    {
      slot: 'a2',
      key: 'toll_of_blood',
      icon: 'spell.blood_sanguine_blade',
      cooldown: 3,
      effects: [hit(3.6), leech(30)],
    },
    {
      slot: 'a3',
      key: 'kings_ransom',
      icon: 'spell.skill_whirlwind',
      cooldown: 5,
      startsOnCooldown: true,
      effects: [
        hit(3.4, 'all_enemies'),
        status('weaken', 2, { target: 'all_enemies', chance: 60, value: 25 }),
      ],
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
  slug: 'thornwood_bandits',
  element: 'valor',
  tint: '#6b7f3a',
  units: [
    { slug: 'thornwood_cutpurse', archetype: 'raider' },
    { slug: 'thornwood_poacher', archetype: 'marksman' },
    { slug: 'thornwood_ox_bandit', archetype: 'brute' },
    { slug: 'thornwood_shieldbearer', archetype: 'warden' },
    { slug: 'thornwood_hedge_hexer', archetype: 'hexer', element: 'eclipse' },
    { slug: 'thornwood_camp_medic', archetype: 'mender', element: 'faith' },
  ],
  boss,
});
