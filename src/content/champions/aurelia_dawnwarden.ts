import { cleanse, defineChampion, heal, hit, status, up } from './dsl';

/** Legendary Justice paladin: protection, cleanse, a buff-blocking judgement (CHAMPIONS.md §4.5). */
export default defineChampion({
  id: 'champ.aurelia_dawnwarden',
  rarity: 'legendary',
  element: 'justice',
  role: 'defense',
  stats: [18_600, 1_020, 1_610, 98, 15, 50, 45, 10],
  art: { placeholderTint: '#e8c15a' },
  obtain: ['summon'],
  abilities: [
    {
      slot: 'a1',
      key: 'dawn_strike',
      icon: 'spell.weapon_sunblade',
      effects: [hit(3.2, 'single_enemy', { stat: 'DEF' }), status('atk_down', 2, { chance: 25, value: 25 })],
      upgrades: [up.dmg(5), up.dmg(5)],
    },
    {
      slot: 'a2',
      key: 'sanctuary',
      icon: 'spell.fx_lotus_spring',
      cooldown: 4,
      effects: [
        status('ally_protection', 2, { target: 'all_allies', value: 30 }),
        status('shield', 2, { target: 'self', value: 15 }),
      ],
      upgrades: [up.duration(), up.cd(), up.cd()],
      ai: { priority: 3, when: { waveStart: true } },
    },
    {
      slot: 'a3',
      key: 'purifying_light',
      icon: 'spell.fire_sun_sigil',
      cooldown: 5,
      effects: [cleanse('all_allies', 'all'), heal(0.15, 'all_allies')],
      upgrades: [up.heal(5), up.heal(5), up.cd()],
      ai: { priority: 4, when: { alliesBelowHp: { percent: 60, count: 1 } } },
    },
    {
      slot: 'a4',
      key: 'judgement',
      icon: 'spell.fire_solar_beam',
      cooldown: 6,
      effects: [
        hit(5.5, 'all_enemies', { stat: 'DEF' }),
        status('block_buffs', 2, { target: 'all_enemies', chance: 80 }),
      ],
      upgrades: [up.dmg(5), up.chance(10), up.cd(), up.cd()],
      ai: { priority: 5, when: { enemiesAlive: { gte: 2 } } },
    },
  ],
  passive: {
    key: 'wardens_oath',
    icon: 'spell.hero_emberknight',
    trigger: 'onAllyHit',
    effects: [{ kind: 'shield_ally_below', hpPercent: 30, shield: 20, turns: 1, oncePerAllyPerWave: true }],
  },
  aura: {
    key: 'dawn_aura',
    icon: 'spell.crest_gilded_crown',
    effects: [{ kind: 'stat_mod', stat: 'def', percent: 15 }],
  },
});
