import { defineChampion, hit, status, up } from './dsl';

/** Legendary Faith storm mage: DEF shred everywhere, crits the shredded (CHAMPIONS.md §4.5). */
export default defineChampion({
  id: 'champ.kaelith_stormcaller',
  rarity: 'legendary',
  element: 'faith',
  role: 'attack',
  stats: [14_800, 1_660, 940, 106, 20, 60, 30, 30],
  art: { placeholderTint: '#5a86d8' },
  obtain: ['summon'],
  abilities: [
    {
      slot: 'a1',
      key: 'spark',
      icon: 'spell.fx_storm_bolt',
      effects: [hit(3.3), status('def_down', 2, { chance: 30, value: 30 })],
      upgrades: [up.dmg(5), up.chance(10)],
    },
    {
      slot: 'a2',
      key: 'chain_lightning',
      icon: 'spell.tech_tesla_hammer',
      cooldown: 4,
      effects: [hit(4.0), hit(2.0, { random_enemies: 2 })],
      upgrades: [up.dmg(5), up.dmg(5), up.cd()],
      ai: { priority: 3 },
    },
    {
      slot: 'a3',
      key: 'thunderhead',
      icon: 'spell.hero_stormblade',
      cooldown: 5,
      effects: [
        hit(2.9, 'all_enemies'),
        status('def_down', 2, { target: 'all_enemies', chance: 60, value: 30 }),
      ],
      upgrades: [up.chance(10), up.chance(10), up.cd()],
      ai: { priority: 4, when: { enemiesAlive: { gte: 2 } } },
    },
    {
      slot: 'a4',
      key: 'tempest',
      icon: 'spell.weapon_thunderblade',
      cooldown: 6,
      effects: [hit(3.6, 'all_enemies', { guaranteedCritIf: { targetHas: 'def_down' } })],
      upgrades: [up.dmg(5), up.dmg(5), up.cd()],
      ai: { priority: 5, when: { enemiesAlive: { gte: 2 } } },
    },
  ],
  passive: {
    key: 'static',
    icon: 'spell.tech_arc_lantern',
    trigger: 'static',
    effects: [{ kind: 'crit_rate_per', per: 'enemy_with_def_down', value: 10, max: 30 }],
  },
  aura: {
    key: 'storm_aura',
    icon: 'spell.tech_shock_mine',
    effects: [{ kind: 'stat_mod', stat: 'critRate', flat: 20 }],
  },
});
