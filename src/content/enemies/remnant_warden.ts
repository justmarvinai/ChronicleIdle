import { hit, status } from '@content/champions/dsl';
import { defineEnemy } from './dsl';

/** Warden archetype: DEF-scaling hits, buffs the line and provokes the party onto itself. */
export default defineEnemy({
  id: 'enemy.remnant_warden',
  archetype: 'warden',
  element: 'faith',
  role: 'defense',
  stats: [1_900, 105, 190, 88, 10, 50, 20, 5],
  art: { tint: '#5f7f9f' },
  abilities: [
    {
      slot: 'a1',
      key: 'shield_slam',
      icon: 'spell.crest_stone_guard',
      effects: [hit(2.6, 'single_enemy', { stat: 'DEF' })],
    },
    {
      slot: 'a2',
      key: 'hold_the_line',
      icon: 'spell.crest_ember_shield',
      cooldown: 4,
      effects: [
        status('def_up', 2, { target: 'all_allies', value: 30 }),
        status('provoke', 1, { target: 'all_enemies', chance: 100 }),
      ],
    },
  ],
});
