import { defineChampion, extraTurn, hit, status, up } from './dsl';

/** Epic Eclipse poison assassin: stacks poison, detonates it, chains kills (CHAMPIONS.md §4.4). */
export default defineChampion({
  id: 'champ.rattledagger',
  rarity: 'epic',
  element: 'eclipse',
  role: 'attack',
  stats: [12_800, 1_540, 860, 110, 20, 65, 20, 20],
  art: { model: 'model.rattledagger', avatar: 'avatar.rattledagger' },
  obtain: ['summon', 'campaign_drop'],
  abilities: [
    {
      slot: 'a1',
      key: 'rattle_stab',
      icon: 'spell.hunt_jade_dagger',
      effects: [hit(3.4), status('poison', 2, { chance: 40, value: 5 })],
      upgrades: [up.dmg(5), up.chance(10)],
    },
    {
      slot: 'a2',
      key: 'shadowstep',
      icon: 'spell.hero_nightwatch',
      cooldown: 4,
      effects: [hit(5.6, 'single_enemy', { critBonus: 30 }), extraTurn({ killedThisAction: true })],
      upgrades: [up.dmg(5), up.dmg(5), up.cd()],
      ai: { priority: 3 },
    },
    {
      slot: 'a3',
      key: 'bone_rattle',
      icon: 'spell.blood_toxin_flow',
      cooldown: 5,
      effects: [
        hit(1.8, 'all_enemies'),
        status('poison', 3, { target: 'all_enemies', chance: 75, value: 5 }),
        { kind: 'detonate', target: 'all_enemies', status: 'poison', percentOfRemaining: 50 },
      ],
      upgrades: [up.chance(10), up.chance(15), up.cd()],
      ai: { priority: 4, when: { enemiesAlive: { gte: 2 } } },
    },
  ],
  passive: {
    key: 'between_the_ribs',
    icon: 'spell.tech_toxic_skull',
    trigger: 'static',
    effects: [{ kind: 'status_value_override', status: 'poison', value: 6 }],
  },
});
