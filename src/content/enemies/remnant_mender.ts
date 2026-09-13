import { heal, hit } from '@content/champions/dsl';
import { defineEnemy } from './dsl';

/** Mender archetype: keeps the line alive; the party learns to focus it first. */
export default defineEnemy({
  id: 'enemy.remnant_mender',
  archetype: 'mender',
  element: 'faith',
  role: 'support',
  stats: [1_600, 120, 110, 96, 10, 50, 20, 15],
  art: { tint: '#c9a24a' },
  abilities: [
    { slot: 'a1', key: 'thorn_lash', icon: 'spell.fx_vine_lash', effects: [hit(2.6)] },
    {
      slot: 'a2',
      key: 'mending_chant',
      icon: 'spell.fx_lotus_spring',
      cooldown: 3,
      effects: [heal(0.2, 'all_allies')],
      ai: { priority: 3, when: { alliesBelowHp: { percent: 80, count: 1 } } },
    },
  ],
});
