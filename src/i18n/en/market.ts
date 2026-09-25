/**
 * The Market, the Bag and the Login Calendar (docs/design/MARKET.md, docs/design/LOGIN.md).
 *
 * An item's description says exactly what using it does, in the words a player would use and with
 * no jargon: a tooltip that has to be decoded is a tooltip that gets a refund request.
 */
export const market = {
  /* ---- The Market ---- */
  'market.title': 'The Market',
  'market.tab.gold': 'Gold Market',
  'market.tab.gems': 'Gem Market',
  'market.gold.blurb': 'Whatever came in this hour. When the hour turns, so does the stall.',
  'market.gems.blurb': 'The same shelf, always. Nothing here ever runs out.',
  'market.rotates': 'New stock in {time}',
  'market.buy': 'Buy',
  'market.sold': 'Sold out',
  'market.taken': 'Already taken',
  'market.takenStamp': 'Taken',
  'market.cannotAfford': 'Not enough',
  'market.stock': '{count} left',
  'market.each': 'each',
  'market.held': 'You hold {count}',
  'market.inBag': 'In your Bag ×{count}',
  'market.gain': '+{count}',
  'market.quantity': 'How many to buy',
  'market.less': 'One fewer',
  'market.more': 'One more',
  'market.max': 'Max',
  'market.rareFind': 'Rare find',
  'market.bundleOnce': 'Once per chronicle',
  'market.holds': 'Holds',
  'market.worth': 'Worth {price} bought singly',
  'market.saving': 'Save {percent}%',
  'market.section.singles': 'Always on the shelf',
  'market.section.singlesLine': 'Nine things that never run out, sold one at a time.',
  'market.section.bundles': 'Bundles',
  'market.section.bundlesLine': 'Each can be taken once per chronicle — {open} of {total} still on offer.',
  /* What a single is for, over its name. */
  'market.kind.boost': 'Boost · {hours} h',
  'market.kind.brewery': 'The Brewery',
  'market.kind.daily': 'Today’s quests',
  'market.kind.weekly': 'This week’s quests',
  'market.kind.path': 'The Chronicler’s Path',
  'market.kind.champion': 'One champion',

  /* ---- The Bag ---- */
  'bag.title': 'Your Bag',
  'bag.subtitle': 'What you are holding, and what it does when you use it.',
  'bag.open': 'Bag',
  'bag.empty': 'Your Bag is empty. The Market and the Calendar both fill it.',
  'bag.count': '×{count}',
  'bag.use': 'Use',
  'bag.useOn': 'Use on…',
  'bag.held': '{count} held',
  'bag.kindLine': '{rarity} · {kind}',
  'bag.status.boostRunning': 'Running now, {time} left. Another adds {hours} hours.',
  'bag.status.boostIdle': 'Not running. One starts {hours} hours of it.',
  'bag.status.breweryRuns': 'The cellars have {left} of {total} runs left today.',
  'bag.status.board': 'The board stands at {points} of {of} points.',
  'bag.status.mission': 'The mission being walked: {name}.',
  'bag.status.pathDone': 'The Path is walked to its end.',
  'bag.status.pick': 'You choose the champion next.',
  'bag.pickChampion': 'Which champion?',
  'bag.used': 'Used {name}.',
  'bag.nothingToDo': 'Nothing to do',
  'bag.outcome.breweryRuns': 'The cellars are open again — twenty runs, from the top.',
  'bag.outcome.dailyReset': 'Today’s board is untouched again.',
  'bag.outcome.weeklyReset': 'This week’s board is untouched again.',
  'bag.outcome.missionSkipped': 'The Path moves on. Nothing was paid for it.',
  'bag.outcome.levelled': 'Awake at level {level}.',
  'bag.outcome.starred': 'Wearing {stars} stars.',

  /* ---- What each item does ---- */
  'item.brewery_token.name': 'Brewery Token',
  'item.brewery_token.description':
    'Hands back today’s twenty Brewery runs, however few are left. The cellars open again at once.',
  'item.brewery_boost.name': 'Brewery Boost',
  'item.brewery_boost.description':
    'Every Brewery run pours twice the brews for 24 hours. Using another adds another day on top.',
  'item.champion_xp_boost.name': 'Champion XP Boost',
  'item.champion_xp_boost.description':
    'Every fight pays your champions twice the experience for 24 hours. Using another adds another day on top.',
  'item.player_xp_boost.name': 'Chronicle XP Boost',
  'item.player_xp_boost.description':
    'Every fight pays you twice the experience for 24 hours. Using another adds another day on top.',
  'item.daily_voucher.name': 'Daily Quest Voucher',
  'item.daily_voucher.description':
    'Puts today’s quest board back to untouched — its quests, its points and its chests — so the day can be earned twice.',
  'item.weekly_voucher.name': 'Weekly Quest Voucher',
  'item.weekly_voucher.description':
    'Puts this week’s quest board back to untouched — its quests, its points and its chests — so the week can be earned twice.',
  'item.mission_skip.name': 'Chronicler’s Dispensation',
  'item.mission_skip.description':
    'Marks the mission you are stuck on as done and opens the next. It pays you nothing for it, but the chapter still counts it.',
  'item.champions_chicken.name': 'Champion’s Chicken',
  'item.champions_chicken.description':
    'One champion eats, and wakes at the highest level their stars allow. Their stars do not change.',
  'item.champions_cheatmeal.name': 'Champion’s Cheatmeal',
  'item.champions_cheatmeal.description':
    'One champion eats far too much, and wakes wearing every star their kind can hold. Their level is untouched — and no food is spent.',

  /* ---- The bundles ---- */
  'shelf.chroniclers_satchel.name': 'The Chronicler’s Satchel',
  'shelf.chroniclers_satchel.description':
    'A day of every boost there is, and an evening in the cellars to spend them on.',
  'shelf.quartermasters_crate.name': 'The Quartermaster’s Crate',
  'shelf.quartermasters_crate.description':
    'Gold, a long night of energy, and the tomes a roster always runs out of first.',
  'shelf.stewards_ledger.name': 'The Steward’s Ledger',
  'shelf.stewards_ledger.description':
    'Two days and a week, all of them worth earning twice, and two more evenings of brewing.',
  'shelf.ascendants_table.name': 'The Ascendant’s Table',
  'shelf.ascendants_table.description':
    'A champion taken as far as food can take them, and two days to spend making it stick.',

  /* ---- The boosts, where the header shows them ---- */
  'boost.champion_xp': 'Champion XP ×2',
  'boost.player_xp': 'Chronicle XP ×2',
  'boost.brewery': 'Brews ×2',
  'boost.remaining': '{time} left',
  'boost.none': 'No boost running',
  /* What a grey slot in the header says: not an error, and what to do about it. */
  'boost.idle': 'Not running. Buy one at the Market, then use it from your Bag.',

  /*
   * ---- The Rewards Calendar ----
   *
   * It is called **Daily Rewards** to the player, never "welcome" (the owner's instruction): a
   * board that repeats forever greets a two-year veteran as often as a newcomer, and welcoming
   * someone who never left reads as a system that has not noticed them.
   */
  'login.title': 'Daily Rewards',
  'login.subtitle': 'Thirty days, in whatever order you come.',
  'login.open': 'Rewards',
  'login.day': 'Day {day}',
  'login.today': 'Today',
  'login.claim': 'Take it',
  'login.claimed': 'Taken',
  'login.locked': 'Not yet',
  'login.cycle': 'Round {cycle}',
  'login.nextIn': 'Next day in {time}',
  'login.tookIt': 'Day {day} taken.',
  'login.explain':
    'A day is a day you came, not a day on the calendar. Miss one and nothing is lost — the board simply waits for you.',
  'login.finale': 'The last three days are the best on the board.',
  'login.tomorrow': 'Tomorrow',
  'login.opensIn': 'Opens in {time}',
  'login.tomorrowIs': 'Tomorrow is day {day}, in {time}',
} as const;
