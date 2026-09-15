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

  // The gate (docs/tech/UI_DESIGN.md §5.13).
  'bosses.title': 'The Boss Gate',
  'bosses.tab.daily': 'Daily',
  'bosses.tab.weekly': 'Weekly',
  'bosses.resetsIn': 'Resets in {time}',
  'bosses.keys': 'Keys {keys}/{of}',
  'bosses.keyCost': '1 key',
  'bosses.sheet': 'How it fights',
  'bosses.fight': 'Battle',
  'bosses.ready': 'A key opens {tier}.',
  'bosses.noKeys': 'No keys left. They come back at the reset.',
  'bosses.locked': 'The gate opens at chronicle level {level}.',
  'bosses.damageOf': '{damage} of {pool}',
  'bosses.tierLevel': 'Level {level}',
  'bosses.tierXp': '+{xp} XP a key',
  'bosses.chestAt': '{pct} % — {damage} damage',
  'bosses.chestGear': '{rarity} gear, {stars}★',
  'bosses.chestTaken': 'The {pct} % chest is yours.',
  'bosses.chestGearLost': 'The armoury was too full for the piece — clear space and fight again.',
  'bosses.best': 'Best {damage}, on {date}',
  'bosses.noRecord': 'Nobody here has faced {boss} yet.',
  'bosses.records': 'Records',
  'bosses.records.empty': 'No key spent on this one yet.',
  'bosses.records.note': '{keys} keys a period. Damage from every key counts towards the same pool.',

  // The mechanics sheet.
  'bosses.sheet.kit': 'What it does',
  'bosses.sheet.rotation': 'It acts in order: {order}, then begins again.',
  'bosses.sheet.passive': 'always',
  'bosses.sheet.unshakeable': 'Unshakeable',
  'bosses.sheet.immune': 'Nothing of this kind ever lands on it: {list}.',
  'bosses.sheet.tips': 'The way in',
  'bosses.sheet.tip.dots': 'Poison, Bleed and Burn tick at full value — they are the reliable damage.',
  'bosses.sheet.tip.debuffs': 'DEF Down and Weaken are worth more here than any single big hit.',
  'bosses.sheet.tip.enrage':
    'Once it has taken {turn} turns of its own, its attack grows {step}% every {every} turns — a race always ends.',
  'bosses.sheet.tip.damage': 'Losing costs nothing but the key: whatever damage you did still counts.',

  // The fight, and what it banked.
  'bosses.result.damage': 'Damage this key',
  'bosses.result.total': 'The pool now holds {damage} — {pct} % of it.',
  'bosses.result.record': 'A personal best.',
  'bosses.result.unlocked': 'Chests earned: {list}',
  'bosses.result.back': 'Back to the gate',
  'bosses.tribute': 'The gate paid what it owed',
  'bosses.tribute.row': '{boss} · {tier} · {pct} %',
} as const;
