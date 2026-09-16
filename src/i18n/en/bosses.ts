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

  // Nyxara, Mother of Shadows — the weekly boss, and the chorus that sings for her.
  'boss.nyxara.name': 'Nyxara',
  'boss.nyxara.title': 'Mother of Shadows',
  'boss.nyxara.lore':
    'She was the last thing the Eclipse Gate was built to keep out, and the first thing it learned to sing to. Two of her daughters keep the note going while she works.',
  'boss.nyxara.tier.normal': 'Normal',
  'boss.nyxara.tier.hard': 'Hard',
  'boss.nyxara.tier.nightmare': 'Nightmare',
  'enemy.nyxara.name': 'Nyxara, Mother of Shadows',
  'enemy.chorister.name': 'Chorister',
  'ab.nyxara.shadow_verse.name': 'Shadow Verse',
  'ab.nyxara.shadow_verse.description':
    'Attacks two random enemies for {dmg}% of ATK, with a {chance}% chance to place [Weaken] on two of them for {turns} turns.',
  'ab.nyxara.dirge.name': 'Dirge',
  'ab.nyxara.dirge.description':
    'Attacks all enemies for {dmg}% of ATK and takes one buff from each of them — she does not strip what the party wears, she wears it. Cooldown {cooldown} turns.',
  'ab.nyxara.eclipse_hymn.name': 'Eclipse Hymn',
  'ab.nyxara.eclipse_hymn.description':
    'From phase II: places [Fear] on all enemies for {turns} turns and takes 30% of their turn meter. Cooldown {cooldown} turns.',
  'ab.nyxara.mothers_embrace.name': "Mother's Embrace",
  'ab.nyxara.mothers_embrace.description':
    'From phase III: heals herself 5% of her maximum HP, places [Block Debuffs] on herself for {turns} turns, and her chorus gains [Counterattack] for 3 turns. Cooldown {cooldown} turns.',
  'ab.nyxara.unlight.name': 'Un-light',
  'ab.nyxara.unlight.description':
    'In her last phase, every heal the party pays for is worth 30% less. Nothing in the Eclipse Gate mends while she is awake.',
  'ab.chorister.discord.name': 'Discord',
  'ab.chorister.discord.description': 'Attacks one enemy for {dmg}% of ATK.',
  'ab.chorister.antiphon.name': 'Antiphon',
  'ab.chorister.antiphon.description': 'Heals Nyxara for 2% of her maximum HP. Cooldown {cooldown} turns.',

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
  'bosses.hint.race': 'A race often ends on the turn limit — every point of damage still counts.',
  'bosses.result.damage': 'Damage this key',
  'bosses.result.total': 'The pool now holds {damage} — {pct} % of it.',
  'bosses.result.record': 'A personal best.',
  'bosses.result.unlocked': 'Chests earned: {list}',
  'bosses.result.back': 'Back to the gate',
  'bosses.tribute': 'The gate paid what it owed',
  'bosses.tribute.row': '{boss} · {tier} · {pct} %',
} as const;
