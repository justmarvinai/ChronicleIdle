import { hit, status } from '@content/champions/dsl';
import { defineEnemy } from './dsl';

/** Brute archetype: big HP, Weaken on the basic, a stunning slam. */
export default defineEnemy({
  id: 'enemy.remnant_brute',
  archetype: 'brute',
  element: 'valor',
  role: 'health',
  stats: [2_600, 130, 110, 86, 10, 50, 15, 5],
  art: { tint: '#8b3a3a', scale: 1.1 },
  abilities: [
    {
      slot: 'a1',
      key: 'club',
      icon: 'spell.skill_iron_fist',
      effects: [hit(2.8), status('weaken', 2, { chance: 25, value: 15 })],
    },
    {
      slot: 'a2',
      key: 'earthshaker',
      icon: 'spell.skill_titan_fist',
      cooldown: 4,
      effects: [hit(5.0), status('stun', 1, { chance: 30 })],
    },
  ],
});
