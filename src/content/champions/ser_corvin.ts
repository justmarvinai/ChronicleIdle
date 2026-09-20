import { defineChampion, hit, status, up } from './dsl';

/** Rare Justice defender starter: provoking bash, team DEF, protection for the weakest (CHAMPIONS.md §4.3). */
export default defineChampion({
  id: 'champ.ser_corvin',
  rarity: 'rare',
  element: 'justice',
  role: 'defense',
  stats: [15_200, 860, 1_290, 96, 15, 50, 30, 0],
  art: { model: 'model.corvin', avatar: 'avatar.corvin' },
  obtain: ['starter', 'summon'],
  abilities: [
    {
      slot: 'a1',
      key: 'shield_bash',
      icon: 'spell.crest_warded_shield',
      effects: [hit(3.2, 'single_enemy', { stat: 'DEF' }), status('provoke', 1, { chance: 20 })],
      upgrades: [up.dmg(5), up.chance(10)],
    },
    {
      slot: 'a2',
      key: 'stand_fast',
      icon: 'spell.crest_sacred_anchor',
      cooldown: 5,
      effects: [
        status('def_up', 2, { target: 'all_allies', value: 30 }),
        status('ally_protection', 2, { target: 'lowest_hp_ally', value: 25 }),
      ],
      upgrades: [up.duration(), up.cd(), up.cd()],
      ai: { priority: 3, when: { waveStart: true } },
    },
  ],
  passive: {
    key: 'oathbound',
    icon: 'spell.crest_warmark',
    trigger: 'static',
    effects: [{ kind: 'damage_reduction', value: 0.1, if: { alliesBelowHp: { percent: 50, count: 1 } } }],
  },
});
