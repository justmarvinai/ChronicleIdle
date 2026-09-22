/**
 * The Dungeons (docs/design/DUNGEONS.md). Five keeps, twenty stages each on two difficulties, and
 * one question on every card: which gear do I need tonight.
 */
export const dungeons = {
  'dungeons.title': 'The Dungeons',
  'dungeons.subtitle': 'Five keeps, and the gear sealed inside them.',

  /** The overview card. */
  'dungeons.card.sets': 'Holds {sets}',
  'dungeons.card.setsNone': 'Holds nothing yet',
  'dungeons.card.deepest': 'Deepest: {label}',
  'dungeons.card.untouched': 'Never entered',
  'dungeons.card.keeper': 'Kept by {keeper}',
  'dungeons.card.enter': 'Enter',
  'dungeons.card.locked': 'Sealed',

  /** The Gilded Veil's reason, said on its card and again on the overview's footnote. */
  'dungeons.locked.accessories': 'Sealed until there are necklaces, rings and trinkets to find.',
  'dungeons.locked.accessoriesShort': 'Awaiting accessories',

  /** The five keeps. */
  'dungeon.cindervault.name': 'Cindervault',
  'dungeon.cindervault.description': 'A forge sealed in stone, still hot after all this time.',
  'dungeon.cindervault.lore':
    'The Legion walled its armoury in rather than let the Ashfall reach it, and then the Legion burned. What they sealed in is still working: a warden of slag and plate that has not stopped tending a fire nobody lit. The gear on its racks is plain and it is honest — the weight that keeps a champion standing, and the shield that keeps the one beside them standing too.',
  'dungeon.pale_expanse.name': 'The Pale Expanse',
  'dungeon.pale_expanse.description': 'A white waste that does not end, and the herald that walks it.',
  'dungeon.pale_expanse.lore':
    'Past the last well of Frostvein the ice stops being a place and becomes a distance. Somewhere in it a herald is still delivering a message to a city that fell four hundred years ago, and it will kill anyone who interrupts. What the Expanse keeps is the quiet craft of a second roster: the wards that make a curse slide off, the sight that makes one land, and the patience that outlives both.',
  'dungeon.velkoras_cradle.name': 'Velkora’s Cradle',
  'dungeon.velkoras_cradle.description': 'A nest in the marsh, and the thing that built it.',
  'dungeon.velkoras_cradle.lore':
    'The marsh horrors did not make the Cradle. They moved into it, the way beetles move into a skull. Velkora has been awake underneath it since before Duskmere had a name, and she is patient in the way only something with nothing left to want can be. She teaches one lesson, over and over, and it is about the difference between a hit and a killing hit.',
  'dungeon.ashenreach.name': 'Ashenreach',
  'dungeon.ashenreach.description': 'The far grey, where the light gave up. Nothing here waits its turn.',
  'dungeon.ashenreach.lore':
    'The Eclipse Gate is the door. Ashenreach is what is on the other side of it — a grey with no horizon, where ash falls upward and the Ashwake moves before you have decided to. Every champion who has come back says the same thing: they never got a turn. What the reach holds is the answer to itself. Speed, and the turn after the turn, and the wound that heals you.',
  'dungeon.gilded_veil.name': 'The Gilded Veil',
  'dungeon.gilded_veil.description': 'A treasury behind a curtain of gold light. Not yet open.',
  'dungeon.gilded_veil.lore':
    'Sunspire’s merchant-princes put everything they could not bear to sell behind the Veil: the chains, the signet rings, the charms their grandmothers swore by. The curtain still holds, and it will hold until there is somewhere on a champion to put what is behind it.',

  /** The four keepers. */
  'enemy.cinder_warden.name': 'The Cinder Warden',
  'ab.cinder_warden.anvil_blow.name': 'Anvil Blow',
  'ab.cinder_warden.anvil_blow.description':
    'Strikes one enemy with the weight of its own plate. Damage scales with DEFENCE.',
  'ab.cinder_warden.bank_the_fires.name': 'Bank the Fires',
  'ab.cinder_warden.bank_the_fires.description':
    'Shields itself for 22 % of its maximum HP and raises its own DEFENCE by 30 % for 2 turns.',
  'ab.cinder_warden.tap_the_crucible.name': 'Tap the Crucible',
  'ab.cinder_warden.tap_the_crucible.description':
    'Opens the forge on the whole party. Damage scales with DEFENCE; 70 % chance to Burn each enemy for 2 turns.',

  'enemy.pale_herald.name': 'The Pale Herald',
  'ab.pale_herald.hoarfrost_touch.name': 'Hoarfrost Touch',
  'ab.pale_herald.hoarfrost_touch.description': 'Strikes one enemy. 60 % chance to Weaken them for 2 turns.',
  'ab.pale_herald.the_long_white.name': 'The Long White',
  'ab.pale_herald.the_long_white.description':
    'Heals itself for 18 % of its maximum HP and raises its own RESISTANCE by 40 % for 3 turns.',
  'ab.pale_herald.whiteout.name': 'Whiteout',
  'ab.pale_herald.whiteout.description':
    'Strikes the whole party. 45 % chance to Freeze, and a 70 % chance to halve the healing each enemy receives for 2 turns.',

  'enemy.velkora.name': 'Velkora',
  'ab.velkora.brood_lash.name': 'Brood Lash',
  'ab.velkora.brood_lash.description':
    'Strikes one enemy. 55 % chance to lower their DEFENCE by 30 % for 2 turns.',
  'ab.velkora.the_cradle_stirs.name': 'The Cradle Stirs',
  'ab.velkora.the_cradle_stirs.description':
    'Raises her own CRIT RATE by 30 % for 3 turns, then strikes three enemies at random.',
  'ab.velkora.unsleeping.name': 'Unsleeping',
  'ab.velkora.unsleeping.description':
    'Strikes the whole party hard. 75 % chance to Poison each enemy for 3 turns.',

  'enemy.ashwake.name': 'The Ashwake',
  'ab.ashwake.grey_tide.name': 'Grey Tide',
  'ab.ashwake.grey_tide.description':
    'Strikes one enemy. Takes another turn immediately if the strike killed them.',
  'ab.ashwake.cinders_underfoot.name': 'Cinders Underfoot',
  'ab.ashwake.cinders_underfoot.description':
    'Strikes the whole party. 65 % chance to lower each enemy’s SPEED by 25 % for 2 turns, and raises its own ATTACK by 25 % for 3 turns.',
  'ab.ashwake.the_light_gives_up.name': 'The Light Gives Up',
  'ab.ashwake.the_light_gives_up.description':
    'Strikes the whole party. 40 % chance to Stun each enemy for a turn, and it takes another turn immediately.',

  /** The dungeon screen. */
  'dungeon.difficulty.normal': 'Normal',
  'dungeon.difficulty.hard': 'Hard',
  'dungeon.stage': 'Stage {stage}',
  'dungeon.stageOf': 'Stage {stage} of {total}',
  'dungeon.stars': '{min}–{max}★',
  'dungeon.starsOne': '{stars}★',
  'dungeon.energy': '{energy} energy',
  'dungeon.level': 'Level {level}',
  'dungeon.drops': 'Drops {rarities}',
  'dungeon.extraPiece': '{percent} % chance of a second piece',
  'dungeon.onePiece': 'One piece every clear',
  'dungeon.locked': 'Clear stage {stage} first',
  'dungeon.hardLocked': 'Clear Normal stage {stage} to open Hard',
  'dungeon.cleared': 'Cleared',
  'dungeon.next': 'Next',
  'dungeon.enter': 'Descend',
  'dungeon.noEnergy': 'Not enough energy',
  'dungeon.sets': 'Sets here',
  'dungeon.keeper': 'The keeper',
  'dungeon.deepest': 'Deepest cleared: {label}',
  'dungeon.deepestNone': 'Nothing cleared here yet',
  'dungeon.repeat': 'Repeat',
  'dungeon.repeatRuns': '×{runs}',

  /** The battle result's dungeon panel. */
  'dungeon.outcome.title': '{dungeon} · {difficulty} {stage}',
  'dungeon.outcome.cleared': 'The keeper falls.',
  'dungeon.outcome.failed': 'The keeper holds. The energy is spent either way.',
  'dungeon.outcome.pieces': '{count} pieces recovered',
  'dungeon.outcome.onePiece': '1 piece recovered',
  'dungeon.outcome.noPieces': 'Nothing left the racks.',
  'dungeon.outcome.first': 'First clear — stage {stage} opens.',
  'dungeon.outcome.hardOpen': 'Hard opens.',
  'dungeon.outcome.full': 'The armoury is full. {count} pieces were left behind.',
  'dungeon.outcome.runs': '{count} runs',
  'dungeon.outcome.spoils': '{gold} gold · {xp} champion XP',
  'dungeon.outcome.back': 'Back to the keep',

  /** Game Modes. */
  'gameModes.dungeons': 'Dungeons',
  'gameModes.dungeons.body':
    'Five keeps, and the gear sealed inside them. Every set in the game belongs to one of them.',
  'gameModes.dungeons.note': '{open} keeps open · deepest {label}',
  'gameModes.dungeons.noteNone': '{open} keeps open · never entered',
} as const;
