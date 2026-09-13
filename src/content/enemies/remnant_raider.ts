import { hit } from '@content/champions/dsl';
import { defineEnemy } from './dsl';

/** Raider archetype (CAMPAIGN.md §5): plain damage, a heavier swing every third turn. */
export default defineEnemy({
  id: 'enemy.remnant_raider',
  archetype: 'raider',
  element: 'valor',
  role: 'attack',
  stats: [1_400, 150, 90, 92, 10, 50, 10, 10],
  art: { tint: '#a0522d' },
  abilities: [
    { slot: 'a1', key: 'cleave', icon: 'spell.weapon_hatchet', effects: [hit(3.0)] },
    { slot: 'a2', key: 'reckless_swing', icon: 'spell.weapon_cleaver_axe', cooldown: 3, effects: [hit(4.2)] },
  ],
});
