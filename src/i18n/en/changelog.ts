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

  'release.0_9_7.name': 'The Crest and the Climb',
  'release.0_9_7.results':
    'The end of every fight has been rebuilt. A victory rises in gold with its stars landing one by one; your champions stand as cards showing what each of them did, with the fight’s best marked MVP; and everything the fight paid is laid out as tiles.',
  'release.0_9_7.tower':
    'The Eternal Tower looks like a tower now: a hundred stone floors climbing upward. Pick any floor to see who holds it, their strength and what a clear pays; the season, your keys and all ten keepers sit beside it at a glance.',
  'release.0_9_7.defeat':
    'After a loss, the screen shows how close you came and what went wrong — out-sped, a healer left standing, champions below the enemy’s level — with a button straight to where each can be fixed, and quick ways to grow stronger.',
  'release.0_9_7.battle_setup':
    'The screen before a fight is a face-off: your team on one side and the enemy on the other, the power of each, a scout’s report on who is strong against whom, the stars there are to earn, and one clear button to begin.',
  'release.0_9_7.battle_hud':
    'The battle screen is sharper: clear counters for the wave, the turns and the time, a tidier dock for Auto and speed, and banners that announce each turn and each new wave.',
  'release.0_9_7.profile':
    'Your profile in the corner shows your level on a gold gem, your title, your progress to the next level and your power, and opens a new profile page with your standing, your stars and every title there is to earn.',
  'release.0_9_7.settings':
    'Settings are arranged in sections with a short line explaining every option, new switches, and the battle speed as a row of plates you can press.',
  'release.0_9_7.pause':
    'The pause menu shows where the fight stands, and asks once, clearly, before you retreat.',
  'release.0_9_7.tutorial_marks':
    'When Eldric only asks you to read, what he is talking about now lights up while he speaks — the stars and the spoils after your first victory, the energy he hands you, and each new feature as he introduces it.',
  'release.0_9_7.ability_numbers':
    'An ability’s description in battle now shows its numbers with your skill upgrades counted in.',
  'release.0_9_7.team_button':
    'The end of a lost fight no longer offers the same button twice, and the end of a tower, boss, brewery or dungeon fight no longer offers a Team button that led to the campaign.',
  'release.0_9_7.first_team':
    'Your very first fight now seats Bran and Wenna beside your champion, just as Eldric says, instead of whichever companions happened to be strongest.',

  'release.0_9_6.name': 'The Stall and the Shelf',
  'release.0_9_6.gold_market':
    'The Gold Market lays its six wares out as proper cards: each on a lit stand with what it is for and how many you already hold, how many are left, and a count to buy — from one to all your purse can reach — with the total before you pay.',
  'release.0_9_6.gem_market':
    'The Gem Market reads as a shelf: the nine things that never run out, each in its rarity’s colour with what it does and how many are in your Bag, then the four bundles with everything they hold shown by its icon, what those parts would cost on their own, and how much the bundle saves.',
  'release.0_9_6.rare_finds':
    'When the stall carries something rare — a Legendary Tome, an Ancient Shard or a Sacred Shard — it is framed in gold and marked as a rare find, so you will not walk past it.',
  'release.0_9_6.stamps':
    'Buying shows what you got right on the card, and a ware you have bought out or a bundle you have taken keeps its place with a stamp across it.',

  'release.0_9_5.name': 'Hearth and Harbour',
  'release.0_9_5.tavern':
    'The Tavern has been rebuilt around the champion you are raising. They stand framed between the seats, a road beneath them shows how far the table takes them towards their level cap, brews sit on a shelf showing what each is worth to them, and the panel shows their health, attack, defence and power before and after.',
  'release.0_9_5.forge':
    'The Forge feels like a smithy now. A storeroom beside every bench shows what you hold and what the next strike will take, crafting walks you through slot, tier and set with each tier’s odds and how many times you can afford it, and the anvil burns and rings when you strike.',
  'release.0_9_5.tavern_helpers':
    'In the Tavern, Pour to the cap picks the fewest brews that reach the level cap, your champion’s own element first. Filling the seats now leaves out anyone Rare or better or already levelled, and stops once the cap is reached.',
  'release.0_9_5.forge_benches':
    'Dismantling gathers what you pick on a scrap heap with everything it gives back, and refining sets the piece before and after side by side on a whetstone.',
  'release.0_9_5.hub':
    'Emberhold’s buildings wear lit medallions instead of red banners, and each says what is waiting inside: the next campaign stage, points to spend, missions to claim, when the market restocks. A ripple rolls out from any building with something for you, and resting your cursor on one tells you what it is for.',
  'release.0_9_5.idle_chest':
    'The Dockside Chest glows and throws light when it is full, shows how much of each reward it gathers an hour, and lists the odds of its lucky finds. Before your first boss falls, it shows what it will gather and offers the way to the Campaign.',
  'release.0_9_5.chest_ring': 'An emptied idle chest no longer shows a stray dot at the top of its ring.',

  'release.0_9_4.name': 'Every Mark in Its Place',
  'release.0_9_4.gear_tooltips':
    'Rest your cursor on a piece of gear — in the Armoury, on a champion, at the Forge or in a battle’s spoils — and it tells you everything about it: its power, its main stat, each substat with how many times it rolled, and its set’s bonus.',
  'release.0_9_4.champions':
    'The Champions screen has been rebuilt around the portrait. The name, rarity, element and role sit on the painting itself, the champion steps out of the frame’s corner in battle form, and a row of their abilities waits underneath — rest on one to read it, press it to open the full list. The stats carry icons, and what the champion wears is shown right under them.',
  'release.0_9_4.drops_marked':
    'A settlement’s drop list shows everything by its mark: each gear set by its emblem, each material and shard by its icon, with how many you get and how often. The Dungeons show each keep’s sets by their emblems too, and a keep’s stages name their rarities in their own colours.',
  'release.0_9_4.icons_everywhere':
    'Rewards and prices show their icons wherever they are listed: after a battle and a tower floor, when you level up, at the Forge, in the Tavern and in the boss chests.',
  'release.0_9_4.header':
    'The currencies across the top of the screen sit in round bronze sockets on a slim bar, and the Bag and the idle chest are built to match.',
  'release.0_9_4.difficulty_list':
    'The campaign’s difficulty list opens upwards when there is no room below it, so Normal and Hard can be chosen again.',
  'release.0_9_4.tooltip_edge':
    'Tall tooltips near the bottom of the screen open above your cursor instead of running off the edge.',

  'release.0_9_3.name': 'Marks of the Fourteen',
  'release.0_9_3.paintings':
    'Every piece of gear has its own painting now. All fourteen sets were drawn piece by piece — six pictures each, from the weapon down to the boots — so an Ember Guard helmet looks like an Ember Guard helmet, and no two pieces of a set look alike.',
  'release.0_9_3.emblems':
    'Every set has its own emblem — Ember Guard’s burning sword, Executioner’s skull and axe, Swiftfoot’s winged boot and the rest — and every piece wears its set’s emblem in the corner wherever it turns up: in the Armoury, on your champions, at the Forge and in whatever a battle drops.',
  'release.0_9_3.index_sets':
    'The Gear Sets page of the Chronicle Index leads each set with its emblem and shows all six of its pieces, so you know what you are hunting for before it ever drops.',
  'release.0_9_3.drops':
    'After a campaign victory, each piece that dropped is shown as a small picture with its set’s emblem, named in the colour of its rarity. A long auto-repeat shows the first dozen and counts the rest, instead of a list running off the bottom of the panel.',

  'release.0_9_2.name': 'Three Faces Out of the Stone',
  'release.0_9_2.varkos':
    'Varkos Sunderking has his own face at last. The Mythic orc king — half grey, half red, under a golden crown — now stands in the Chronicle Index, on the battlefield and anywhere else you meet him, instead of the lizard that was standing in for him.',
  'release.0_9_2.bosses':
    'The Gargoyle and the Titan have their own art too. The Gargoyle is a horned, moss-stained thing that crouches at the gate; the Titan is a mountain of scarred plate carrying a hammer the size of a door. Both of them were the same tinted lizard until now.',
  'release.0_9_2.facing':
    'Both bosses are drawn facing left, and the Boss Gate used to turn them around to face right — so the Gargoyle stood looking over its own shoulder. They now stand the way they were painted.',

  'release.0_9_1.name': 'A Clearer Bar',
  'release.0_9_1.bottom_bar':
    'The row of buttons along the bottom of Emberhold has been rebuilt. The five places you go — Champions, Armoury, Missions, Quests and the Index — now sit together on one rail, each with its own coloured mark above its name, so you can find the one you want without reading all five. Battle stays where it was, in red, on the right.',
  'release.0_9_1.boost_slots':
    'Your three boosts now always have a place beside your portrait, whether or not they are running. A boost that is active lights up in its own colour and counts down; one that is not sits there as an empty slot you can hover to see what it does and where to get it. Before, an inactive boost showed nothing at all, which told you nothing.',
  'release.0_9_1.daily_rewards':
    'The thirty-day calendar is called Daily Rewards now, and its button on the bottom bar simply says Rewards. It used to be called the Standing Welcome, which is a strange thing to say to someone who has been here for a year.',
  'release.0_9_1.bag_moved':
    'Your Bag has moved up to the top bar, next to your gold and your chest, with a count of what is in it. It opens from every screen now instead of only from Emberhold — which is the point of an item you use when you decide to.',

  'release.0_9_0.name': 'The Market and the Standing Welcome',
  'release.0_9_0.market':
    'There is a Market in Emberhold now, open from your very first hour, and it has two counters. Neither of them takes real money — nothing in this game ever will. One takes gold, the other takes gems, and they could not be less alike.',
  'release.0_9_0.welcome':
    'And there is a Standing Welcome: thirty days of rewards, one waiting for you each day you come back. Miss a day and you lose nothing at all — the board simply waits. The day you were owed is still the day you are owed.',
  'release.0_9_0.gold_stall':
    'The Gold Market is a stall that changes hands every hour. Six things, chosen at random, in whatever quantity the trader happened to bring: mostly iron, dust, brews and tomes, but now and then a Legendary Tome, and very rarely a Sacred Shard at a price you will have to save for. When the hour turns, everything changes, so a stall worth raiding is worth raiding now.',
  'release.0_9_0.gem_shelf':
    'The Gem Market never changes and never runs out. A Brewery Token puts your twenty daily runs back to twenty. Three boosts double your champions’ experience, your own experience, or the brews the cellars pour, each for a day. Two vouchers put a quest board back to untouched. A Mission Skip Token closes the step you are stuck on — unpaid, but properly closed. And for the very patient: the Champion’s Chicken, which takes one champion straight to the top of their stars, and the Champion’s Cheatmeal, which gives them every star they could ever wear.',
  'release.0_9_0.bundles':
    'Four bundles sit at the end of that shelf, each close to a third cheaper than buying its parts one at a time — and each can be taken once per chronicle, so choose your moment.',
  'release.0_9_0.bag':
    'Everything you buy goes into a Bag rather than being used on the spot, and there it waits until you say so. Every row tells you exactly what using it would do, because you will have forgotten by the time you want it.',
  'release.0_9_0.boosts':
    'Boosts stack in time, not in strength: use three Chronicle XP Boosts and you have seventy-two hours of double experience, not one hour of eight times. While one is running it wears a small badge beside your portrait at the top of the screen, counting down, on every screen you visit.',
  'release.0_9_0.no_streak':
    'The Welcome has no streak to break and never resets — the rewards are scattered across the thirty days rather than climbing, except for the last three, which are the best on the board. Claim the thirtieth and the board starts again at the first, for as long as you keep playing.',

  'release.0_8_0.name': 'The Five Keeps',
  'release.0_8_0.dungeons':
    'There are Dungeons now, on the Battle menu between the Campaign and the Bosses, and they are open from your very first hour. Four keeps stand ready — Cindervault, the Pale Expanse, Velkora’s Cradle and Ashenreach — each one held by a keeper who never leaves it.',
  'release.0_8_0.sets_per_keep':
    'Every gear set in the game belongs to exactly one keep, so at last you can go and farm the set you actually want. Cindervault holds the armour a new roster is built on; the Pale Expanse holds resistance, accuracy and regeneration; Velkora’s Cradle holds the crit sets; and Ashenreach, the hardest of the four, holds speed, the extra turn, lifesteal and the stun.',
  'release.0_8_0.forty_rungs':
    'Each keep is twenty stages on Normal and twenty more on Hard. Stages are taken in order, and Hard opens in a keep only once you have taken that keep’s twentieth stage on Normal. Stage one is a fight for your first evening; stage twenty is not.',
  'release.0_8_0.what_falls':
    'Every clear leaves a piece of gear behind, always, and deeper stages can leave two. The deeper you go the better the stars and the better the rarity — and the more energy a run costs, so the price of a stage tells you what it pays. There is gold and experience as well, and, very rarely, a shard for the Portal.',
  'release.0_8_0.gilded_veil':
    'A fifth keep, the Gilded Veil, can be seen but not yet entered: it guards necklaces, rings and trinkets, and there is nowhere to wear those yet. It will open when there is.',
  'release.0_8_0.softer_campaign':
    'The campaign hits a little less hard on all three difficulties — every enemy on the map is about eight per cent weaker than it was. Nothing else about a stand has changed.',
  'release.0_8_0.more_chronicle_xp':
    'Campaign stands pay a little more of your own experience again, on top of the last increase.',

  'release.0_7_2.name': 'A Kinder Campaign, a Stingier Armoury',
  'release.0_7_2.campaign_xp':
    'Campaign stands pay more experience than they did — a little more for you, a bit more for the champions who fought. The same map, climbed faster.',
  'release.0_7_2.brew_xp':
    'Every brew is worth more champion experience: 1,700 instead of 1,500, and 2,550 when it matches the champion’s element.',
  'release.0_7_2.more_drops':
    'Campaign stands leave gear behind more often — roughly one run in four or five rather than one in five or six, and one boss stand in two.',
  'release.0_7_2.rarity_ladder':
    'What falls is more modest, though, and a difficulty now has a ceiling. Intro stands drop nothing better than Rare, Normal opens Epic and the occasional Legendary, and only Hard will ever leave a Mythic on the ground. Epic armour is still there for the taking long before Hard — at the Forge, and in the chests the Gargoyle and the Titan pay.',

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
