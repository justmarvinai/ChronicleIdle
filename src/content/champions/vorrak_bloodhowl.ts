import { defineChampion, hit, leech, status, tm, up } from './dsl';

/** Legendary Valor AoE nuker with leech and a self-priming apex turn (CHAMPIONS.md §4.5). */
export default defineChampion({
  id: 'champ.vorrak_bloodhowl',
  rarity: 'legendary',
  element: 'valor',
  role: 'attack',
  stats: [15_400, 1_720, 960, 100, 20, 70, 25, 0],
  art: { placeholderTint: '#b8332e' },
  obtain: ['summon'],
  abilities: [
    {
      slot: 'a1',
      key: 'ragged_bite',
      icon: 'spell.hunt_dire_wolf',
      effects: [hit(3.5), leech(20)],
      upgrades: [up.dmg(5), up.dmg(5)],
    },
    {
      slot: 'a2',
      key: 'bloodhowl',
      icon: 'spell.blood_cursed_beast',
      cooldown: 4,
      effects: [hit(3.1, 'all_enemies'), status('bleed', 2, { target: 'all_enemies', chance: 50, value: 5 })],
      upgrades: [up.dmg(5), up.chance(10), up.cd()],
      ai: { priority: 3, when: { enemiesAlive: { gte: 2 } } },
    },
    {
      slot: 'a3',
      key: 'feeding_frenzy',
      icon: 'spell.hunt_beast_pack',
      cooldown: 5,
      effects: [hit(2.2, 'all_enemies', { hits: 2, extendOnKill: { maxHits: 5 } })],
      upgrades: [up.dmg(5), up.dmg(5), up.cd()],
      ai: { priority: 4, when: { enemiesAlive: { gte: 2 } } },
    },
    {
      slot: 'a4',
      key: 'apex_predator',
      icon: 'spell.blood_crimson_moon',
      cooldown: 6,
      effects: [
        status('atk_up', 2, { target: 'self', value: 50 }),
        status('crit_rate_up', 2, { target: 'self', value: 30 }),
        tm(1, 'self'),
      ],
      upgrades: [up.cd(), up.cd(), up.duration()],
      ai: { priority: 5, when: { waveStart: true } },
    },
  ],
  passive: {
    key: 'scent_of_blood',
    icon: 'spell.blood_bleeding_knife',
    trigger: 'static',
    effects: [{ kind: 'damage_bonus', value: 0.1, if: { targetHpBelow: 50 } }],
  },
  aura: {
    key: 'pack_aura',
    icon: 'spell.hero_brute',
    effects: [{ kind: 'stat_mod', stat: 'atk', percent: 20 }],
  },
});
