/**
 * The Chronicle of Changes, in the words a player would use (docs/tech/CONTENT_AUTHORING.md §13).
 * One key per line of `src/content/changelog/index.ts`, grouped by release, newest first.
 *
 * Write for someone who plays the game and has never read a commit: name the thing that changed
 * and what it does for them. No file paths, no version numbers inside a line, no jargon.
 */
export const changelog = {
  'changelog.title': 'Chronicle of Changes',
  'changelog.subtitle': 'What has changed in Veyrath',
  'changelog.latest': 'Latest',
  'changelog.empty': 'Nothing has been written here yet.',
  'changelog.all': 'Everything',
  'changelog.kind.added': 'New',
  'changelog.kind.content': 'Content',
  'changelog.kind.changed': 'Improved',
  'changelog.kind.balance': 'Balance',
  'changelog.kind.fixed': 'Fixed',
  'changelog.newestFirst': 'Newest first',
  'changelog.oldestFirst': 'Oldest first',
  'changelog.open': 'Chronicle of Changes',

  'release.0_7_1.name': 'The Gargoyle and the Titan',
  'release.0_7_1.names':
    'The two bosses have names now. The one you fight every day is the Gargoyle, the Waking Stone; the one you fight every week is the Titan, the Sunless. Nothing calls them "the daily boss" and "the weekly boss" any more — though that is still exactly how often each of them opens.',
  'release.0_7_1.bosses_menu':
    'Both of them live behind one Bosses card on the Battle menu, which opens a menu of their own: a card each, with what it is, how often it opens and how many keys are waiting at it.',
  'release.0_7_1.kit_names':
    'Their abilities were renamed to match: the Gargoyle throws a Granite Fist and a Stonequake and wears Weathered Stone, and the Titan gathers its chorus with Titan’s Embrace.',
  'release.0_7_1.keys':
    'Their keys took the new names with them — Gargoyle Keys and Titan Keys — and so did every quest that asks you to spend one.',
  'release.0_7_1.nothing_lost':
    'Everything you had already done to them came with the new names: this period’s damage, the chests you have taken, and every personal best you have ever set.',

  'release.0_7_0.name': 'The Brewery',
  'release.0_7_0.brewery':
    'Four brew halls have opened, one for each element, and they are where brews come from now. The Gilded Cask, the Ember Vats, the Frostwell Cellar and the Waning Cellar are on the Battle menu from level 3 — so you can finally farm the brews your own champions need instead of the ones the map happens to drop.',
  'release.0_7_0.twenty_runs':
    'You get twenty runs a day, and all four halls draw on the same twenty. Which element needs brews most today is yours to decide — and the runs come back at midnight.',
  'release.0_7_0.five_stages':
    'Every hall has five stages. The first falls on your first day; the fifth is for a finished roster. The deeper you go the more brews a run pours — one at the first stage, five at the last.',
  'release.0_7_0.waning_cellar':
    'The Waning Cellar keeps the old calendar: the cult brews on Wednesday, Saturday and Sunday, and bars its doors the rest of the week. A barred door never costs you a run.',
  'release.0_7_0.element_wheel':
    'Each hall is held by the factions of its own element, and tells you which champions have the advantage inside it. Eclipse is the one nothing counters, so the Waning Cellar says to bring your strongest.',

  'release.0_6_0.name': 'The Glorious Palace',
  'release.0_6_0.palace':
    'A palace has opened on the hill above Emberhold, and inside it a tree of 133 nodes. Its heart gives every champion you own a little more health; its four branches — one for each element — give every champion of that element a little more of everything, for good. Nothing in it is large. All of it is permanent.',
  'release.0_6_0.points':
    'Skill points come from finishing things: one for every settlement you beat on every difficulty, one for every fifth floor of the Eternal Tower and again each season, one for emptying the Gargoyle’s pool and three for the Titan’s.',
  'release.0_6_0.purple_line':
    'A champion’s stats now show what the Palace gives them in purple, beside what their gear gives them in green — so you can always see which of the two is carrying them.',
  'release.0_6_0.free_reset':
    'Changed your mind? Reclaim every point at any time, as often as you like. It costs nothing.',
  'release.0_6_0.old_chronicles':
    'Chronicles that had already beaten settlements were paid for them: open the Palace and the points your campaign earned are waiting.',

  'release.0_5_1.name': 'Four Faces',
  'release.0_5_1.four_champions':
    'Bran, Maelis, Reva and Corvin have their own art — portraits, battle sprites and idle animations. Eleven of the twenty-three champions are drawn now; the rest still stand in as the lizard until their art is done.',
  'release.0_5_1.first_hours':
    'All four are champions you meet in your first hour: the three you can bind first, and the militiaman who fights beside you at Thornwood Crossing.',

  'release.0_5_0.name': 'The Chronicle of Changes',
  'release.0_5_0.chronicle_of_changes':
    'The title screen now keeps a chronicle of everything that changes in the game — what is new, what improved, what was fixed — sorted newest first and filtered by what you care to read.',
  'release.0_5_0.settings_button':
    'The same chronicle opens from Settings while you play, so you never have to leave a chronicle to catch up.',
  'release.0_5_0.title_layout':
    'The title screen holds its menu to the left of the chronicle, and the logo sits above both.',

  'release.0_4_2.name': 'A Legible Battle Log',
  'release.0_4_2.battle_log':
    'The battle log reads at a glance: every line opens with an icon for what happened and carries a coloured rail — gold for a turn, ember for a critical hit, green for a heal, red for a fall.',
  'release.0_4_2.log_names':
    'Champions are named in their rarity’s colour and enemies in their element’s, damage and healing are called out in their own tones, and every buff and debuff carries its icon.',
  'release.0_4_2.log_colours':
    'The log used to print in a single grey no matter what happened in the fight. It does not any more.',

  'release.0_4_1.name': 'Round Icons',
  'release.0_4_1.ability_icons':
    'Ability icons were being squeezed into eggs wherever they sat in a narrow row — in the Index, the bestiary and the champion sheet. They are round everywhere again.',
  'release.0_4_1.ability_rows':
    'An ability list names its slot beside the ability instead of stamping it over the art.',

  'release.0_4_0.name': 'One Name, One Target',
  'release.0_4_0.one_word_names':
    'Champions go by one name. Only a Legendary or a Mythic earns a second — Aurelia Dawnwarden, Kaelith Stormcaller, Varkos Sunderking.',
  'release.0_4_0.target_then_ability':
    'Choosing an enemy no longer spends your turn: mark the target first, then pick the ability you want to cast on it.',
  'release.0_4_0.index_sorted':
    'The Index sorts champions under a heading per element and per role, and a champion’s page scrolls all the way to the end of their lore.',
  'release.0_4_0.gear_rack':
    'A worn piece shows its rarity on the rack, and Take off and Upgrade sit where you can find them.',
  'release.0_4_0.cooldown_on_icon':
    'An ability on cooldown prints the turns left on its icon instead of hiding them behind a hover.',
  'release.0_4_0.summon_buttons': 'The buttons under a summon are centred again.',

  'release.0_3_0.name': 'Your Call in Battle',
  'release.0_3_0.index':
    'The Chronicle Index is open: every champion, the bestiary of everything you have fought, all fourteen gear sets and every status effect in the game.',
  'release.0_3_0.mark_enemy':
    'Mark the enemy your team goes after and they all go after it — on auto as well as by hand — until it falls.',
  'release.0_3_0.drag_scroll': 'Hold the left button and drag to scroll anywhere the wheel scrolls.',
  'release.0_3_0.gear_from_level_1':
    'Gear can be worn from level 1, so the pieces the first stands drop are useful the moment they drop.',
  'release.0_3_0.boss_cards':
    'The boss notices left Emberhold’s sky; the keys you hold are on the mode cards where you pick the fight.',
  'release.0_3_0.hotkey_clipped': 'The key that casts an ability is readable on its icon.',

  'release.0_2_0.name': 'The Eternal Tower',
  'release.0_2_0.tower':
    'A hundred floors, climbed in order, opened by clearing the whole Intro campaign. Every tenth floor is a boss, and the climb resets with the season.',
  'release.0_2_0.eternal_key':
    'Eternal Keys pay for each attempt: one every three hours, ten in hand at most.',
  'release.0_2_0.account_power': 'The header carries your Account Power — every champion you own, summed.',

  'release.0_1_2.name': 'Second Batch',
  'release.0_1_2.battle_log_frame':
    'The battle log stays inside its panel instead of growing off the screen.',
  'release.0_1_2.summon_gate': 'A summoned champion lands in the middle of the ritual gate.',
  'release.0_1_2.champion_facing':
    'Five champions were fighting with their backs to the enemy. Every model’s facing is checked now.',

  'release.0_1_1.name': 'First Batch',
  'release.0_1_1.path_at_level_1':
    'The Chronicler’s Path opens at level 1 — the missions are what teach the game, so they start with it.',
  'release.0_1_1.gear_one_place':
    'A piece of gear lives in exactly one place: on the champion wearing it, or in the Armoury, never both.',
  'release.0_1_1.armoury_by_set': 'The Armoury groups the racks by gear set, each under its own crest.',

  'release.0_1_0.name': 'Early Access',
  'release.0_1_0.early_access':
    'Early Access 0.1: the campaign, battles, champions, gear, the Forge, the Portal, both bosses, quests, the Chronicler’s Path, the Idle Chest and the tutorial, all playable end to end.',
  'release.0_1_0.economy_measured':
    'A simulated month of play found the game about 1.8× more generous than planned, and the numbers in the design were corrected to what it actually pays.',
  'release.0_1_0.screen_errors':
    'A screen that fails now shows an in-world panel with a way back to Emberhold and a way to export your chronicle, instead of taking the game with it.',
  'release.0_1_0.copy_pass': 'Every line of text in the game was read through once for tone and punctuation.',

  'release.0_0_14.name': 'Onboarding',
  'release.0_0_14.tutorial':
    'Eldric walks you through the first hours: the first stand, your first summon, your first piece of gear — and you can wave him off at any point.',
  'release.0_0_14.provisions': 'The Chronicler’s Provisions pay you for each chapter you finish with him.',

  'release.0_0_13.name': 'The Chronicler’s Path',
  'release.0_0_13.path':
    'Ten chapters of missions that run the length of the game, each with a chest at the end.',
  'release.0_0_13.missions': '120 missions, from your first clear to mastering the campaign on Hard.',
  'release.0_0_13.eldric':
    'Eldric Lorekeeper joins the roster for finishing the last chapter — he cannot be summoned.',

  'release.0_0_12.name': 'Quests',
  'release.0_0_12.quests': 'Ten daily quests and eight weekly ones, rolling over at midnight and on Monday.',
  'release.0_0_12.points_track':
    'Each board has a points track with chests along it, so a partly finished day still pays.',

  'release.0_0_11.name': 'The Titan',
  'release.0_0_11.weekly_boss':
    'Titan, over three tiers, with a chorus that shields it and a health pool that takes a week of attempts to empty.',
  'release.0_0_11.phases':
    'Bosses change as they fall: new abilities, new immunities, an escort that must go first.',
  'release.0_0_11.titan_phases':
    'Titan turns at 90 % and 75 % of its pool rather than far down it, so a single key gets to see its second face.',

  'release.0_0_10.name': 'The Gargoyle',
  'release.0_0_10.daily_boss':
    'Gargoyle, over four tiers: spend a key, do as much damage as you can, and take the chest your total earns.',
  'release.0_0_10.boss_records':
    'Every boss keeps your best damage per tier, so there is always a number to beat.',
  'release.0_0_10.mechanics_sheet':
    'A sheet before the fight says how the boss fights, what it shrugs off, and when it enrages.',

  'release.0_0_9_1.name': 'Chest Pass',
  'release.0_0_9_1.chest_priced':
    'The Idle Chest pays against a single campaign run at the tier it farms — a good bonus for being away, never a reason to stay away.',
  'release.0_0_9_1.chest_materials':
    'The chest pays the materials of the settlement it farms, not of every settlement at once.',

  'release.0_0_9.name': 'The Idle Chest',
  'release.0_0_9.idle_chest':
    'A chest at the docks fills whether the game is open or closed, up to twelve hours at a time.',
  'release.0_0_9.farm_tier': 'What it pays follows the furthest settlement whose boss you have beaten.',
  'release.0_0_9.silent_summon': 'A summon can no longer spend your shards and show you nothing.',

  'release.0_0_8.name': 'The Summoning Portal',
  'release.0_0_8.portal': 'Four shards, two banners and a featured champion that turns over every fortnight.',
  'release.0_0_8.pity':
    'Mercy is printed where you can read it: how many pulls until a guarantee, and what that guarantee rolls with.',
  'release.0_0_8.reveal':
    'The reveal is its own ritual — runes, a shard, a gate, and ten cards with the best saved for last.',

  'release.0_0_7.name': 'The Forge',
  'release.0_0_7.forge':
    'Strike new gear from materials, break what you do not want back down, and put stars on what you keep.',
  'release.0_0_7.refine': 'Refining a piece rerolls a substat for a price you can see before you pay it.',

  'release.0_0_6.name': 'Gear',
  'release.0_0_6.gear':
    'Six slots per champion, six rarities, main stats and substats, and levels that pay for themselves.',
  'release.0_0_6.gear_sets': 'Fourteen gear sets, two- and four-piece, each with its own bonus.',

  'release.0_0_5.name': 'The Tavern',
  'release.0_0_5.tavern':
    'Level a champion on food, raise their rank with the same champion again, and sharpen their skills with tomes.',
  'release.0_0_5.ranks': 'Ranking up lifts a champion’s level cap and every stat they own.',

  'release.0_0_4.name': 'The Chronicle Level',
  'release.0_0_4.chronicle_level':
    'Your own level rises with every stand you clear, raising your energy cap and opening the game a piece at a time.',
  'release.0_0_4.titles': 'Titles are earned for what you have done, and worn on your profile.',

  'release.0_0_3.name': 'The Campaign',
  'release.0_0_3.campaign':
    'Twelve settlements, ten stands each, over three difficulties — 360 fights between Thornwood Crossing and the far side of Veyrath.',
  'release.0_0_3.stars':
    'Each stand keeps three stars for how well you cleared it, and pays a chest for filling them.',
  'release.0_0_3.energy': 'Energy refills on its own, all day, whether or not the game is open.',

  'release.0_0_2_1.name': 'A Coat of Paint',
  'release.0_0_2_1.ui_pass':
    'Panels, bars and sliders were rebuilt out of the game’s own frames, so no screen looks like a web page.',

  'release.0_0_2.name': 'Battles',
  'release.0_0_2.battles':
    'Turn-based fights on a turn meter: four champions, up to three waves, by hand or on auto.',
  'release.0_0_2.speeds': 'Battles run at ×1 to ×4, and the faster speeds are earned in the campaign.',
  'release.0_0_2.statuses':
    'Twenty-six status effects, from Attack Up to Fear, each with its own icon and its own rules.',

  'release.0_0_1.name': 'Champions',
  'release.0_0_1.champions':
    'Collect champions across four elements, three roles and six rarities, each with four abilities of their own.',
  'release.0_0_1.roster': 'Twenty-three champions to find, and a starter of your choosing to begin with.',

  'release.0_0_0.name': 'Emberhold',
  'release.0_0_0.emberhold':
    'The first build: Emberhold, the title screen, the settings and the shell the rest of the game is built inside.',
  'release.0_0_0.saves':
    'Your chronicle is saved on your own device, with no account, and can be exported to a file at any time.',
} as const;
