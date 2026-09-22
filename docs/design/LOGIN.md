# LOGIN.md — The Standing Welcome

Related: `MARKET.md` (the other half of the same batch — the board hands out three of its items),
`ECONOMY.md` §7–§8 (what a week comes to with it), `docs/tech/UI_DESIGN.md` §5.27 (the board).

Thirty days of rewards, one taken per day the player comes back. It is the genre's daily login
calendar with the one thing the genre usually gets wrong taken out: **there is no streak.**

Shipped in `0.9.0`. Open from player level 1 (`FEATURE_UNLOCK_LEVEL.login_calendar`).

---

## 1. What it is, and what it is not

The owner's brief, read as rules:

1. **A day is a day you came.** Miss a Tuesday and nothing is lost — Wednesday is still the day you
   were owed. The board counts *logins*, not consecutive days.
2. **Always thirty days**, and the same thirty rewards whether they took a month or a year.
3. **The tiers are shuffled, not climbing.** Day 4 beats day 5; day 7 beats day 10. A player
   reading the board sees a scatter, so no day is ever the boring one before a good one.
4. **Except the last three.** Days 28, 29 and 30 are the best tiles on the board, every cycle.
5. **It repeats from day 1, forever** (the owner's answer). Claim day 30 and the next login is day
   1 again.

What it is *not* is a punishment engine. The usual version of this feature exists to make missing a
day hurt, which is why it resets: the reward is really the threat. Ours has nothing to reset, so a
player who disappears for a fortnight comes back to exactly the tile they left, and the feature
costs them nothing but pays them for turning up. That is the design, and the board says so in a
line under the title — a player who has met one of these before will *assume* there is a streak to
protect and feel punished by a day that in fact cost them nothing.

Rule 5 has a consequence worth naming: because the board loops, it is **permanent income** rather
than an onboarding arc, and has to be sized as such. That is §5.

## 2. The board

Thirty tiles. Each carries a tier — the frame it is drawn in, borrowing gear's rarity colours,
which a player already reads fluently — and its rewards. In `src/content/login/index.ts`.

| Day | Tier | Reward | | Day | Tier | Reward |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Common | 25,000 gold | | 16 | Rare | 60 gems |
| 2 | Uncommon | 3 Universal Brews | | 17 | Uncommon | 4 Universal Brews |
| 3 | Common | 100 energy | | 18 | Common | 120 energy |
| 4 | Rare | 60 gems | | 19 | Epic | 150 gems |
| 5 | Common | 25 Scrap Iron | | 20 | Rare | 1 Epic Tome |
| 6 | Uncommon | 2 Rare Tomes | | 21 | Uncommon | 3 Starsteel |
| 7 | Epic | 150 gems | | 22 | Rare | **Champion XP Boost** |
| 8 | Common | 30,000 gold | | 23 | Common | 40,000 gold |
| 9 | Rare | 1 Faded Shard, 20 Arcane Dust | | 24 | Uncommon | 2 Faded Shards |
| 10 | Uncommon | 120 energy | | 25 | Epic | 1 Refining Core, 1 Glyph Sigil |
| 11 | Common | 20 Arcane Dust | | 26 | Common | 150 energy |
| 12 | Rare | **Brewery Token** | | 27 | Rare | 60 gems |
| 13 | Uncommon | 8 Ember Alloy | | **28** | **Legendary** | **250 gems, 1 Ancient Shard** |
| 14 | Epic | 1 Ancient Shard | | **29** | **Legendary** | **1 Sacred Shard** |
| 15 | Common | 35,000 gold | | **30** | **Legendary** | **300 gems, 1 Legendary Tome, Champion's Chicken** |

`validateMarket` (`pnpm content:validate`) refuses a board where any day before 28 is `legendary`,
or where any of the last three is not, or where a day of the thirty is missing — so rules 2 and 4
cannot be broken by a content edit.

**Three tiles pay an item rather than a currency** (12, 22 and 30). That is deliberate: a player
meets the Bag through the calendar, for free, weeks before most chronicles could afford anything on
the Gem Market's shelf. Day 12's Brewery Token is the first, and it arrives at about the point a
player has started running out of the day's Brewery runs.

The gold, energy and material rows are noise beside the campaign's own and exist to make a Common
day feel like something rather than to matter. The gem rows are the ones that count, and §5 sizes
them.

## 3. The ladder

The whole system is **two values**: how many days have ever been claimed, and the day key of the
last claim.

```
pendingDay(state)  = (claimed mod 30) + 1
canClaim(state, k) = lastKey !== k
```

Everything else follows from those. There is no per-day list to fall out of step with the count, no
streak timestamp to go stale, and no cycle counter to keep in sync (`CLAUDE.md` §5.5: derive rather
than store).

- **Missing a day costs nothing** because nothing about the state mentions yesterday. A chronicle
  that comes back after a fortnight is owed the day it was always owed.
- **Claiming twice in one day is impossible** because the second claim's key matches the one just
  written. That is the same "a record from an older period reads as a fresh one" rule the boss
  gates and the Brewery's runs use, read in reverse.
- **Which round of the board this is** is `floor(claimed / 30) + 1`, printed beside the title so a
  player on their fourth pass knows the board has not glitched back to day 1.

A tile is drawn **taken** when its day is behind the player *in this cycle*. Note that `pendingDay`
has already advanced once today's claim is in, so "behind the player" is simply everything before
it, in both cases — reading it as still-owed after a claim would mark *tomorrow's* tile as taken.
There is a unit test and a comment on that line, because it is the one place this is easy to get
backwards.

## 4. Reaching it

A **Welcome** button in the hub's bottom bar, beside the Bag. It wears a notification dot the moment
a day is owed, and that is the whole reminder it gets.

It deliberately does **not** open itself over the hub on launch. A calendar that did would be the
one dialog a player meets before they have decided to do anything — and since there is no streak to
lose, there is nothing urgent enough to justify taking the first press of the session. The dot says
the same thing and lets them choose when.

Under the board a single line says what is left: the time until the next day when today's is taken,
or the finale's invitation when it is still there.

## 5. What it pays, and the band it is held to

A full cycle pays **1,030 gems**, which is ~34 a day against the ~205 a day `ECONOMY.md` §7 measures
from everything else — a sixth on top, which is the size a bonus line should be. Per week that is
**~240 gems and ~30k gold** for an active chronicle.

Because the board loops, `pnpm sim:economy` carries it as a permanent income line and holds it to
two bands of its own:

| Band | Want | Why |
| --- | --- | --- |
| `the welcome`, gems, income per week | 180–340 | it must stay a welcome — about a seventh of an active week — and never a second job |
| `the welcome`, gold, income per day | ≤ 12,000 | the board's gold is a top-up on the day, not a wage |

Raising any gem row on the board moves the first of those, which is the point of it: a tempting
"just 50 more gems on day 19" is exactly the edit that turns a welcome into income the rest of the
economy then has to be balanced around.

The sim books the board at **the cycle's rate** rather than walking it tile by tile, because a
script is twenty-eight days — four whole weeks, which every weekly line in that tool needs — and a
thirty-day walk would stop two tiles short. Those two are the finale, the richest part of the
board, so a walk would quietly under-count the one part of the calendar worth arguing about. The
rate is exact at any script length, and truer besides: the scripts are mid-game players a month in,
somewhere in the middle of their own cycle rather than on day one.

The three item tiles are not in that ledger, which is kept in currencies. What they are worth is
`MARKET.md`'s question — at shelf prices they come to 1,820 gems a cycle, more than the board's own
gem total, which is why they are three tiles and not ten.

## 6. Counters

`login.claims`, so quests and the mission line can name the calendar later. The store emits
`login.claimed` for the toast layer.
