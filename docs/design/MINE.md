# The Mine — the Deepvein under Emberhold

Related: `ECONOMY.md` (§2 currencies, §7 gem budget), `GEAR.md` §6 (the Forge the materials come
from), `docs/tech/UI_DESIGN.md` §5.29 (the Mine dialog), `TUTORIAL.md` (its lesson).

The owner asked for a Mine "upgradable like in Raid Shadow Legends": a building on the hub that
works while the chronicle is away, pays gems for being visited, and is dug deeper, one level at a
time, as the chronicle grows. It is the idle half of the game that the Idle Chest — deliberately a
small bonus (Q40) — could not be on its own, and it is where the Forge's surplus metal finally goes.

## 1. What it is

The **Deepvein** runs under Emberhold's market square. Its crews work on while the Chronicler is
away and set aside what they bring up: **gems**, and from the fourth level on a slow trickle of
**Glyph Sigils** — the one crafting material the game runs short of (`sim:economy`: every active
script spends more Sigils than it earns).

- **It opens at chronicle level 6**, the one level between the daily board (5) and the Tavern's
  rank-up (7) that teaches nothing else. It opens already dug to level 1, **with its first store
  full**: the crews dug before the Chronicler arrived, so the first visit — the one the tutorial
  walks (§5) — always has gems to take, however quickly the chronicle reached level 6.
- **It fills on its own**, by the clock, up to a store that grows with the level (§3). A store
  that is full stops filling — the crews do not dig what nobody comes to collect.
- **Collecting** takes everything whole the store holds. Fractions are kept (`carry`), so
  collecting often never loses a part-gem to rounding; only time past a full store is lost.
- **Upgrading** is instant, costs gold and the Forge's materials (§4), and needs the chronicle to
  have reached the level's own gate. The store is collected first, at the old rate, so an upgrade
  never re-prices time already worked.

## 2. Why these numbers

The owner signed off the economy as measured (Q45), and `sim:economy` holds it to bands — a
mid-game active week between 1,150 and 1,950 gems, a dedicated one at most 2,600. The Mine has to
fit inside them rather than move them:

- The **mid-game active** script is chronicle level 30, which opens the Mine's level 7: 22 gems a
  day, +154 a week, which takes its week from ~1,674 to ~1,828 — inside the band.
- The **dedicated** script sits at the same level and collects as often: the same +154, to ~2,150
  against a 2,600 ceiling.
- A **casual** player who visits once a day collects what a level-7 store holds: 17 a day, ~119 a
  week.

Glyph Sigils: at level 7 the Mine brings up 0.6 a day, which is about what an active mid-game
week was short by. The star chests' interim Sigils (Q38) stay: the owner signed off the measured
economy with them in it (Q45), and the Mine is where the steady supply was always meant to come
from.

## 3. The levels

| Level | Stratum | Opens at chronicle level | Gems a day | Store holds | Fills in | Glyph Sigils a day |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | The Shaft Head | 6 | 6 | 3 gems | 12 h | — |
| 2 | The Old Workings | 9 | 8 | 4 | 12 h | — |
| 3 | The Lantern Gallery | 12 | 10 | 6 | 14 h 24 m | — |
| 4 | The Sigil Seam | 16 | 13 | 8 | 14 h 46 m | 0.25 |
| 5 | The Echoing Stope | 20 | 16 | 11 | 16 h 30 m | 0.35 |
| 6 | The Flooded Drift | 25 | 19 | 14 | 17 h 41 m | 0.45 |
| 7 | The Emberglass Vein | 30 | 22 | 17 | 18 h 33 m | 0.6 |
| 8 | The Sunless Gallery | 38 | 26 | 22 | 20 h 18 m | 0.75 |
| 9 | The Deep Choir | 46 | 30 | 28 | 22 h 24 m | 0.9 |
| 10 | The Heart of the Vein | 55 | 36 | 36 | 24 h | 1 |

The store is written in whole gems — the number a player cares about — and the time it takes to
fill is derived: `storeGems / gemsPerDay` days. It lengthens with the level so a deeper Mine can
wait longer: a level-10 Mine visited once a day loses nothing, a level-1 Mine wants a visit morning
and evening. The Sigils accrue over the same hours and stop with the same store. Every number
lives in `src/content/balance/mine.ts`; level 1's gate is the feature's own (`balance/unlocks.ts`),
so the two can never disagree.

**Whole units and fractions.** A collection pays the whole gems and Sigils the store holds and
carries the rest (`carry`), so ten small visits pay what one large one would. Sums that should land
on a whole number are counted with a float tolerance, so 0.35 a day for twenty days is seven
Sigils rather than six and a carried 0.999….

## 4. What an upgrade costs

| To level | Gold | Scrap Iron | Arcane Dust | Ember Alloy | Starsteel | Refining Cores |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | 25,000 | 150 | | | | |
| 3 | 50,000 | 300 | 40 | | | |
| 4 | 90,000 | 500 | 100 | | | |
| 5 | 150,000 | 700 | 250 | 60 | | |
| 6 | 240,000 | 900 | 400 | 150 | | |
| 7 | 360,000 | 1,100 | 600 | 300 | 10 | |
| 8 | 520,000 | 1,300 | 800 | 450 | 30 | |
| 9 | 750,000 | 1,600 | 1,000 | 650 | 60 | 10 |
| 10 | 1,100,000 | 2,000 | 1,400 | 900 | 100 | 20 |

All ten levels together: ~3.3M gold, 8,550 Scrap Iron, 4,590 Arcane Dust, 2,510 Ember Alloy,
200 Starsteel and 30 Refining Cores. The materials are the ones `sim:economy` shows piling up —
a mid-game active chronicle collects ~430 Scrap Iron, ~200 Arcane Dust and ~160 Ember Alloy a day
and spent a few per cent of it before the Mine — so each upgrade is a few days of a pile that had
nowhere to go, and the gold is the real decision. The last levels are a long-term goal, paid back
over months rather than days, the way the reference's own mine is.

## 5. Where it shows

- **The hub**: the old fountain in the middle of Emberhold's square, where the shaft goes down. Its
  medallion wears the pick over a cut gem, its ring fills with the store, and its plate says what
  waits (*Gems waiting: 9*, *Next gem in 2h 10m*); a full store calls — the ripple and the dot —
  because that is the moment the crews stop (*Store full · 17 gems*).
- **The Mine dialog** (`UI_DESIGN.md` §5.29): the seam in its vault with the store drawn round it,
  **Collect**, and this level's rates; the next level — its stratum's name, what it adds, what it
  costs against the purse, and what still stands in the way; and the whole shaft, ten strata from
  the Shaft Head to the Heart of the Vein, dug, worked and dark.
- **The Wallet** names the Mine among the gems' and the Glyph Sigil's sources, and among the uses of
  gold and the five materials its upgrades spend (`content/currencies/flows.ts`, held to the truth
  by `flows.test.ts`).
- **The tutorial** introduces it the moment it opens (`TUTORIAL.md` §4, steps 4.4–4.5): Eldric
  points at the fountain, the first collection finishes the lesson, and a last line inside the
  dialog shows what the level below asks for.

## 6. Save

`save.mine` (save v20): `{ level, collectedAt, carry: { gems, sigils } }` — the level dug, when the
store was last emptied, and the fractions below a whole gem or Sigil the last collection kept.
What the store holds is derived from those and the clock (CLAUDE.md §5.5). A new chronicle's
`collectedAt` is one store's length before it began, which is what makes the first store full. A
chronicle migrated from v19 gets the same Mine, stamped from its last save: level 1 and one full
store, with nothing back-paid for the months the Mine did not exist and no levels handed over —
digging deeper is the decision the Mine is about. Why the save holds exactly these three things is
`docs/tech/DECISIONS.md` ADR-046.

## 7. Counters

`mine.collections` (the ones the player asked for — the collection an upgrade makes on its way down
is not one), `mine.gems`, `mine.sigils` and `mine.upgrades`, for the Challenges and Achievements
that are next on the roadmap.

## 8. How `sim:economy` holds it

Each script visits the Mine at its sittings (casual once, mid-game twice, dedicated three times a
day) through the engine's own `settleMine`, at the deepest level its chronicle level opens. The
`mine` line is held to a band — 100–250 gems a week for the active player, at least 80 for the
casual one — and a dig audit prices each script's path to its level in days of what it has spare:
the day's net gold plus its stall budget, and each material's net income. No level may cost more
than 30 days of any of them (`MINE_DIG_DAYS_MAX`); at the time of writing the dearest is the casual
player's Scrap Iron, 17 days.
