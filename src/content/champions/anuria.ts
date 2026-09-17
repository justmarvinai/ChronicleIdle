import { defineChampion, hit, status, up } from './dsl';

/** Epic Justice sniper: DEF shred and a guaranteed crit on debuffed targets (CHAMPIONS.md §4.4). */
export default defineChampion({
  id: 'champ.anuria',
  rarity: 'epic',
  element: 'justice',
  role: 'attack',
  stats: [13_200, 1_480, 880, 104, 15, 60, 25, 10],
  art: { model: 'model.anuria', avatar: 'avatar.anuria' },
  obtain: ['summon'],
  abilities: [
    {
      slot: 'a1',
      key: 'silver_arrow',
      icon: 'spell.hunt_piercing_arrow',
      effects: [hit(3.5), status('def_down', 2, { chance: 30, value: 30 })],
      upgrades: [up.dmg(5), up.chance(10)],
    },
    {
      slot: 'a2',
      key: 'piercing_volley',
      icon: 'spell.hunt_arrow_storm',
      cooldown: 4,
      effects: [hit(2.6, 'all_enemies', { defIgnore: 0.2 })],
      upgrades: [up.dmg(5), up.dmg(5), up.cd()],
      ai: { priority: 3, when: { enemiesAlive: { gte: 3 } } },
    },
    {
      slot: 'a3',
      key: 'heartseeker',
      icon: 'spell.hunt_golden_bow',
      cooldown: 5,
      effects: [hit(6.8, 'single_enemy', { guaranteedCritIf: { targetHasAnyDebuff: true } })],
      upgrades: [up.dmg(5), up.dmg(10), up.cd()],
      ai: { priority: 4 },
    },
  ],
  passive: {
    key: 'rangers_focus',
    icon: 'spell.hunt_tracking_ring',
    trigger: 'static',
    effects: [{ kind: 'damage_bonus', value: 0.15, scope: 'crit', if: { targetHas: 'def_down' } }],
  },
});
