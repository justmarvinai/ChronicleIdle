import { defineChampion, hit, status, up } from './dsl';

/** Epic Valor undead tank: provoke, counter, team shields, refuses to stay dead (CHAMPIONS.md §4.4). */
export default defineChampion({
  id: 'champ.khazgor',
  rarity: 'epic',
  element: 'valor',
  role: 'defense',
  stats: [17_400, 940, 1_460, 94, 15, 50, 40, 0],
  art: { model: 'model.khazgor', avatar: 'avatar.khazgor', facing: 'right' },
  obtain: ['summon'],
  abilities: [
    {
      slot: 'a1',
      key: 'grave_slash',
      icon: 'spell.blood_sanguine_blade',
      effects: [hit(3.0, 'single_enemy', { stat: 'DEF' }), status('atk_down', 2, { chance: 30, value: 25 })],
      upgrades: [up.dmg(5), up.chance(10)],
    },
    {
      slot: 'a2',
      key: 'unyielding_wall',
      icon: 'spell.crest_ember_shield',
      cooldown: 4,
      effects: [
        status('provoke', 1, { target: 'all_enemies' }),
        status('def_up', 2, { target: 'self', value: 30 }),
        status('counter', 2, { target: 'self' }),
      ],
      upgrades: [up.duration(), up.cd(), up.cd()],
      ai: { priority: 3, when: { waveStart: true } },
    },
    {
      slot: 'a3',
      key: 'bone_bulwark',
      icon: 'spell.blood_skull',
      cooldown: 5,
      effects: [status('shield', 2, { target: 'all_allies', value: 25 })],
      upgrades: [up.shield(5), up.shield(5), up.cd()],
      ai: { priority: 4, when: { alliesBelowHp: { percent: 80, count: 1 } } },
    },
  ],
  passive: {
    key: 'unburied',
    icon: 'spell.blood_necromancer',
    trigger: 'onDeath',
    oncePerBattle: true,
    effects: [{ kind: 'survive_lethal', hpPercent: 1, oncePerBattle: true, healNextTurn: 20 }],
  },
});
