import { defineChampion, hit, status, up } from './dsl';

/** Epic Valor berserker: cleaves, a stunning splitter, the whirling axe (CHAMPIONS.md §4.4). */
export default defineChampion({
  id: 'champ.thordakk',
  rarity: 'epic',
  element: 'valor',
  role: 'attack',
  stats: [14_100, 1_560, 900, 98, 15, 60, 20, 0],
  art: { model: 'model.thordakk', avatar: 'avatar.thordakk' },
  obtain: ['summon', 'campaign_drop'],
  abilities: [
    {
      slot: 'a1',
      key: 'cleave',
      icon: 'spell.weapon_battleaxe',
      effects: [hit(3.3), hit(1.2, { adjacent_to_target: 1 })],
      upgrades: [up.dmg(5), up.dmg(5)],
    },
    {
      slot: 'a2',
      key: 'skullsplitter',
      icon: 'spell.skill_crushing_grip',
      cooldown: 4,
      effects: [hit(6.2), status('stun', 1, { chance: 40 })],
      upgrades: [up.dmg(5), up.chance(10), up.cd()],
      ai: { priority: 3 },
    },
    {
      slot: 'a3',
      key: 'whirling_axe',
      icon: 'spell.skill_whirlwind',
      cooldown: 5,
      effects: [hit(2.8, 'all_enemies'), status('atk_up', 2, { target: 'self', value: 25 })],
      upgrades: [up.dmg(5), up.dmg(5), up.cd()],
      ai: { priority: 4, when: { enemiesAlive: { gte: 2 } } },
    },
  ],
  passive: {
    key: 'blood_fury',
    icon: 'spell.hero_berserker',
    trigger: 'static',
    effects: [{ kind: 'damage_bonus_per', per: 'missing_hp_10', value: 0.04, max: 0.4 }],
  },
});
