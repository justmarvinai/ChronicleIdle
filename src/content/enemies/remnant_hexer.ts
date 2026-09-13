import { hit, status } from '@content/champions/dsl';
import { defineEnemy } from './dsl';

/** Hexer archetype: ATK Down on the basic, Poison on everyone every fourth turn. */
export default defineEnemy({
  id: 'enemy.remnant_hexer',
  archetype: 'hexer',
  element: 'eclipse',
  role: 'support',
  stats: [1_500, 140, 100, 100, 10, 50, 20, 25],
  art: { tint: '#7b4fa0' },
  abilities: [
    {
      slot: 'a1',
      key: 'hex_bolt',
      icon: 'spell.blood_hex_mark',
      effects: [hit(2.8), status('atk_down', 2, { chance: 35, value: 25 })],
    },
    {
      slot: 'a2',
      key: 'miasma',
      icon: 'spell.blood_toxin_flow',
      cooldown: 4,
      effects: [status('poison', 2, { target: 'all_enemies', chance: 60, value: 5 })],
    },
  ],
});
