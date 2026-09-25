# MARKET.md — The Market, the Bag and the boosts

Related: `ECONOMY.md` §7–§8 (what a week of gems and a day of gold come to), `LOGIN.md` (the other
half of the same batch), `QUESTS_MISSIONS.md` (what a voucher resets), `BREWERY.md` §5 (what a
token gives back), `docs/tech/UI_DESIGN.md` §5.25–§5.26 (the screens).

The Market is the game's one shop, and it sells nothing for money — ChronicleIdle has no
monetisation (`CLAUDE.md` §2), so both its currencies are earned. What it exists for is the two
kinds of surplus a chronicle builds up and used to have nowhere to spend: **gold**, which stops
mattering once the gear and the Tavern are fed, and **gems**, which until now bought only shards.

Two tabs, and they are deliberately nothing alike.

| | Gold Market | Gem Market |
| --- | --- | --- |
| Pays in | Gold | Gems |
| Stock | Six slots, **random**, limited | Thirteen entries, **fixed** |
| Changes | Every 60 minutes | Never |
| Sells | Everyday things, mostly in ones and smalls | The best shortcuts in the game |
| Runs out | Yes, per slot, per hour | No (except the four bundles, once each) |

Both open at **player level 1** (`FEATURE_UNLOCK_LEVEL.market`), reached from the Market hotspot on
the hub. Shipped in `0.9.0`.

---

## 1. The Gold Market

Six slots. Each carries one currency, a random quantity of it, and a fixed price per unit. At the
turn of every hour the six are replaced. A slot sells out when its stock is gone, and nothing about
it comes back until the hour changes.

**The shelf is derived, never rolled and stored.** `(seedRoot, hourKey)` seeds the draw, so the six
slots a chronicle sees at 14:00 are the same six at 14:59 however many times the tab is reloaded,
and they are a different six at 15:00 without anything having to run at the top of the hour. The
save keeps only which slots have already been bought from, and the hour that record belongs to —
the same discipline the tower's floors use (`CLAUDE.md` §5.5: store instants, derive the rest).

It closes the obvious exploit for free. A shelf that were rolled *and stored* could be rerolled by
refusing to save; a shelf that is a pure function of the hour cannot be.

### 1.1 The pool

Seventeen rows, drawn **without replacement** so a stall is six different things rather than three
lots of scrap iron. Weights are in `src/content/balance/market.ts`.

| Row | Weight | Gold each | Per slot |
| --- | --- | --- | --- |
| Scrap Iron | 100 | 120 | 20–60 |
| Arcane Dust | 90 | 180 | 15–45 |
| Ember Alloy | 70 | 420 | 8–24 |
| Universal Brew | 60 | 900 | 3–10 |
| Rare Tome | 55 | 1,600 | 1–4 |
| Starsteel | 40 | 2,400 | 2–6 |
| Justice / Valor / Faith / Eclipse Brew | 34 each | 1,400 | 2–6 |
| Refining Core | 26 | 5,200 | 1–3 |
| Epic Tome | 22 | 9,000 | 1–2 |
| Faded Shard | 20 | 6,500 | 1–3 |
| Glyph Sigil | 12 | 18,000 | 1 |
| Legendary Tome | 7 | 34,000 | 1 |
| Ancient Shard | 5 | 45,000 | 1 |
| **Sacred Shard** | **1** | **260,000** | **1** |

That shape is the owner's brief read literally: *mostly small amounts or singles of everyday items,
sometimes something very rare*. The three bottom rows are the "sometimes": measured over 200,000
stalls, a Legendary Tome turns up once in 12 hours, an Ancient Shard once in 17 and a **Sacred Shard
once in 82** — and that one costs most of a week's gold when it does. It is meant to be a thing a
player saves for and misses, not a thing they budget around. The stall marks those three as a
**rare find** (`rareFind` on the row; `UI_DESIGN.md` §5.25) — a gold frame and a ribbon — so a
player skimming it does not walk past the one thing it is carrying.

An average slot costs ~8,200 gold to clear and an average stall ~49,000, which is why
`ECONOMY.md` §8 can hand the stall ~59k of an active player's day and still end that day above
water.

## 2. The Gem Market

Thirteen entries that never change and never run out: nine single consumables, and four bundles
that can each be taken **once per chronicle** (the owner's answer). What the singles sell is §3;
what the bundles are worth is §2.2.

| Entry | Gems |
| --- | --- |
| Brewery Token | 120 |
| Brewery Boost (24 h) | 180 |
| Champion XP Boost (24 h) | 200 |
| Chronicle XP Boost (24 h) | 200 |
| Daily Quest Voucher | 175 |
| Weekly Quest Voucher | 450 |
| Mission Skip Token | 1,200 |
| Champion's Chicken | 1,500 |
| Champion's Cheatmeal | 4,000 |

**Prices are weeks.** `ECONOMY.md` §7 measures an active chronicle at ~1,674 gems a week in and
~594 net after its shards, refills and this shelf, so a boost is most of a day's gems, a voucher a
day and a half, the Chicken two and a half weeks of what is left over, and the Cheatmeal the best
part of seven. That is what the brief's "very expensive" and "extremely expensive" were asked to
mean.

### 2.1 The one rule: a sink, never a loop

**No entry may pay its own price back in gems.** Infinite stock plus a positive gem return is
infinite gems, and the game would be over. Only two entries can return a gem at all — the vouchers,
because a reset board is a board whose chests pay again — and both are priced well clear of it:

| | Price | Most it can return | |
| --- | --- | --- | --- |
| Daily Quest Voucher | 175 | 60 gems (the board's 40-, 80- and 100-point chests) | 34 % |
| Weekly Quest Voucher | 450 | 110 gems (its quests plus the 75-point chest) | 24 % |
| Steward's Ledger | 750 | 230 gems (two daily boards and one weekly) | 31 % |

The daily board's 100-point chest pays an **Ancient Shard instead of gems on every third claim**
(`QUESTS_MISSIONS.md` §2), and a voucher claim advances that count like any other — so three
vouchers (525 gems) buy back 150 gems and one Ancient Shard. The Portal sells that shard for 300
outright, so the voucher route costs *more* gems per shard, not fewer. There is no arbitrage in it.

`pnpm sim:economy` audits all thirteen entries against this rule and `--strict` fails on any that
reaches its own price, so a future repricing cannot open a loop by accident.

### 2.2 The bundles

| Bundle | Gems | Bought singly | Holds |
| --- | --- | --- | --- |
| The Chronicler's Satchel | 500 | 700 | one of each boost, plus a Brewery Token |
| The Quartermaster's Crate | 600 | — | 400,000 gold, 1,000 energy, 4 Epic Tomes, 2 Refining Cores |
| The Steward's Ledger | 750 | 1,040 | 2 Daily Vouchers, 1 Weekly Voucher, 2 Brewery Tokens |
| The Ascendant's Table | 4,200 | 5,900 | a Cheatmeal, a Chicken, 2 Champion XP Boosts |

Each is ~70 % of its parts, which is the genre's shape for a pack and is only sound *because* each
can be taken once. A repeatable bundle at 70 % would simply be a permanent 30 % discount on the
shelf, and the single prices would be fiction.

The Quartermaster's Crate is the one bundle that pays no consumables — a chronicle's first real
leg-up in gold, energy and the tomes a roster stalls on. Deliberately **not** shards: the Portal
owns those (`SUMMONING.md` §5), and a second door to the same thing would only confuse the price of
one.

## 3. The nine consumables

Every one buys the same thing in the end: **time**. A token is a second evening in the cellars, a
boost is a day worth two, a voucher a board earned twice, the Chicken and the Cheatmeal weeks of
the Tavern handed over at once. None of them is power a chronicle could not reach on its own, which
is what keeps the shelf a shortcut rather than a second game.

| Item | Rarity | What using it does |
| --- | --- | --- |
| Brewery Token | Rare | Puts the day's **20 Brewery runs** back to 20 (`BREWERY.md` §5). Refused when the day's runs are all still there. |
| Brewery Boost | Rare | ×2 brews from every Brewery run, 24 h |
| Champion XP Boost | Rare | ×2 champion XP from every fight, 24 h |
| Chronicle XP Boost | Rare | ×2 chronicle XP from every fight, 24 h |
| Daily Quest Voucher | Epic | The daily board back to untouched — quests, points and chests |
| Weekly Quest Voucher | Epic | The same for the weekly board |
| Mission Skip Token | Legendary | Marks the open step of the Chronicler's Path **done and unpaid** |
| Champion's Chicken | Legendary | One champion straight to the level cap of the stars they wear |
| Champion's Cheatmeal | Mythic | One champion straight to the maximum stars their rarity allows — **not** to max level |

Four of them need a decision beyond "use it", and each is handled where the decision belongs:

- **A voucher resets everything, chests included** (the owner's answer). The board's baseline is
  re-snapshotted to *now*, which is what makes the quests re-earnable: a counter goal measures the
  delta from its baseline, so moving the baseline forward is exactly "do them again" and never
  "they are already done". A board earned twice still counts one day towards the weekly quest that
  counts days.
- **A skipped mission counts fully** (the owner's answer): it enters `claimed` like any other, the
  line advances and the chapter's chest still counts it. The only thing lost is that step's own
  reward. It deliberately does *not* bump `missions.claimed`, because that counter feeds quests
  asking how many have been **earned**, and a bought one was not — it bumps `missions.skipped`.
- **The Chicken and the Cheatmeal pick a champion.** The picker draws the whole roster and greys
  out every champion the item would do nothing for, with the reason on the card. Showing them
  rather than hiding them is the point: a player looking for someone who is *not* on the list learns
  the rule from the list itself.

## 4. The three boosts

| Boost | Doubles | For |
| --- | --- | --- |
| Champion XP | champion XP from every fight | 24 h |
| Chronicle XP | chronicle XP from every fight | 24 h |
| Brewery | brews a Brewery run pours | 24 h |

**They stack in time, not in strength** (the owner's brief). Three Chronicle XP Boosts used in a row
is 72 hours at ×2, never one hour at ×8. The save keeps **the instant a boost runs out**, never a
remaining duration, and a second use extends from `max(current expiry, now)` — so using one while
another is running adds a full day to the end of it, and using one after the last has lapsed starts
a fresh day from now.

**What is boosted, and what is not.** The brief says "all fights which award Champion XP" and "all
fights which award Player XP", so the four fighting modes — campaign, keeps, tower and both bosses —
are doubled, and two things are deliberately not:

- **The Idle Chest**, which pays chronicle XP but is not a fight. Doubling it would make the
  strongest use of a Chronicle XP Boost be to close the game.
- **Brews and tomes at the Tavern.** A Champion XP Boost doubles what a *fight* pays, not what an
  item the player already holds is worth. A brew is worth the same whenever it is drunk, which is
  what lets a player save them. The Brewery Boost is the mirror of that rule: it doubles the brews a
  **run** pours, which is the thing a run is spent on.

**All three draw a socket beside the profile chip, on every screen, whether or not they are
running** (the owner's instruction). A live one wears its tint and counts down; an idle one is a
dark empty well, and hovering either says which boost it is and how long is left or where to get
one. Drawing only the live ones — which is how this first shipped — meant the header could never
tell a player that a boost was *off*, which is the state worth knowing because it is the one they
can act on.

## 5. The Bag

What a chronicle holds but has not used. It is a **count per item id** and nothing more: a
consumable has no instance identity, so two Brewery Tokens are the number two rather than two
objects. An item at zero is removed rather than kept at 0.

The Bag says what using an item would do **in full**, because a consumable is bought once and used
weeks later — by then the name alone would make a player guess. It draws what is held as slots in
a grid, in shelf order rather than acquisition order so the Bag reads the same way the Market does,
and the chosen item in full beside them: its description, and how the thing it acts on stands right
now — a boost's time left, the day's Brewery runs, a board's points, the mission being walked
(`docs/tech/UI_DESIGN.md` §5.26).

The Bag is reached from **the top bar**, beside the purse and the chest, so it is open from every
screen rather than only from the hub — it is a thing the chronicle owns, like gold, not a place it
goes. It is the only place an item is spent: buying never uses. That is the whole reason the Bag
exists — the owner's brief asks for items that are "only consumed when the player decides".

## 6. Grants

A **grant** is the one shape that both the Market and Daily Rewards hand things over in: a
currency and an amount, or a consumable and a count. One union, one payer (`src/state/grants.ts`),
so a bundle, a login tile and anything added later cannot drift apart in what they are able to
give or in how the wallet and the Bag are updated.

## 7. Counters and events

`market.purchases`, `market.gold.spent`, `market.gems.spent`, `market.bought.<entry id>`,
`bag.used`, `bag.used.<item id>` and `missions.skipped`, so quests and the mission line can name
the Market later without another migration. The store emits `market.bought` and `bag.used` for the
toast layer.
