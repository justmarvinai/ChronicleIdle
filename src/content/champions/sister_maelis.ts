import { cleanse, defineChampion, heal, hit, status, up } from './dsl';

/** Rare Faith support starter: team heal and cleanse, vigil over the weakest ally (CHAMPIONS.md §4.3). */
export default defineChampion({
  id: 'champ.sister_maelis',
  rarity: 'rare',
  element: 'faith',
  role: 'support',
  stats: [13_900, 960, 1_000, 104, 15, 50, 30, 10],
  art: { model: 'model.maelis', avatar: 'avatar.maelis' },
  obtain: ['starter', 'summon'],
  abilities: [
    {
      slot: 'a1',
      key: 'censer_swing',
      icon: 'spell.icon_blade_chalice',
      effects: [hit(3.1)],
      upgrades: [up.dmg(5), up.dmg(5)],
    },
    {
      slot: 'a2',
      key: 'blessed_light',
      icon: 'spell.fire_radiant_dawn',
      cooldown: 4,
      effects: [heal(0.15, 'all_allies'), cleanse('all_allies', 1)],
      upgrades: [up.heal(5), up.heal(5), up.cd()],
      ai: { priority: 3, when: { alliesBelowHp: { percent: 70, count: 1 } } },
    },
  ],
  passive: {
    key: 'vigil',
    icon: 'spell.icon_meditation',
    trigger: 'onTurnStart',
    effects: [status('regen', 1, { target: 'lowest_hp_ally' })],
  },
});
