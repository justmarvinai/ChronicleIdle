import { hit } from '@content/champions/dsl';
import { defineEnemy } from './dsl';

/** Marksman archetype: fast, fragile, hits everyone every fourth turn. */
export default defineEnemy({
  id: 'enemy.remnant_marksman',
  archetype: 'marksman',
  element: 'justice',
  role: 'attack',
  stats: [1_200, 165, 80, 98, 15, 60, 10, 15],
  art: { tint: '#6b8e23' },
  abilities: [
    { slot: 'a1', key: 'quick_shot', icon: 'spell.hunt_crossbow', effects: [hit(3.2)] },
    {
      slot: 'a2',
      key: 'scatter_volley',
      icon: 'spell.hunt_arrow_storm',
      cooldown: 4,
      effects: [hit(2.2, 'all_enemies')],
    },
  ],
});
