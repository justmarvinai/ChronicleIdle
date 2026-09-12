import { cleanse, defineChampion, hit, status, tm, up } from './dsl';

/** Legendary Eclipse support and the game's guide; earned from the mission line only (CHAMPIONS.md §4.5). */
export default defineChampion({
  id: 'champ.eldric_chronicler',
  rarity: 'legendary',
  element: 'eclipse',
  role: 'support',
  stats: [17_200, 1_150, 1_260, 110, 15, 50, 45, 40],
  art: { placeholderTint: '#c9b48a' },
  obtain: ['mission'],
  abilities: [
    {
      slot: 'a1',
      key: 'quill_strike',
      icon: 'spell.hunt_star_dagger',
      effects: [hit(3.2), status('spd_down', 2, { chance: 30, value: 20 })],
      upgrades: [up.dmg(5), up.chance(10)],
    },
    {
      slot: 'a2',
      key: 'turn_the_page',
      icon: 'spell.tech_compass',
      cooldown: 4,
      effects: [tm(0.3, 'all_allies'), cleanse('all_allies', 1)],
      upgrades: [up.tm(5), up.tm(5), up.cd()],
      ai: { priority: 3, when: { alliesBelowTm: { percent: 50, count: 2 } } },
    },
    {
      slot: 'a3',
      key: 'written_fate',
      icon: 'spell.rune_sealed_ring',
      cooldown: 5,
      effects: [
        status('block_debuffs', 2, { target: 'all_allies' }),
        status('res_up', 2, { target: 'all_allies', value: 40 }),
      ],
      upgrades: [up.duration(), up.cd(), up.cd()],
      ai: { priority: 4, when: { waveStart: true } },
    },
    {
      slot: 'a4',
      key: 'final_chapter',
      icon: 'spell.rune_obsidian_seal',
      cooldown: 7,
      effects: [
        hit(5.0, 'all_enemies'),
        tm(-0.5, 'all_enemies'),
        status('weaken', 2, { target: 'all_enemies', value: 25 }),
      ],
      upgrades: [up.dmg(5), up.tm(10), up.cd()],
      ai: { priority: 5, when: { enemiesAlive: { gte: 2 } } },
    },
  ],
  passive: {
    key: 'unfinished_story',
    icon: 'spell.icon_astrolabe',
    trigger: 'onDeath',
    oncePerBattle: true,
    effects: [{ kind: 'survive_lethal', hpPercent: 40, oncePerBattle: true }],
  },
  aura: {
    key: 'chronicle_aura',
    icon: 'spell.rune_bronze_disc',
    effects: [
      { kind: 'stat_mod', stat: 'hp', percent: 12 },
      { kind: 'stat_mod', stat: 'spd', flat: 8 },
    ],
  },
});
