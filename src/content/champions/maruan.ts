import { defineChampion, heal, hit, status, up } from './dsl';

/** Epic Faith healer-buffer: team heal, regen for the weakest, debuff block (CHAMPIONS.md §4.4). */
export default defineChampion({
  id: 'champ.maruan',
  rarity: 'epic',
  element: 'faith',
  role: 'support',
  stats: [15_300, 1_090, 1_110, 106, 15, 50, 30, 20],
  art: { model: 'model.maruan', avatar: 'avatar.maruan' },
  obtain: ['summon'],
  abilities: [
    {
      slot: 'a1',
      key: 'starlight',
      icon: 'spell.rune_nova_star',
      effects: [hit(3.1), status('spd_down', 2, { chance: 25, value: 15 })],
      upgrades: [up.dmg(5), up.chance(10)],
    },
    {
      slot: 'a2',
      key: 'constellation',
      icon: 'spell.rune_starfall',
      cooldown: 4,
      effects: [heal(0.2, 'all_allies'), status('regen', 2, { target: 'lowest_hp_allies_2' })],
      upgrades: [up.heal(5), up.heal(5), up.cd()],
      ai: { priority: 3, when: { alliesBelowHp: { percent: 65, count: 1 } } },
    },
    {
      slot: 'a3',
      key: 'astral_ward',
      icon: 'spell.tech_energy_shield',
      cooldown: 5,
      effects: [
        status('block_debuffs', 2, { target: 'all_allies' }),
        status('crit_rate_up', 2, { target: 'all_allies', value: 20 }),
      ],
      upgrades: [up.duration(), up.cd(), up.cd()],
      ai: { priority: 4, when: { waveStart: true } },
    },
  ],
  passive: {
    key: 'guiding_star',
    icon: 'spell.earth_star_medallion',
    trigger: 'onHeal',
    effects: [{ kind: 'on_heal_grant', status: 'atk_up', value: 8, turns: 1 }],
  },
});
