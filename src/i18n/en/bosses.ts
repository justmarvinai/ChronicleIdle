/** The period bosses (docs/design/BOSSES.md) and the screen that fights them. */
export const bosses = {
  // Gravemaw, the Bone Tyrant — the daily boss.
  'boss.gravemaw.name': 'Gravemaw',
  'boss.gravemaw.title': 'The Bone Tyrant',
  'boss.gravemaw.lore':
    'What the old wars left in the ground did not stay there. It wears their armour as ribs and it remembers being many men.',
  'boss.gravemaw.tier.easy': 'Easy',
  'boss.gravemaw.tier.normal': 'Normal',
  'boss.gravemaw.tier.hard': 'Hard',
  'boss.gravemaw.tier.brutal': 'Brutal',
  'enemy.gravemaw.name': 'Gravemaw, the Bone Tyrant',
  'ab.gravemaw.bone_crush.name': 'Bone Crush',
  'ab.gravemaw.bone_crush.description':
    'Attacks the strongest enemy for {dmg}% of ATK with a {chance}% chance to place [DEF Down] for {turns} turns.',
  'ab.gravemaw.grave_quake.name': 'Grave Quake',
  'ab.gravemaw.grave_quake.description':
    'Attacks all enemies for {dmg}% of ATK. The ground takes one of them: a {chance}% chance of [Stun] for {turns} turn, and never more than a single champion. Cooldown {cooldown} turns.',
  'ab.gravemaw.devour.name': 'Devour',
  'ab.gravemaw.devour.description':
    'Attacks one enemy for {dmg}% of ATK, heals himself 3% of his own maximum HP for every debuff on them, and places [Heal Reduction] for {turns} turns. Cooldown {cooldown} turns.',
  'ab.gravemaw.tyrants_hide.name': "Tyrant's Hide",
  'ab.gravemaw.tyrants_hide.description':
    'Takes 20% less damage from critical hits until five different debuffs have landed on him. The hide does not grow back.',
} as const;
