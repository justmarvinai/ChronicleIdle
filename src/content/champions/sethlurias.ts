import { defineChampion, hit, status, tm, up } from './dsl';

/** Epic Justice offensive support: ATK Up and TM for the team, heal reduction on foes (CHAMPIONS.md §4.4). */
export default defineChampion({
  id: 'champ.sethlurias',
  rarity: 'epic',
  element: 'justice',
  role: 'support',
  stats: [14_900, 1_060, 1_140, 102, 15, 50, 35, 30],
  art: { model: 'model.sethlurias', avatar: 'avatar.sethlurias' },
  obtain: ['summon', 'campaign_drop'],
  abilities: [
    {
      slot: 'a1',
      key: 'splinter_hex',
      icon: 'spell.blood_hex_mark',
      effects: [hit(3.2), status('weaken', 2, { chance: 30, value: 15 })],
      upgrades: [up.dmg(5), up.chance(10)],
    },
    {
      slot: 'a2',
      key: 'war_chant',
      icon: 'spell.tech_signal_horn',
      cooldown: 4,
      effects: [status('atk_up', 2, { target: 'all_allies', value: 30 }), tm(0.15, 'all_allies')],
      upgrades: [up.tm(5), up.tm(5), up.cd()],
      ai: { priority: 3, when: { waveStart: true } },
    },
    {
      slot: 'a3',
      key: 'bone_storm',
      icon: 'spell.blood_shard_burst',
      cooldown: 5,
      effects: [
        hit(2.3, 'all_enemies'),
        status('heal_reduction', 2, { target: 'all_enemies', chance: 50, value: 50 }),
      ],
      upgrades: [up.dmg(5), up.chance(15), up.cd()],
      ai: { priority: 4, when: { enemiesAlive: { gte: 2 } } },
    },
  ],
  passive: {
    key: 'old_bones',
    icon: 'spell.blood_ritualist',
    trigger: 'onWaveStart',
    effects: [tm(0.1, 'all_allies')],
  },
});
