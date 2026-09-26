# Economy, Energy, Player Level and Idle Chest

Related: `CAMPAIGN.md` §7, `GEAR.md`, `SUMMONING.md`, `BOSSES.md`, `QUESTS_MISSIONS.md`.
All constants live in `src/content/balance/economy.ts`, `energy.ts`, `xp.ts`, `idle.ts`.

## 1. Principles

- The game is free; **Gems are earned, never bought**. Their pacing replaces the store.
- Every activity feeds a different bottleneck (gold, brews, tomes, shards, materials) so no single
  farm is optimal for everything.
- Sinks scale with progress (gear levels, refine, rank-up, crafting) so gold stays relevant.

## 2. Currencies (wallet)

| Id | Name | Icon (asset key) | Main sources | Main sinks |
| --- | --- | --- | --- | --- |
| `gold` | Gold | stone-vine/icon-coins | campaign, idle chest, quests, bosses, dismantle, Daily Rewards, **the Unwritten's Tithe** | gear levels, refine, rank-up, tavern, crafting, Faded Shards, **the Gold Market**, **the Mine's levels** |
| `gems` | Gems | spell-icons/rune-radiant-gem | first clears, star chests, quests, missions, bosses, level-ups, Daily Rewards, **the Mine**, the Unwritten's Omen Seals (once each) | Ancient/Sacred Shards, energy and Eternal Key refills, **the Gem Market** |
| `energy` | Energy | spell-icons/fx-storm-bolt | +1/min regen, level-ups, Chronicler's Provisions (tutorial), first clears, missions, quests, idle chest | campaign stages |
| `key_daily` | Gargoyle Key | stone-vine/icon-key | daily reset (2) | the Gargoyle |
| `key_weekly` | Titan Key | stone-vine/icon-key (violet tint) | weekly reset (3) | the Titan |
| `key_eternal` | Eternal Key | stone-vine/icon-key (gold tint) | 1 per 15 min, capped at 10; the gem refill (5 for 150, past the cap) | the Eternal Tower (1 a floor) |
| `shard_faded` | Faded Shard | spell-icons/earth-dark-crystal | gold exchange, drops, quests | summon |
| `shard_ancient` | Ancient Shard | spell-icons/earth-sapphire-shard | first clears, chests, gems, missions, the first Omen Seal | summon |
| `shard_sacred` | Sacred Shard | spell-icons/earth-citrine-shard | Hard clears, weekly boss, missions, gems, two Omen Seals | summon |
| `shard_primordial` | Primordial Shard | spell-icons/earth-amethyst-cluster | milestones, weekly boss top chests, missions, the last Omen Seal | summon |
| `brew_justice` / `brew_valor` / `brew_faith` / `brew_eclipse` | Elemental Brew | stone-vine/icon-potion (tinted) | **the Brewery**, campaign, idle chest, quests, bosses | champion XP (1.5× when element matches) |
| `brew_universal` | Universal Brew | stone-vine/icon-potion (white) | star chests, quests, missions, the Tithe | champion XP (1×) |
| `tome_rare` / `tome_epic` / `tome_legendary` / `tome_mythic` | Skill Tome | stone-vine/icon-scroll (tinted) | bosses, missions, weekly quests, first clears, **the Unwritten's Tithe** (§13) | skill upgrades |
| `mat_scrap_iron` | Scrap Iron | spell-icons/earth-fractured-block | Intro/Normal campaign, dismantle | Forge I, the Mine's levels |
| `mat_ember_alloy` | Ember Alloy | spell-icons/earth-molten-vein | Normal/Hard campaign, daily boss | Forge II, the Mine's levels |
| `mat_starsteel` | Starsteel | spell-icons/earth-star-medallion | Hard campaign, weekly boss, dismantle L/M | Forge III, the Mine's levels |
| `mat_arcane_dust` | Arcane Dust | spell-icons/rune-astral-burst | everywhere in small amounts | all Forge tiers, the Mine's levels |
| `mat_refining_core` | Refining Core | spell-icons/earth-geode-crystal | star chests, bosses, dismantle, the Tithe | refine, the Mine's deepest levels |
| `mat_glyph_sigil` | Glyph Sigil | spell-icons/rune-gilded-script | 20-star chests (Q38, kept by Q45), **the Mine from its fourth level**, bosses, missions, weekly quests, the Tithe | choose set when crafting |

25 wallet entries. Quest points and mission progress are tracked separately (not wallet items).

The sources and sinks above are also data: every currency carries its `sources` and `uses` as
places (`src/content/currencies/flows.ts`), which is what the Wallet lists — each with the way there
— under *Where it comes from* and *What it is for*. A row there is a promise, so a change to what
pays or spends a currency changes that table too. Energy and the three keys are pools, not wallet
rows: the Wallet reads them from the pool and the boss allowance (`holdingOf`, `state/wallet.ts`).

## 3. Champion growth costs

### 3.1 Champion XP

```
xpToNext(L) = round(25 × L^1.7)          (L = current level; sum to 60 = 572,463)
```
Sources: battles (`CAMPAIGN.md` §7: `34 × energy × diffMult` per champion per win), brews
(elemental 1,700 XP, ×1.5 if the element matches → 2,550; universal 1,700), food champions:
`foodXp = 150 × RARITY_FOOD_MULT × (1 + 0.15 × foodLevel)` with `RARITY_FOOD_MULT`
{C 1, U 2, R 4, E 8, L 16, M 32}. Gold cost per Tavern level-up action: `50 × targetLevel`, where
the target level is the one the offering *reaches* — so one large offering costs less gold than
the same XP poured a glass at a time. XP past the star tier's cap is not swallowed: the Tavern
names it before the press so the player can rank up first.

### 3.2 Rank-up (stars)

`n★ → (n+1)★` consumes `n` champions that are exactly `n★` (any rarity/level) plus gold
{1→2: 500, 2→3: 2,000, 3→4: 8,000, 4→5: 30,000, 5→6: 100,000}. Locked/favourite champions
cannot be consumed, nor can the champion itself, and rarity's star ceiling
(`RARITY_STARS[rarity].max`) still holds — a Common never passes 2★. The rank-up keeps the level
it already had; the new star only raises the cap. The "food finder" suggests the cheapest valid
food: lowest rarity first, then lowest level, then longest held.

### 3.3 Skill upgrades

One upgrade step consumes one Skill Tome of the champion's rarity (Rare, Epic, Legendary or
Mythic Tome). Duplicates are ordinary copies (rank-up food) and never upgrade skills. Tomes drop
by rarity tier: Rare tomes are common (quests), Epic from
first clears and bosses, Legendary from Hard boss clears and weekly boss, Mythic only from the Titan's
Nightmare 100 % chest and two steps of the Path's last chapter (10.3, 10.11) — the one Mythic is the
only champion that spends them. Common/Uncommon champions have no upgrades.

## 4. Player level

- XP from every battle win (`12 × energyCost × diffMult`), boss battles (fixed per tier), quest
  chests and missions.
- `xpToNext(L) = round(100 × L^1.6)` (L 1→2: 100; 10: 3,981; 30: 23,000; 60: 70,000; 99: 157,000).
  Max level 100.
- Level-up: energy **+ new cap** added on top of the current amount (may overflow), `+level × 200` gold; every 5 levels 50 gems; every 10 levels
  1 Ancient Shard; levels 20/40/60/80/100 an extra Sacred Shard.
- Unlock schedule: `GAME_DESIGN.md` §6.

Profile dialog shows the avatar (chosen champion), name, worn title, level and XP bar, the
standing grid (energy cap, stands cleared, champions owned, strongest champion, battles,
victories, chronicle begun, time played), stars per difficulty, the titles earned so far and the
next three level gates.

### 4.1 Titles

A title is **earned, never bought**: each one names a condition the save either meets or does not,
so the earned set is recomputed on read and never stored (CLAUDE.md §5.5). The player chooses
which single title to wear; that choice is the only part kept in the save (`profile.title`).

| Title | Earned by |
| --- | --- |
| Chronicler | beginning a chronicle (level 1) |
| Wayfarer | beating Thornwood Crossing's boss on Intro |
| Road Warden | beating the Old Kingsroad's boss on Intro |
| Gatebreaker | clearing every stand of Intro |
| Collector | owning 10 champions |
| Rabble-Rouser | claiming the challenge *The Rabble Rises* (`ACHIEVEMENTS.md` §6) |
| Seasoned | chronicle level 25 |
| Banneret | claiming the fifth rank of the Hall of Deeds (`ACHIEVEMENTS.md` §2) |
| Lorekeeper | clearing every stand of Normal |
| Keeper of the Chronicle | chronicle level 50 |
| Undimmed | clearing every stand of Hard |
| Warden of Veyrath | three stars on every stand of Hard (`CAMPAIGN.md` §7 milestone) |
| Sovereign of the Tower | claiming the challenge *Sovereign of the Tower* |
| Loremaster | chronicle level 100 |
| Legend of the Chronicle | claiming the tenth rank of the Hall of Deeds |

Titles live in `src/content/titles/`; adding one is a data change (`CONTENT_AUTHORING.md` §7). The
Hall's four (0.12.0) are earned by a *claim* — a rank or a challenge — rather than by the renown or
the feat alone, so a title arrives with the press that pays it.

## 5. Energy

| Rule | Value |
| --- | --- |
| Cap | `60 + 10 × (level − 1)` → 60 at Lv1, 150 at Lv10, 550 at Lv50, 1,050 at Lv100 (+10 per level, owner's answer) |
| Regeneration | **1 energy per 60 s** while below cap (online and offline, computed from timestamps) → 1,440 per day |
| Overflow | Rewards always add, with **no upper limit**; regeneration pauses while above cap |
| Refill | 50 Gems → +100 energy (no daily limit), bought in the Wallet's Energy panel (`UI_DESIGN.md` §5.28); like any grant it may pass the cap |
| Level-up | adds an amount equal to the new cap on top of the current value (may overflow) |

### 5.1 Early-game provisions (owner: the first days must feel generous)

The opening hours hand out far more energy than the cap so that the first days and weeks are
played on a surplus of roughly 1,000–3,000 energy:

| Source | Energy | When |
| --- | --- | --- |
| Chronicler's Provisions, tutorial chapter 1 | 500 | after clearing 1-3 (`TUTORIAL.md` 1.11) |
| Chronicler's Provisions, chapters 2–5 | 4 × 250 = 1,000 | on finishing each chapter |
| Missions 1.1 / 1.2 / 1.9 / 1.12 | 100 + 150 + 200 + 300 = 750 | Chapter 1 of the Chronicler's Path |
| Intro first clears | 15 per stage, +50 per boss stage → 2,340 across Intro | while progressing |
| Level-ups 2–10 | 70 + 80 + … + 150 = 990 | first day or two |
| Daily quest chest "Spend 60 energy" and weekly "Claim the chest 7 times" | 40 / 100 | recurring |
| Idle chest | up to 60 per fill | recurring |

Total in the first two days for an engaged player: ≈ 3,000 energy over cap, then the +1/min
regeneration (1,440/day) carries the routine. `ENERGY_PROVISIONS` in `balance/energy.ts` lists
every grant so they can be tuned in one place.

### 5.2 The Eternal Key (`ETERNAL_TOWER.md` §6)

The tower's key is energy's mechanism with different numbers, and it is literally the same code:
`@engine/economy/pool.ts` holds a `{ value, lastTickAt }` pool that regenerates on read, and both
energy and the key are thin calls into it.

| Rule | Energy | Eternal Key |
| --- | --- | --- |
| Cap | `60 + 10 × (level − 1)` | **10**, flat |
| Regeneration | 1 per 60 s below the cap | 1 per **15 min** below the cap |
| Overflow | grants may exceed the cap; regeneration pauses above it | the same (a chronicle may sit at 16/10) |
| Charged | when a stage starts | when a floor starts, won or lost |

Ten keys is ten floors in a sitting and four more an hour after that, so the key paces a session
rather than a day. Over a thirty-day season regeneration alone is ~2,880 keys against a hundred
floors — the cap is the constraint, never the total.

**The gem refill** (`0.9.10`, `USER_QUESTIONS.md` Q49): five keys for 150 gems in the Wallet (the
Tower's *Buy keys* opens it there), as often as the gems allow and — being a grant — past the cap,
which is how a chronicle reaches 16/10. The price is set by what a key can win back, not by the
clock: floor 100's two shard rolls are worth about 21 gems a key at the Portal's own exchange
(5 % × 300 + 0.65 % × 900), so at 30 gems a key the deepest farm in the tower stays a sink and never
a loop. `pnpm sim:economy` audits both refills beside the Gem Market's shelf (69 % back on average
at floor 100 for the keys, nothing for energy).

## 6. Idle Chest

The chest accumulates rewards every hour, online or offline, until full. The player opens it from
the hub (chest at the docks) or anywhere via the top bar. Shipped in `0.0.9`; the numbers live in
`src/content/balance/idle.ts`, the rules in `src/engine/economy/idle.ts`.

The save stores **one** number — when the chest was last emptied — and how full it is and what is
inside are derived from that instant and the clock (ADR-033). Accrual is truncated to the minute,
which is the resolution the table below is read at, and a clock moved backwards waits rather than
paying out.

### Capacity by player level (from the brief)

| Level | Fills in |
| --- | --- |
| 1–9 | 3 h |
| 10–19 | 6 h |
| 20–29 | 12 h |
| 30–39 | 16 h |
| 40–49 | 18 h |
| 50–59 | 21 h |
| 60–100 | 24 h |

The chest names its own band: the dialog says what it holds now and what the next band holds, so
the reward for levelling is visible before it arrives.

### Farm tier

`farmTier` = the highest settlement whose boss has fallen, counted across the three difficulties
end to end (Intro 1–12, Normal 13–24, Hard 25–36) and taking the **best** of the three, so a
chronicle that has just unlocked a harder difficulty keeps the tier it earned on the easier one
(ADR-034). Tier 0 — no boss down yet — pays nothing and the chest says so; the hours it holds
meanwhile are kept, and paid at tier 1 once the first boss falls.

The chest is **a small bonus, never a substitute for playing** (owner's steer, ADR-035). Every
number below is set against what the same hour of campaign play pays: one idle hour is worth about
one run's gold, and the rest is a fraction of what a run drops. Four things are owed outright:

| Owed | Per hour | Notes |
| --- | --- | --- |
| Gold | `120 × farmTier` | tier 1: 120; tier 12: 1.4k; tier 36: 4.3k — about one run at that tier |
| Scrap Iron / Ember Alloy / Starsteel | 1 / 0.4 / 0.18 | the tier's **own** band only (1–12 / 13–24 / 25–36), never the bands beneath it, which keeps the three Forge tiers on three farms |
| Chronicle XP | `5 × farmTier` | ~12 % of a day's levelling against an active day's play |
| Energy | 4 per hour (max 60 per fill) | lands in the pool, overflowing its cap like a level-up (§5) |

And four are luck — one roll per chance per **whole** hour held, each capped per fill:

| Luck | Chance per hour | Cap per fill |
| --- | --- | --- |
| Gems (5) | 8 % | 2 |
| A brew of the farm settlement's own element | 6 % | 2 |
| Faded Shard | 5 % | 2 |
| Ancient Shard | 1 % (2 % at tier ≥ 25) | 1 |

Rolls are seeded from `lastClaimAt` so reloading cannot reroll. The chest pays **no Arcane Dust**
(every campaign run drops some) and **no gear** (the campaign and the Forge are where armour comes
from, and a piece the racks were too full to hold is a reward that vanishes).

Brews are luck rather than an hourly line because one potion is 1,700 champion XP (§3.1): paid by
the hour the chest out-earned the campaign's own 12 %-per-run drop several times over, which is
exactly the kind of "too much and too strong" the chest must not be. A full chest is one brew more
often than not and never more than two.

The chest shows fill %, time to full, the settlement and tier it farms, the band line, a preview
of the **guaranteed** contents with the pace each fills at, and the luck **as odds** — each roll's
chance an hour, never what this chest will turn up. Until `0.9.5` the luck was unlisted, on the
reasoning that finding it is the point of opening the chest; the dialog's rework lists the odds
instead, because a chest that hides what it can give reads as one that gives nothing, and the
find itself is still the surprise of opening it. Offline gains beyond capacity are lost — the
"come back in time" tension the brief asks for — and the chest says as much when it is opened
full.

### The Mine (`MINE.md`)

The Idle Chest's partner on the hub, and the other half of what the chronicle earns while away. The
chest is a small bonus by design (Q40) and pays by the farm tier; the Mine pays gems — and, from its
fourth level, Glyph Sigils — by a level the player digs deeper with gold and the Forge's metals.
Ten levels open between chronicle levels 6 and 55, from 6 gems a day to 36, with a store that grows
from half a day to a whole one. Nothing is rolled, the store's fractions are carried between
collections, and upgrading settles the store at the old rate first. The full table, the costs and
how `sim:economy` holds it are in `MINE.md`.

## 7. Gem budget (sanity)

Measured, not estimated: the figures below are what `pnpm sim:economy` reports, and the tool derives
every line from the content and the balance tables through the same functions the game uses. Rerun
it after any tuning change — `tools/sim/economy-script.ts` holds the bands CI checks.

The *active* player of these figures sits down twice a day and spends a bar of energy each time,
farming Normal in the back half of the map at level 30. `sim:economy` also plays a casual player
(one sitting) and a dedicated one (four), which is the spectrum a tuning pass should look at.

| Gems per week | Active | Where it comes from |
| --- | --- | --- |
| Gargoyle (daily) | ~420 | the Normal tier's 60-gem chest at 60 %, every day (`BOSSES.md` §2) |
| The daily hundred | ~350 | the 100-point chest, with its every-third-day Ancient Shard |
| First clears while progressing | ~273 | three new stands a day, first-clear bundles |
| Daily Rewards | ~240 | one tile a login, and the board loops forever (`LOGIN.md` §5) |
| Titan (weekly) | ~182 | the Normal tier's chests once a week (`BOSSES.md` §3) |
| The weekly board and its chest | ~112 | claimed once a week |
| The Mine | ~154 | a level-7 Mine collected morning and evening: 22 a day (`MINE.md`) |
| The idle chest | ~63 | two claims a day at farm tier 20 (§6) |
| The Chronicler's Path | ~42 | eight missions a week plus a chapter chest |
| **Income** | **~1,828** | |
| Spend: 2 Ancient Shards + 2 refills | ~700 | `SHARD_EXCHANGE`, `ENERGY_REFILL_GEMS` |
| Spend: the Gem Market | ~380 | two 24-hour boosts a week (`MARKET.md` §2) |
| **Net** | **~748** | about two and a half further Ancient Shards saved a week |

A casual player earns ~1,227 a week and keeps ~1,027 of it, which clears an Ancient Shard with room
to spare; a dedicated one ~2,150, because the boss, chest, calendar and Mine lines do not scale with
how often you sit down — only the campaign does. The Mine is the one line a player *builds*: its
level is dug with gold and the Forge's spare metal (`MINE.md` §4), and `sim:economy` prices each
script's path to its level in days of its own surplus.

**The Gem Market is a sink and only a sink.** Every entry on the fixed shelf takes gems and hands
back progress, and the one way that breaks is an entry that pays *gems* back worth more than it
cost: infinite stock plus a positive return is infinite gems. `pnpm sim:economy` audits all thirteen
entries against that rule and `--strict` fails on any that reaches it. The two that can pay gems
back at all are the quest vouchers, because a reset board is a board whose chests pay again — the
daily returns at most 60 gems of its 175, the weekly at most 110 of its 450. Nothing else on the
shelf returns a gem, the Mission Skip Token included: a skipped step is marked done and left unpaid.

> **Superseded upward three times.** This section first printed ≈ 800 gems a week with
> "bosses 100", written while the bosses were still a plan; `BOSSES.md`'s tier tables (Phase 10)
> then made the boss line alone worth ~600 and the total ~1,430. Daily Rewards (Phase P)
> added a permanent ~240 a week on top, because the owner's answer was that the board repeats
> rather than ending, and the Gem Market took ~380 a week back out. The owner signed off the
> ~1,674 that left (`USER_QUESTIONS.md` Q45), and the Mine (`0.10.0`) was fitted inside the band
> that sign-off set rather than widening it: ~1,828 against a 1,950 ceiling.

**One-off pools are not in the table.** The Hall of Deeds (0.12.0, `ACHIEVEMENTS.md` §9) pays each
tier, challenge and rank once in a chronicle's life: 20,470 gems in all, with 54 Ancient, 11 Sacred
and 6 Primordial Shards and 3.6 million gold besides. Earned over the one to two years most of it
takes, that is 200–390 gems a week on top of the table — arriving in the order the play earns it, so
it rewards the long haul rather than widening any week's band. The Unwritten's sixteen Omen Seals
(0.13.0, `UNWRITTEN.md` §14.3) are the same kind of pool: the first expedition won at each Omen
pays its seal once, 5,080 gems in all with an Ancient, two Sacred and a Primordial Shard, four Epic
and five Legendary Tomes, and the ladder they sit on takes months to climb. `sim:economy` models
neither, for the same reason it does not model the first-clear bundles of settlements already
beaten. The Unwritten pays no gems by the week: its weekly line is gold and tomes (§8, §13).

## 8. Gold budget (sanity)

| Gold per day | Active | Where it comes from |
| --- | --- | --- |
| Campaign farming | ~154k | ~100 runs of a Normal stand in settlement 9 |
| Gargoyle's chests | ~80k | once a day at 60 % of the Normal tier |
| The idle chest | ~58k | two claims a day at farm tier 20 (§6) |
| The boards, the bosses' weekly, the Path | ~30k | |
| Daily Rewards | ~4.3k | the board's gold, spread over its thirty tiles (`LOGIN.md` §5) |
| The Warden's Tithe | ~27k | six Wardens a week at Omen 2 (`UNWRITTEN.md` §14.2) |
| **Income** | **~354k** | |
| Spend: gear levels | ~90k | 24 levels a day on 5★ pieces around +9 |
| Spend: the Tavern | ~68k | 40 champion levels a day around level 34 |
| Spend: the Gold Market | ~59k | the day's surplus, left at the hourly stall (`MARKET.md` §1) |
| Spend: Faded Shards | ~40k | eight a day at 5k each |
| Spend: crafting | ~12k | an Ember craft a day, with its Glyph Sigil |
| **Net** | **~85k** | |

Gold should feel tight but never blocking, and no script of any activity level ends a day in the red
— that invariant is a band, not a hope. A casual player earns ~235k a day (the boss and the chest do
not care how long you play) and spends ~82k of it.

The Tithe (0.13.0) raised every script's income by a line the size of the boards' — ~13k a day for a
casual player's three Wardens a week at Omen 1, ~27k for the active player's six at Omen 2, ~34k for
a dedicated player's six at Omen 5 — and nothing else moved: the net it leaves is the gold the
Unwritten's own champions will be levelled with.

**The Gold Market is where the surplus goes.** Before it there was nothing to do with a day's
leftover gold once the gear and the Tavern had been fed, and the net above was ~112k a day of money
with nowhere to be. The hourly stall turns that into materials, brews and the occasional shard, and
a band holds it from the other side: if a 60k budget can no longer find anything on the shelf to
buy, the pool has been priced out of reach and `--strict` says so.

**The tower is not on that table, on purpose.** A full climb to floor 100 pays 1,334,407 gold and
300 energy, but it is a *season's* income rather than a day's, and it is paid once: ordinary floors
are one-time clears (`ETERNAL_TOWER.md` §4). Spread over its thirty days that is ~44k gold a day
against the ~322k above — about an eighth, which is the size a second source should be, and it
arrives exactly when a player has run out of first clears to farm. What the tower is really for is
brews: a climb hands over 250 Universal Brews and 30 element brews, which is what levels the
champions that the next floor needs.

## 9. Daily / weekly reset

Daily reset 00:00 local device time; weekly reset in the night from Sunday to Monday at 00:00
local (owner's answer, Q3). Reset
handling uses timestamps; a missed reset while offline is applied on load exactly once per period.

## 10. Skill points (the Glorious Palace)

Skill points are not a wallet currency: they are never spent on anything but the Palace, never
traded, never bought, and never lost. They live in `save.palace.earned` rather than in the wallet
for exactly that reason (`GLORIOUS_PALACE.md` §2).

| Source | Points | Cadence | Lifetime supply |
| --- | --- | --- | --- |
| Settlement boss stand | 1 | Once per settlement per difficulty | 36, one-time |
| Eternal Tower | 1 per fifth floor | Again every 30-day season | Repeating |
| Daily boss pool emptied | 1 | Once a day | ~7 / week |
| Weekly boss pool emptied | 3 | Once a week | 3 / week |

A player who clears both bosses every period and keeps a tower climb going earns roughly **10–14 a
week**. The whole tree costs 237, so the 201 the campaign does not cover is about four months of
steady play — deliberately the longest-running sink in the game, and the only one whose reward
applies to champions the player has not pulled yet.

Nothing else in the economy is touched by it. The Palace costs no gold, no gems and no energy;
reclaiming every point is free and can be done any time (Q52).

## 11. Brews (the Brewery)

The Brewery (`BREWERY.md`) is the main source of elemental brews, and the only source at volume for
the element the player's own stand does not drop. Twenty runs a day across four halls, stage *n*
paying *n* brews, so a day is worth between 20 brews (all twenty runs on stage 1) and 100 (all
twenty on a stage 5 the roster can hold).

Measured by `pnpm sim:economy` for the three scripted players:

| Script | Brewery runs | On stage | Brews a day, Brewery | Brews a day, everything else |
| --- | --- | --- | --- | --- |
| casual | 6 | 2 | 12 | ~7 |
| mid-game, active | 20 | 3 | 60 | ~13 |
| dedicated | 20 | 4 | 80 | ~24 |

A brew is 1,700 XP, 2,550 on a matching champion (§3.1), and a champion costs 572,463 XP to reach
60 — so the active player's sixty brews a day are a bit over a quarter of one champion, with the rest
coming from food and the campaign's own XP. The Brewery is the strongest single XP line in the game
and still not the only one, which is the shape §1 asks of every bottleneck.

Two bands in `tools/sim/economy-script.ts` hold that: `brew_valor` ≥ 12 a day for the active player
(the Brewery pays every element, not only the one the map is standing in) and `brew_eclipse` ≥ 4 a
day (the Waning Cellar's three days a week must still be enough to rank an Eclipse champion).

The Brewery costs **no energy and no gold** — the twenty runs are the whole price (Q54), which is
what keeps the campaign's energy the thing that paces a sitting.

## 12. Gear (the Dungeons)

The Dungeons (`DUNGEONS.md`) are the game's gear faucet and its **largest energy sink**. A keep's
run costs 8–18 energy against a campaign stand's 4–10, and the price is the whole design: a band
charges more precisely because it drops higher stars, so a player reads the price and knows what
they are buying (`DUNGEONS.md` §5).

There is no daily cap on a keep — the bar is the cap. A day's 1,440 regenerated energy is 180 runs
of the shallowest Normal band, or 80 of the deepest Hard one, and an evening is spent choosing
between a settlement and a keep, which is exactly the tension §1 asks for.

What a keep pays back into the wider economy is deliberately thin:

| Line | A dungeon run | Against |
| --- | --- | --- |
| Gear | 1 piece always, plus 8–30 % of a second | the campaign's 22 % chance of one |
| Gold | `260 × (1 + 0.1 × (stage − 1)) × {normal 1, hard 2.6}` | roughly **half** a campaign stand's gold per point of energy |
| Champion and player XP | the campaign's per-energy rates × `{normal 1.5, hard 2.2}` | the same XP per point of energy as the matching campaign difficulty |
| Faded Shard | 2 % Normal, 3.5 % Hard | the Portal's real sources (§7) |
| Ancient Shard | 0.7 %, Hard only | — |

So a keep never becomes the place to farm gold or shards: the gold it pays is there because
levelling what it drops costs gold, and the shards are the "very rarely" the owner asked for. Gold
remains the campaign's job, brews the Brewery's, and gear the keeps'. `pnpm sim:economy`'s gold
bands are therefore unchanged by the mode — a player who spends a day in the keeps earns less gold
than one who spends it on the map, and comes out with an armoury instead.

## 13. Skill Tomes (the Unwritten)

The Unwritten (`UNWRITTEN.md`) costs nothing to enter — no energy, no keys, no gold — and pays three
ways: **Recovered Pages** every expedition, which buy the Scriptorium and nothing else (like the
Palace's points, never a wallet row); the **Warden's Tithe**, a chest from each of the first six
Wardens felled every week; and an **Omen Seal** the first time each Omen falls (§7, one-off).

The Tithe is the economy's line, and what it carries is **Skill Tomes**, the Tavern's slowest shelf
to fill:

| A week's six Wardens | Gold | Tomes | Besides |
| --- | --- | --- | --- |
| two of Folio I | 2 × 15,000 × m | 2 Rare | 4 Universal Brews |
| two of Folio II | 2 × 25,000 × m | 2 Epic | 2 Refining Cores |
| two of Folio III | 2 × 40,000 × m | 2 Epic, and 2 Legendary from Omen 8 | 2 Glyph Sigils |

`m = 1 + 0.1 × Omen`. Six Wardens is two expeditions won; a week that only reaches Folio II still
pays its first four, and the week's count resets with the weekly board (§9). Measured by
`pnpm sim:economy`:

| Script | Wardens a week | At Omen | Tithe gold a day |
| --- | --- | --- | --- |
| casual | 3 | 1 | ~12.6k |
| mid-game, active | 6 | 2 | ~27.4k |
| dedicated | 6 | 5 | ~34.3k |

Measured against the rest of the game for the active player, the Tithe's four Epic Tomes a week
match the first clears' and sit behind only the Gargoyle's seven — half an Epic champion's eight
ability steps every week. The Legendary Tomes are where it leads: from Omen 8 its two a week are
about three times what every other scheduled source together pays (the Gold Market's odd one and the
calendar's, ~0.7), so a company deep enough finishes a Legendary's eleven steps in under six weeks.
That is the size a new source of a bottleneck should be — the best way there, never the only one.
Nothing the Unwritten pays can be bought back with what it pays: the Pages have one shelf, and the
wallet lines are currencies the rest of the game already spends.
