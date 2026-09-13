import { hit, status } from '@content/champions/dsl';
import { defineEnemy } from './dsl';

/**
 * Stage-boss archetype (CAMPAIGN.md §5): brute base, ×1.8 HP and ×1.25 ATK/DEF from the boss
 * block, a scripted rotation, hard-control immunity and an enrage clock.
 */
export default defineEnemy({
  id: 'enemy.remnant_warlord',
  archetype: 'boss',
  element: 'valor',
  role: 'health',
  stats: [2_600, 130, 110, 86, 15, 60, 40, 30],
  art: { tint: '#b22222', scale: 1.35 },
  abilities: [
    { slot: 'a1', key: 'warlords_cleave', icon: 'spell.weapon_battleaxe', effects: [hit(3.0)] },
    {
      slot: 'a2',
      key: 'breaking_wheel',
      icon: 'spell.skill_whirlwind',
      cooldown: 3,
      effects: [
        hit(4.0, 'all_enemies'),
        status('weaken', 2, { target: 'all_enemies', chance: 50, value: 25 }),
      ],
    },
    {
      slot: 'a3',
      key: 'skullcrusher',
      icon: 'spell.skill_crushing_grip',
      cooldown: 5,
      startsOnCooldown: true,
      effects: [hit(6.0), status('stun', 1, { chance: 50 })],
    },
  ],
  boss: {
    rotation: ['a1', 'a2', 'a1', 'a3'],
    immunities: ['stun', 'freeze', 'sleep', 'provoke', 'fear'],
    enrageAfterTurn: 12,
    damageTakenMult: 1,
  },
});
