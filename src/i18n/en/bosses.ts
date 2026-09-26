/** The period bosses (docs/design/BOSSES.md) and the screen that fights them. */
export const bosses = {
  // Gargoyle, the Waking Stone — the gate that opens every day.
  'boss.gargoyle.name': 'Gargoyle',
  'boss.gargoyle.title': 'The Waking Stone',
  'boss.gargoyle.lore':
    'A mason cut it for a roof it has long outlived, and three hundred winters wore the mason’s work away and left what he had shut inside. It came down off the gutter the year the rain stopped.',
  'boss.gargoyle.tier.easy': 'Easy',
  'boss.gargoyle.tier.normal': 'Normal',
  'boss.gargoyle.tier.hard': 'Hard',
  'boss.gargoyle.tier.brutal': 'Brutal',
  'enemy.gargoyle.name': 'Gargoyle, the Waking Stone',
  'ab.gargoyle.granite_fist.name': 'Granite Fist',
  'ab.gargoyle.granite_fist.description':
    'Attacks the strongest enemy for {dmg}% of ATK with a {chance}% chance to place [DEF Down] for {turns} turns.',
  'ab.gargoyle.stonequake.name': 'Stonequake',
  'ab.gargoyle.stonequake.description':
    'Attacks all enemies for {dmg}% of ATK. The ground takes one of them: a {chance}% chance of [Stun] for {turns} turn, and never more than a single champion. Cooldown {cooldown} turns.',
  'ab.gargoyle.devour.name': 'Devour',
  'ab.gargoyle.devour.description':
    'Attacks one enemy for {dmg}% of ATK, heals itself 3% of its own maximum HP for every debuff on them, and places [Heal Reduction] for {turns} turns. Cooldown {cooldown} turns.',
  'ab.gargoyle.weathered_stone.name': 'Weathered Stone',
  'ab.gargoyle.weathered_stone.description':
    'Takes 20% less damage from critical hits until five different debuffs have landed on it. Stone does not grow back.',

  // Titan, the Sunless — the gate that opens every week, and the chorus that sings for it.
  'boss.titan.name': 'Titan',
  'boss.titan.title': 'The Sunless',
  'boss.titan.lore':
    'It was the last thing the Eclipse Gate was built to keep out, and the first thing the Gate learned to sing to. Two of the choir keep the note going while it works.',
  'boss.titan.tier.easy': 'Easy',
  'boss.titan.tier.normal': 'Normal',
  'boss.titan.tier.hard': 'Hard',
  'boss.titan.tier.nightmare': 'Nightmare',
  'enemy.titan.name': 'Titan, the Sunless',
  'enemy.chorister.name': 'Chorister',
  'ab.titan.shadow_verse.name': 'Shadow Verse',
  'ab.titan.shadow_verse.description':
    'Attacks two random enemies for {dmg}% of ATK, with a {chance}% chance to place [Weaken] on two of them for {turns} turns.',
  'ab.titan.dirge.name': 'Dirge',
  'ab.titan.dirge.description':
    'Attacks all enemies for {dmg}% of ATK and takes one buff from each of them — it does not strip what the party wears, it wears it. Cooldown {cooldown} turns.',
  'ab.titan.eclipse_hymn.name': 'Eclipse Hymn',
  'ab.titan.eclipse_hymn.description':
    'From phase II: places [Fear] on all enemies for {turns} turns and takes 30% of their turn meter. Cooldown {cooldown} turns.',
  'ab.titan.titans_embrace.name': 'Titan’s Embrace',
  'ab.titan.titans_embrace.description':
    'From phase III: heals itself 5% of its maximum HP, places [Block Debuffs] on itself for {turns} turns, and its chorus gains [Counterattack] for 3 turns. Cooldown {cooldown} turns.',
  'ab.titan.unlight.name': 'Un-light',
  'ab.titan.unlight.description':
    'In its last phase, every heal the party pays for is worth 30% less. Nothing in the Eclipse Gate mends while it is awake.',
  'ab.chorister.discord.name': 'Discord',
  'ab.chorister.discord.description': 'Attacks one enemy for {dmg}% of ATK.',
  'ab.chorister.antiphon.name': 'Antiphon',
  'ab.chorister.antiphon.description': 'Heals the Titan for 2% of its maximum HP. Cooldown {cooldown} turns.',

  // The menu the Battle screen opens (docs/tech/UI_DESIGN.md §5.13a): one card per boss.
  'bosses.menu.title': 'Bosses',
  'bosses.menu.cadence.daily': 'Two keys every day',
  'bosses.menu.cadence.weekly': 'Three keys every week',
  'bosses.menu.keys': '{left} of {total} keys left · resets in {time}',
  'bosses.menu.spent': 'No keys left · they come back in {time}',

  // The gate (docs/tech/UI_DESIGN.md §5.13).
  'bosses.title': 'The Boss Gate',
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
  'bosses.sheet.phases': 'How the fight changes',
  'bosses.sheet.phase.first': 'Phase {roman} — above {low}% of its health.',
  'bosses.sheet.phase.band': 'Phase {roman} — between {high}% and {low}% of its health.',
  'bosses.sheet.phase.last': 'Phase {roman} — below {high}% of its health.',
  'bosses.sheet.phase.note':
    'It changes gear on its own next turn, and abilities it has held back open with the phase.',
  'bosses.sheet.adds': 'What stands with it',
  'bosses.sheet.adds.body':
    '{count} × {name}. While one of them stands, every hit meant for the boss loses {percent}% to it. They come back at each phase and every {every} of its own turns, at {hp}% health.',
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
