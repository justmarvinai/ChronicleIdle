import { defineChampion, hit, status, tm, up } from './dsl';

/** Epic Eclipse controller: turn-meter theft and gifts, stuns that feed him TM (CHAMPIONS.md §4.4). */
export default defineChampion({
  id: 'champ.darius',
  rarity: 'epic',
  element: 'eclipse',
  role: 'support',
  stats: [14_600, 1_120, 1_080, 108, 15, 50, 35, 30],
  art: { model: 'model.darius', avatar: 'avatar.darius' },
  obtain: ['summon', 'campaign_drop'],
  abilities: [
    {
      slot: 'a1',
      key: 'wayfarers_bolt',
      icon: 'spell.rune_astral_burst',
      effects: [hit(3.2), tm(-0.15, 'single_enemy', 35)],
      upgrades: [up.dmg(5), up.chance(10)],
    },
    {
      slot: 'a2',
      key: 'stitch_in_time',
      icon: 'spell.tech_chrono_watch',
      cooldown: 4,
      effects: [tm(0.2, 'all_allies'), status('spd_up', 2, { target: 'all_allies', value: 20 })],
      upgrades: [up.tm(5), up.tm(5), up.cd()],
      ai: { priority: 3, when: { alliesBelowTm: { percent: 50, count: 2 } } },
    },
    {
      slot: 'a3',
      key: 'hourglass_shatter',
      icon: 'spell.tech_warp_disc',
      cooldown: 5,
      effects: [
        hit(2.4, 'all_enemies'),
        status('stun', 1, { target: 'all_enemies', chance: 60 }),
        tm(-0.25, 'all_enemies'),
      ],
      upgrades: [up.chance(10), up.chance(10), up.cd()],
      ai: { priority: 4, when: { enemiesAlive: { gte: 2 } } },
    },
  ],
  passive: {
    key: 'threads_of_fate',
    icon: 'spell.rune_silver_knot',
    trigger: 'onDebuffLanded',
    effects: [{ kind: 'on_stun_gain_tm', delta: 0.1 }],
  },
});
