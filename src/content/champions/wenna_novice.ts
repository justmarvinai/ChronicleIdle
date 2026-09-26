import { defineChampion, heal, hit, up } from './dsl';

/** Common Faith support: a strike that mends herself a little (CHAMPIONS.md §4.1). */
export default defineChampion({
  id: 'champ.wenna_novice',
  rarity: 'common',
  element: 'faith',
  role: 'support',
  stats: [10_400, 760, 780, 100, 15, 50, 25, 0],
  art: { placeholderTint: '#9fc3e6' },
  obtain: ['summon', 'starter'],
  abilities: [
    {
      slot: 'a1',
      key: 'prayer_strike',
      icon: 'spell.rune_radiance',
      effects: [hit(3.2), heal(0.05, 'self', 'CASTER_MAX_HP')],
      upgrades: [up.dmg(5), up.heal(5)],
    },
  ],
});
