/**
 * The Chronicle of Changes: the patch notes the player reads on the title screen and in Settings
 * (docs/tech/CONTENT_AUTHORING.md §13). One key per line of `src/content/changelog/index.ts`,
 * grouped by release, newest first.
 *
 * Plain and short: one fact per line, said once. Name the feature and what changed for the player
 * — numbers, unlock levels, what it replaces. No lore, no file paths, no version numbers inside a
 * line. The panel groups lines under New, Content, Changed, Balance and Fixed, so a line never
 * starts with "New:" or "Fixed:" itself.
 *
 * This table is not part of the dictionary the first screen loads: it is the largest the game has
 * and it grows with every release, so it arrives with the panel that prints it and joins the
 * dictionary then (`registerStrings`, ADR-049). The panel's own labels live in `ui.ts`.
 */
export const changelog = {
  'release.0_13_1.name': 'Title Screen & Patch Notes',
  'release.0_13_1.title_screen':
    'Reworked title screen: your saved game is shown as a card with portrait, level, XP, power, champions, campaign progress and when you last played.',
  'release.0_13_1.patch_notes':
    'Patch notes rewritten: shorter entries, nothing repeated, and each version grouped into New, Content, Changed, Balance and Fixed.',
  'release.0_13_1.notes_loading':
    'The patch notes window no longer shows up empty for a moment when the title screen opens.',
  'release.0_13_1.logo_shine': 'The shine across the logo no longer lights up a box around it.',
  'release.0_13_1.notes_facts':
    'Corrected older patch notes: Eternal Key refill time, what Refine does and what rank-ups use.',

  'release.0_13_0.name': 'The Unwritten (Roguelite)',
  'release.0_13_0.unwritten':
    'The Unwritten, a roguelite game mode (unlocks at level 16): each run crosses three randomly drawn maps, and each map ends in a boss (Warden).',
  'release.0_13_0.company':
    'Bring up to 6 champions per run (more with Scriptorium upgrades); 4 fight at a time and damage carries over between fights.',
  'release.0_13_0.inscriptions':
    '54 run-only upgrades (inscriptions) in four inks. Collecting 3 and 6 of one ink unlocks bonuses, and holding two inks unlocks blended inscriptions.',
  'release.0_13_0.events':
    'Map events: 20 mysteries, shrines, a shop (the Peddler), relic chests, and Echoes — champions who join you for one run.',
  'release.0_13_0.relics': '24 relics and 8 curses (blots) that change the rules of a run.',
  'release.0_13_0.omens':
    '16 difficulty levels (Omens), each adding a modifier. Your first win on each pays a one-time reward.',
  'release.0_13_0.scriptorium':
    'Scriptorium: 16 permanent upgrades bought with Pages, which every run earns, win or lose.',
  'release.0_13_0.tithe':
    'Weekly reward: the first 6 Wardens you defeat each week pay gold, brews, materials and Skill Tomes (Legendary Tomes from Omen 8).',
  'release.0_13_0.records': 'Run summary after every run, a Records tab, and runs that save mid-map.',
  'release.0_13_0.deeds':
    'Hall of Deeds: new Unwritten category with 4 achievements, 4 challenges, a portrait frame and a title.',
  'release.0_13_0.modes': 'Game Modes and the hub show your open Omen and the weekly rewards left.',
  'release.0_13_0.wallet': 'The Wallet lists the Unwritten as a source for the currencies it pays.',
  'release.0_13_0.ranks': 'Hall of Deeds ranks 7–10 now need 2,500 / 3,800 / 5,600 / 7,700 renown.',

  'release.0_12_0.name': 'Hall of Deeds (Achievements & Challenges)',
  'release.0_12_0.hall': 'Hall of Deeds (unlocks at level 13): 37 achievements, each with 5 reward tiers.',
  'release.0_12_0.challenges':
    '20 one-time challenges, e.g. win a Hard stage with no champion above Uncommon, or beat a settlement boss on Hard with one champion.',
  'release.0_12_0.renown': 'Claims give renown, which raises your Hall rank (10 ranks, each with a reward).',
  'release.0_12_0.frames': '7 portrait frames earned from ranks and challenges.',
  'release.0_12_0.titles':
    '4 new titles: Rabble-Rouser, Banneret, Sovereign of the Tower and Legend of the Chronicle.',
  'release.0_12_0.retroactive':
    'Progress you made before the update counts, and Claim all collects every reward at once.',
  'release.0_12_0.profile': 'Choose your portrait frame in the profile.',
  'release.0_12_0.gear':
    'Equipped gear stats and set bonuses now apply in battle (they were shown but ignored).',
  'release.0_12_0.bulwark': 'Bulwark set shield now blocks 20% of max HP as described (was 0.2%).',

  'release.0_11_0.name': 'Instant Clears',
  'release.0_11_0.instant':
    'Instant clears (unlocks at level 11): stages with 3 stars can be cleared without fighting, for the same energy and rewards.',
  'release.0_11_0.count':
    'Clear several times at once with the repeat count; a results page totals the rewards.',
  'release.0_11_0.team': 'Champions in the team still gain XP from instant clears.',
  'release.0_11_0.marks': 'Stages with 3 stars are marked in the stage list.',
  'release.0_11_0.launch': 'Battle setup shows the repeat count and Manual/Auto side by side.',
  'release.0_11_0.quests':
    'Instant clears count for ‘clear stages’ and ‘spend energy’ quests, but not for ‘win battles’.',

  'release.0_10_0.name': 'The Mine',
  'release.0_10_0.mine':
    'The Mine (unlocks at level 6): produces gems over time, even while you are offline.',
  'release.0_10_0.levels':
    '10 upgrade levels, paid with gold and Forge materials; each level produces and stores more.',
  'release.0_10_0.sigils': 'From level 4 the Mine also produces Glyph Sigils.',
  'release.0_10_0.store': 'Partial gems carry over between collections, so collecting often loses nothing.',
  'release.0_10_0.fountain':
    'The Mine is entered from the fountain on the hub, which shows when storage is full.',
  'release.0_10_0.first_store': 'The Mine starts with a full store, including on existing saves.',

  'release.0_9_10.name': 'Titan Easy Tier, Eternal Keys & Fixes',
  'release.0_9_10.titan_easy': 'Titan: new Easy tier with a tenth of Normal’s health.',
  'release.0_9_10.eternal_keys':
    'Eternal Keys can be bought: 5 for 150 gems in the Wallet or the Eternal Tower, even above the 10-key cap.',
  'release.0_9_10.boss_gate': 'Boss screens open on the tier you last fought.',
  'release.0_9_10.pale_herald':
    'Pale Herald heals 8% of its HP as its ability says, instead of healing fully.',
  'release.0_9_10.wallet_sources':
    'The Wallet lists every source of each currency, including the Eternal Tower, the Dungeons and Idle Chest energy.',
  'release.0_9_10.varkos':
    'Summoning Portal: Varkos is featured in every Primordial Rotation, and no Legendary is featured twice in a row.',
  'release.0_9_10.obtain':
    'Champion pages show correct sources: Common champions no longer list campaign drops, and Epics note they can be picked for mastering a difficulty.',

  'release.0_9_9.name': 'Missions, Quests, Wallet & Bag Rework',
  'release.0_9_9.path':
    'Chronicler’s Path rework: chapter tabs with progress, mission cards by task type, and each chapter chest’s contents.',
  'release.0_9_9.go':
    'Unfinished missions and quests have a Go button that takes you to where they are done.',
  'release.0_9_9.ledger':
    'Quests rework: a points track with every chest and its rewards; claimable quests are listed first.',
  'release.0_9_9.daily_rewards': 'Daily Rewards shows all 30 days at once, with today’s reward highlighted.',
  'release.0_9_9.wallet':
    'Wallet rework: all holdings at a glance, and for each currency its amount, refill time, sources and uses, each with a Go button.',
  'release.0_9_9.energy_refill':
    'Energy can be bought in the Wallet: 100 energy for 50 gems, even above the cap.',
  'release.0_9_9.bag':
    'Bag rework: an item grid with details for the selected item, such as boost time left and Brewery runs left.',
  'release.0_9_9.wallet_zero': 'The Wallet no longer shows energy and keys as 0.',
  'release.0_9_9.stage_numbers': 'Stage numbers such as 4-10 no longer wrap onto two lines on mission cards.',

  'release.0_9_8.name': 'Summoning, Portal & Brewery Rework',
  'release.0_9_8.summoning':
    'New summoning animation: the gate builds up through the rarity colours, pauses before Legendary, and bursts bigger for rarer champions (slow motion for Mythic).',
  'release.0_9_8.brewery':
    'Brewery rework: hall cards show your progress and brews held; stages show their enemies, their power against your best team, and rewards.',
  'release.0_9_8.portal':
    'Summoning Portal rework: shards with their contents and counts, both summon buttons under the gate, and rates and pity shown as bars.',
  'release.0_9_8.cards':
    'Summon results: single summons reveal one card; 10× summons deal ten cards face down and flip them, best last.',
  'release.0_9_8.sounds': 'New summoning sounds for the charge, each rarity, the reveal and the cards.',
  'release.0_9_8.brewery_week':
    'Brewery halls show their open days and how many brews your remaining runs can still earn today.',
  'release.0_9_8.tutorial_strip':
    'Tutorial hints move to the top of the screen when the highlighted button is near the bottom.',
  'release.0_9_8.owed': 'Champions the campaign owes you appear on their own card in the Portal.',

  'release.0_9_7.name': 'Battle Screens, Tower & Settings Rework',
  'release.0_9_7.results':
    'Battle results rework: animated stars, stats per champion with an MVP, and rewards as tiles.',
  'release.0_9_7.tower':
    'Eternal Tower rework: floors drawn as a tower; select any floor to see its enemies, power and rewards.',
  'release.0_9_7.defeat':
    'The defeat screen shows why you lost (speed, healers, level gap) with buttons to what fixes it.',
  'release.0_9_7.battle_setup':
    'Battle setup rework: your team against the enemy with power, matchups and the stars to earn.',
  'release.0_9_7.battle_hud':
    'Battle HUD: clearer wave, turn and time counters, a tidier Auto and speed dock, and turn and wave banners.',
  'release.0_9_7.profile':
    'The profile chip shows level, title, XP progress and power; the profile page lists your stats and every title.',
  'release.0_9_7.settings':
    'Settings are grouped into sections with a description for every option; battle speed is a row of buttons.',
  'release.0_9_7.pause': 'The pause menu shows the battle state and asks before you retreat.',
  'release.0_9_7.tutorial_marks':
    'The tutorial highlights what Eldric is talking about during read-only steps.',
  'release.0_9_7.ability_numbers': 'Ability descriptions in battle include your skill upgrades.',
  'release.0_9_7.team_button':
    'Result screens no longer show a duplicate button, or a Team button that opened the campaign after tower, boss, Brewery and Dungeon fights.',
  'release.0_9_7.first_team': 'Your first battle uses Bran and Wenna, as the tutorial says.',

  'release.0_9_6.name': 'Market Rework',
  'release.0_9_6.gold_market':
    'Gold Market rework: each item on its own card with its use, how many you own, stock left, and a quantity picker with the total price.',
  'release.0_9_6.gem_market':
    'Gem Market rework: 9 consumables with their effects and Bag counts, and 4 bundles with contents, value and savings.',
  'release.0_9_6.rare_finds':
    'Rare Gold Market items (Legendary Tome, Ancient or Sacred Shard) are highlighted.',
  'release.0_9_6.stamps':
    'Purchases show what you got on the card; sold-out items and claimed bundles are stamped.',

  'release.0_9_5.name': 'Tavern, Forge, Hub & Idle Chest Rework',
  'release.0_9_5.tavern':
    'Tavern rework: the champion in focus, level-cap progress, brews with their XP values, and stats before and after.',
  'release.0_9_5.forge':
    'Forge rework: material counts and costs on every bench; crafting shows each tier’s odds and how many crafts you can afford.',
  'release.0_9_5.tavern_helpers':
    'Tavern: ‘Pour to the cap’ picks the fewest brews to reach the level cap, matching element first; auto-fill skips Rare and better and already levelled champions.',
  'release.0_9_5.forge_benches':
    'Dismantle shows everything you get back; Refine shows the piece before and after.',
  'release.0_9_5.hub':
    'Hub buildings show status lines (next stage, points, missions, restock time) and pulse when something is ready.',
  'release.0_9_5.idle_chest':
    'The Idle Chest shows its hourly rewards and bonus-find odds, and glows when full.',
  'release.0_9_5.chest_ring': 'An emptied Idle Chest no longer shows a stray dot on its ring.',

  'release.0_9_4.name': 'Gear Tooltips & Champions Rework',
  'release.0_9_4.gear_tooltips':
    'Gear tooltips everywhere: power, main stat, substats with roll counts, and set bonus.',
  'release.0_9_4.champions':
    'Champions screen rework: name, rarity, element and role on the portrait, abilities below it, and stats with icons and equipped gear.',
  'release.0_9_4.drops_marked':
    'Settlement drop lists show set emblems and item icons with amounts and rates; Dungeons show their sets by emblem.',
  'release.0_9_4.icons_everywhere': 'Rewards and prices show their icons everywhere.',
  'release.0_9_4.header':
    'Top bar: currencies in bronze sockets, with the Bag and Idle Chest restyled to match.',
  'release.0_9_4.difficulty_list':
    'The campaign difficulty list opens upwards when there is no room below, so Normal and Hard can be selected.',
  'release.0_9_4.tooltip_edge': 'Tall tooltips near the bottom of the screen open above the cursor.',

  'release.0_9_3.name': 'Gear Art & Set Emblems',
  'release.0_9_3.paintings': 'Every gear piece has its own art: 14 sets × 6 pieces.',
  'release.0_9_3.emblems': 'Every set has an emblem, shown on its pieces everywhere.',
  'release.0_9_3.index_sets':
    'Chronicle Index: the Gear Sets page shows each set’s emblem and all six pieces.',
  'release.0_9_3.drops':
    'Battle drops show each piece with its emblem and rarity colour; long auto-repeats list the first 12 and count the rest.',

  'release.0_9_2.name': 'Varkos & Boss Art',
  'release.0_9_2.varkos': 'Varkos Sunderking has his own art (he used a placeholder).',
  'release.0_9_2.bosses': 'The Gargoyle and the Titan have their own art (they used placeholders).',
  'release.0_9_2.facing': 'Bosses face the right way on the boss screen.',

  'release.0_9_1.name': 'Bottom Bar, Boosts & Bag',
  'release.0_9_1.bottom_bar':
    'Hub bottom bar rework: Champions, Armoury, Missions, Quests and Index on one rail with colour-coded icons; Battle stays on the right.',
  'release.0_9_1.boost_slots':
    'All three boosts have fixed slots next to your portrait; active ones count down, inactive ones explain where to get them.',
  'release.0_9_1.daily_rewards':
    'The ‘Standing Welcome’ is renamed Daily Rewards (its button reads Rewards).',
  'release.0_9_1.bag_moved': 'The Bag moved to the top bar with an item count and opens from every screen.',

  'release.0_9_0.name': 'Market, Bag, Boosts & Login Rewards',
  'release.0_9_0.market':
    'The Market, open from the start: a Gold Market and a Gem Market. No real money is used anywhere in the game.',
  'release.0_9_0.welcome':
    'Login calendar: 30 days with one reward for each day you play. There is no streak to lose, and it repeats after day 30.',
  'release.0_9_0.gold_stall': 'Gold Market: 6 random items that change every hour.',
  'release.0_9_0.gem_shelf':
    'Gem Market: 9 consumables with unlimited stock — Brewery Token, three 24-hour boosts, two quest vouchers, Mission Skip Token, Champion’s Chicken and Champion’s Cheatmeal.',
  'release.0_9_0.bundles': '4 one-time bundles at about 30% off.',
  'release.0_9_0.bag': 'Bag: bought items are stored and used when you choose.',
  'release.0_9_0.boosts':
    'Boosts stack in duration, not strength; active boosts show a timer next to your portrait.',

  'release.0_8_0.name': 'Dungeons',
  'release.0_8_0.dungeons':
    'Dungeons, open from the start: 4 dungeons, each dropping specific gear sets, so you can farm the sets you want.',
  'release.0_8_0.forty_rungs':
    '20 Normal and 20 Hard stages per dungeon; Hard unlocks after Normal stage 20.',
  'release.0_8_0.what_falls':
    'Every clear drops gear; deeper stages drop better gear, can drop two pieces and cost more energy. Also gold, XP and rare Portal shards.',
  'release.0_8_0.gilded_veil':
    'A fifth dungeon (necklaces, rings, trinkets) is shown locked until accessories exist.',
  'release.0_8_0.softer_campaign': 'Campaign enemies are about 8% weaker on all difficulties.',
  'release.0_8_0.more_chronicle_xp': 'Campaign stages give more player XP.',

  'release.0_7_2.name': 'Campaign XP & Drops',
  'release.0_7_2.campaign_xp': 'Campaign stages give more player and champion XP.',
  'release.0_7_2.brew_xp': 'Brews give 1,700 champion XP (was 1,500), or 2,550 when the element matches.',
  'release.0_7_2.more_drops':
    'Gear drops more often: about 1 in 4–5 stages (was 1 in 5–6), and 1 in 2 boss stages.',
  'release.0_7_2.rarity_ladder':
    'Drop rarity is capped by difficulty: Intro up to Rare, Normal up to Epic with some Legendary, Mythic only on Hard. Epic gear also comes from the Forge and boss chests.',

  'release.0_7_1.name': 'Boss Names: Gargoyle & Titan',
  'release.0_7_1.names': 'The daily boss is now called the Gargoyle and the weekly boss the Titan.',
  'release.0_7_1.bosses_menu':
    'Both are on one Bosses card in Game Modes, with a menu showing their schedule and keys.',
  'release.0_7_1.kit_names':
    'Their abilities and keys were renamed to match (Gargoyle Keys, Titan Keys), including in quests.',
  'release.0_7_1.nothing_lost': 'Your damage, chests and records carry over.',

  'release.0_7_0.name': 'The Brewery',
  'release.0_7_0.brewery':
    'The Brewery (unlocks at level 3): four halls, one per element, where you farm the brews that level champions.',
  'release.0_7_0.twenty_runs': '20 runs per day, shared across all halls; they reset at midnight.',
  'release.0_7_0.five_stages': '5 stages per hall; stage N gives N brews.',
  'release.0_7_0.waning_cellar':
    'The Eclipse hall opens on Wednesday, Saturday and Sunday only; a closed hall costs no runs.',
  'release.0_7_0.element_wheel': 'Each hall shows which elements have the advantage inside.',

  'release.0_6_0.name': 'The Glorious Palace',
  'release.0_6_0.palace':
    'The Glorious Palace: a 133-node skill tree with permanent bonuses — HP for all champions, plus one branch per element.',
  'release.0_6_0.points':
    'Skill points come from settlement bosses (on each difficulty), every 5th Eternal Tower floor (each season), and emptying the Gargoyle’s (1) or Titan’s (3) damage pool.',
  'release.0_6_0.purple_line':
    'Champion stats show the Palace bonus in purple next to gear bonuses in green.',
  'release.0_6_0.free_reset': 'Reset all points at any time for free.',
  'release.0_6_0.old_chronicles': 'Existing saves receive the points already earned from beaten settlements.',

  'release.0_5_1.name': 'Champion Art: Bran, Maelis, Reva & Corvin',
  'release.0_5_1.four_champions':
    'Bran, Maelis, Reva and Corvin have their own art: portraits, battle sprites and idle animations.',

  'release.0_5_0.name': 'Patch Notes',
  'release.0_5_0.chronicle_of_changes':
    'Patch notes on the title screen, newest first, with filters by type.',
  'release.0_5_0.settings_button': 'The same patch notes open from Settings.',
  'release.0_5_0.title_layout': 'Title screen layout: menu on the left, patch notes on the right.',

  'release.0_4_2.name': 'Battle Log',
  'release.0_4_2.battle_log':
    'Battle log lines have icons and coloured markers for turns, critical hits, heals and deaths.',
  'release.0_4_2.log_names':
    'Champion names use rarity colours and enemy names element colours; buffs and debuffs show their icons.',

  'release.0_4_1.name': 'Ability Icons',
  'release.0_4_1.ability_icons':
    'Ability icons are round again in narrow lists (Index, bestiary, champion page).',
  'release.0_4_1.ability_rows': 'Ability lists show the slot next to the ability instead of over its icon.',

  'release.0_4_0.name': 'Targeting, Names & Index Sorting',
  'release.0_4_0.target_then_ability':
    'Select a target first, then an ability — selecting a target no longer ends your turn.',
  'release.0_4_0.one_word_names':
    'Champions use one name; only Legendary and Mythic champions have a second.',
  'release.0_4_0.index_sorted':
    'The Index groups champions by element and role; champion pages scroll to the end of their lore.',
  'release.0_4_0.gear_rack': 'Equipped gear shows its rarity, and Take off and Upgrade are easier to find.',
  'release.0_4_0.cooldown_on_icon': 'Abilities on cooldown show the turns left on their icon.',
  'release.0_4_0.summon_buttons': 'The buttons under summon results are centred again.',

  'release.0_3_0.name': 'Chronicle Index & Enemy Targeting',
  'release.0_3_0.index':
    'The Chronicle Index: every champion, a bestiary, all gear sets and every status effect.',
  'release.0_3_0.mark_enemy': 'Mark an enemy as the whole team’s target, in manual and auto.',
  'release.0_3_0.drag_scroll': 'Drag with the left mouse button to scroll anywhere the mouse wheel scrolls.',
  'release.0_3_0.gear_from_level_1': 'Gear can be equipped from level 1.',
  'release.0_3_0.boss_cards':
    'Boss notices were removed from the hub; boss keys show on the Game Modes cards.',
  'release.0_3_0.hotkey_clipped': 'The ability hotkey number is readable on its icon.',

  'release.0_2_0.name': 'The Eternal Tower',
  'release.0_2_0.tower':
    'The Eternal Tower, unlocked by clearing all Intro stages: 100 floors, a boss every 10th floor, and the climb resets each 30-day season.',
  'release.0_2_0.eternal_key': 'Eternal Keys pay for attempts: one every 15 minutes, up to 10.',
  'release.0_2_0.account_power': 'Account Power (the combined power of all your champions) in the top bar.',

  'release.0_1_2.name': 'Battle & Summon Fixes',
  'release.0_1_2.battle_log_frame': 'The battle log stays inside its panel.',
  'release.0_1_2.summon_gate': 'Summoned champions appear in the centre of the gate.',
  'release.0_1_2.champion_facing':
    'Five champions faced away from the enemy; all champions now face the right way.',

  'release.0_1_1.name': 'Missions & Armoury',
  'release.0_1_1.path_at_level_1': 'The Chronicler’s Path unlocks at level 1.',
  'release.0_1_1.gear_one_place': 'Equipped gear no longer also appears in the Armoury.',
  'release.0_1_1.armoury_by_set': 'The Armoury groups gear by set.',

  'release.0_1_0.name': 'Early Access',
  'release.0_1_0.early_access':
    'First Early Access build: campaign, battles, champions, gear, Forge, Summoning Portal, both bosses, quests, the Chronicler’s Path, Idle Chest and tutorial.',
  'release.0_1_0.screen_errors':
    'If a screen fails, an error panel lets you return to the hub or export your save.',

  'release.0_0_14.name': 'Tutorial',
  'release.0_0_14.tutorial':
    'Tutorial with Eldric covering the first hours: first stage, first summon and first gear. It can be skipped.',
  'release.0_0_14.provisions': 'Tutorial chapters reward energy (Chronicler’s Provisions).',

  'release.0_0_13.name': 'The Chronicler’s Path (Missions)',
  'release.0_0_13.path': 'The Chronicler’s Path: 120 missions in 10 chapters, with a chest for each chapter.',
  'release.0_0_13.eldric':
    'Finishing the last chapter unlocks Eldric Lorekeeper, a champion who cannot be summoned.',

  'release.0_0_12.name': 'Daily & Weekly Quests',
  'release.0_0_12.quests': 'Daily (10) and weekly (8) quests, resetting at midnight and on Monday.',
  'release.0_0_12.points_track': 'Quest points unlock chests along a track.',

  'release.0_0_11.name': 'The Titan (Weekly Boss)',
  'release.0_0_11.weekly_boss':
    'Weekly boss: the Titan, with three tiers, a chorus that shields it, and a damage pool that takes a week to empty.',
  'release.0_0_11.phases': 'Bosses change phases, with new abilities, immunities and escorts.',
  'release.0_0_11.titan_phases': 'The Titan’s phases start at 90% and 75% of its pool.',

  'release.0_0_10.name': 'The Gargoyle (Daily Boss)',
  'release.0_0_10.daily_boss':
    'Daily boss: the Gargoyle, with four tiers. Spend a key, deal as much damage as you can, and earn chests by total damage.',
  'release.0_0_10.boss_records': 'Your best damage is recorded for each boss tier.',
  'release.0_0_10.mechanics_sheet': 'A boss sheet shows its mechanics, immunities and enrage.',

  'release.0_0_9_1.name': 'Idle Chest Rebalance',
  'release.0_0_9_1.chest_priced': 'Idle Chest rewards reduced to a small bonus based on one campaign run.',
  'release.0_0_9_1.chest_materials':
    'The Idle Chest gives the materials of the settlement it farms, not of every settlement.',

  'release.0_0_9.name': 'The Idle Chest',
  'release.0_0_9.idle_chest': 'Idle Chest: collects rewards over time, even while the game is closed.',
  'release.0_0_9.farm_tier': 'Its rewards scale with the furthest settlement boss you have beaten.',
  'release.0_0_9.silent_summon': 'Summoning no longer spends shards without showing the result.',

  'release.0_0_8.name': 'The Summoning Portal',
  'release.0_0_8.portal':
    'Summoning Portal: 4 shard types, 2 banners, and a featured champion that changes every 14 days.',
  'release.0_0_8.pity': 'Pity counters show how many summons are left until a guarantee.',
  'release.0_0_8.reveal': 'Summon reveal animation; 10× summons reveal the best champion last.',

  'release.0_0_7.name': 'The Forge',
  'release.0_0_7.forge':
    'Forge: craft gear from materials, dismantle gear you do not want, and refine gear to raise its stars.',

  'release.0_0_6.name': 'Gear',
  'release.0_0_6.gear': 'Gear: 6 slots, 6 rarities, main stats and substats, and upgrade levels.',
  'release.0_0_6.gear_sets': '14 gear sets with 2- and 4-piece bonuses.',

  'release.0_0_5.name': 'The Tavern',
  'release.0_0_5.tavern':
    'Tavern: level up champions, rank them up by using champions of the same star rank, and upgrade skills with tomes.',
  'release.0_0_5.ranks': 'Ranking up raises a champion’s level cap and stats.',

  'release.0_0_4.name': 'Player Level & Titles',
  'release.0_0_4.chronicle_level':
    'Player level: earned by clearing stages; raises your energy cap and unlocks features.',
  'release.0_0_4.titles': 'Titles are earned by reaching milestones and shown on your profile.',

  'release.0_0_3.name': 'The Campaign',
  'release.0_0_3.campaign': 'Campaign: 12 settlements × 10 stages on 3 difficulties (360 stages).',
  'release.0_0_3.stars': 'Up to 3 stars per stage, with chests for collecting stars.',
  'release.0_0_3.energy': 'Energy refills over time, even while the game is closed.',

  'release.0_0_2_1.name': 'UI Polish',
  'release.0_0_2_1.ui_pass': 'Panels, bars and sliders use the game’s own UI art.',

  'release.0_0_2.name': 'Battles',
  'release.0_0_2.battles': 'Turn-based battles on a turn meter, with up to three waves, in manual or auto.',
  'release.0_0_2.speeds': 'Battle speed ×1 to ×4; the faster speeds unlock through the campaign.',
  'release.0_0_2.statuses': '26 status effects, each with its own icon.',

  'release.0_0_1.name': 'Champions',
  'release.0_0_1.champions': 'Champions across 4 elements, 4 roles and 6 rarities, each with 1–4 abilities.',
  'release.0_0_1.roster': '23 champions to collect, and a starter of your choice.',

  'release.0_0_0.name': 'First Build',
  'release.0_0_0.emberhold': 'The hub (Emberhold), the title screen and settings.',
  'release.0_0_0.saves': 'Your save is stored on your device with no account, and can be exported to a file.',
} as const;
