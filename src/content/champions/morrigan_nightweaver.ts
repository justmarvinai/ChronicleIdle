import { defineChampion, hit, status, tm, up, when } from './dsl';

/** Legendary Eclipse control nuker who cannot be singled out (CHAMPIONS.md §4.5). */
export default defineChampion({
  id: 'champ.morrigan_nightweaver',
  rarity: 'legendary',
  element: 'eclipse',
  role: 'attack',
  stats: [14_200, 1_690, 920, 112, 20, 65, 30, 40],
  art: { placeholderTint: '#7a3fb8' },
  obtain: ['summon'],
  abilities: [
    {
      slot: 'a1',
      key: 'nightweave',
      icon: 'spell.blood_nightwing',
      effects: [hit(3.4), status('sleep', 1, { chance: 35 })],
      upgrades: [up.dmg(5), up.chance(10)],
    },
    {
      slot: 'a2',
      key: 'shadow_lash',
      icon: 'spell.blood_void_lance',
      cooldown: 4,
      effects: [hit(4.2, 'highest_atk_enemies_2'), tm(-0.3, 'highest_atk_enemies_2')],
      upgrades: [up.dmg(5), up.dmg(5), up.cd()],
      ai: { priority: 3 },
    },
    {
      slot: 'a3',
      key: 'umbral_cage',
      icon: 'spell.blood_hex_circle',
      cooldown: 5,
      effects: [
        hit(2.6, 'all_enemies'),
        status('stun', 1, { target: 'all_enemies', chance: 70 }),
        status('block_buffs', 2, { target: 'all_enemies' }),
      ],
      upgrades: [up.chance(10), up.chance(10), up.cd()],
      ai: { priority: 4, when: { enemiesAlive: { gte: 2 } } },
    },
    {
      slot: 'a4',
      key: 'eclipse_requiem',
      icon: 'spell.rune_eclipse_mark',
      cooldown: 6,
      effects: [
        hit(7.5, 'single_enemy', { defIgnore: 0.4 }),
        when({ killedThisAction: true }, [tm(-0.25, 'all_enemies')]),
      ],
      upgrades: [up.dmg(5), up.dmg(10), up.cd()],
      ai: { priority: 5 },
    },
  ],
  passive: {
    key: 'veiled',
    icon: 'spell.hero_lone_wanderer',
    trigger: 'static',
    effects: [{ kind: 'retarget_single_attacks', while: 'any_ally_alive' }],
  },
  aura: {
    key: 'night_aura',
    icon: 'spell.orb_voidspiral',
    scope: 'campaign',
    effects: [{ kind: 'stat_mod', stat: 'spd', percent: 15 }],
  },
});
