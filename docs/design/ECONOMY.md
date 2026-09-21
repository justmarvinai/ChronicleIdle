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
| `gold` | Gold | stone-vine/icon-coins | campaign, idle chest, quests, bosses, dismantle | gear levels, refine, rank-up, tavern, crafting, Faded Shards |
| `gems` | Gems | spell-icons/rune-radiant-gem | first clears, star chests, quests, missions, bosses, level-ups | Ancient/Sacred Shards, energy refills |
| `energy` | Energy | spell-icons/fx-storm-bolt | +1/min regen, level-ups, Chronicler's Provisions (tutorial), first clears, missions, quests, idle chest | campaign stages |
| `key_daily` | Gargoyle Key | stone-vine/icon-key | daily reset (2) | the Gargoyle |
| `key_weekly` | Titan Key | stone-vine/icon-key (violet tint) | weekly reset (3) | the Titan |
| `key_eternal` | Eternal Key | stone-vine/icon-key (gold tint) | 1 per 15 min, capped at 10 | the Eternal Tower (1 a floor) |
| `shard_faded` | Faded Shard | spell-icons/earth-dark-crystal | gold exchange, drops, quests | summon |
| `shard_ancient` | Ancient Shard | spell-icons/earth-sapphire-shard | first clears, chests, gems, missions | summon |
| `shard_sacred` | Sacred Shard | spell-icons/earth-citrine-shard | Hard clears, weekly boss, missions, gems | summon |
| `shard_primordial` | Primordial Shard | spell-icons/earth-amethyst-cluster | milestones, weekly boss top chests, missions | summon |
| `brew_justice` / `brew_valor` / `brew_faith` / `brew_eclipse` | Elemental Brew | stone-vine/icon-potion (tinted) | **the Brewery**, campaign, idle chest, quests, bosses | champion XP (1.5× when element matches) |
| `brew_universal` | Universal Brew | stone-vine/icon-potion (white) | star chests, quests, missions | champion XP (1×) |
| `tome_rare` / `tome_epic` / `tome_legendary` / `tome_mythic` | Skill Tome | stone-vine/icon-scroll (tinted) | bosses, missions, weekly quests, first clears | skill upgrades |
| `mat_scrap_iron` | Scrap Iron | spell-icons/earth-fractured-block | Intro/Normal campaign, dismantle | Forge I |
| `mat_ember_alloy` | Ember Alloy | spell-icons/earth-molten-vein | Normal/Hard campaign, daily boss | Forge II |
| `mat_starsteel` | Starsteel | spell-icons/earth-star-medallion | Hard campaign, weekly boss, dismantle L/M | Forge III |
| `mat_arcane_dust` | Arcane Dust | spell-icons/rune-astral-burst | everywhere in small amounts | all Forge tiers |
| `mat_refining_core` | Refining Core | spell-icons/earth-geode-crystal | star chests, bosses, dismantle | refine |
| `mat_glyph_sigil` | Glyph Sigil | spell-icons/rune-gilded-script | 20-star chests (interim, Q38); later weekly boss, missions, weekly quests | choose set when crafting |

25 wallet entries. Quest points and mission progress are tracked separately (not wallet items).

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
first clears and bosses, Legendary from Hard boss clears and weekly boss, Mythic from Hard
milestones and the top weekly chest. Common/Uncommon champions have no upgrades.

## 4. Player level

- XP from every battle win (`11 × energyCost × diffMult`), boss battles (fixed per tier), quest
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
| Seasoned | chronicle level 25 |
| Lorekeeper | clearing every stand of Normal |
| Keeper of the Chronicle | chronicle level 50 |
| Undimmed | clearing every stand of Hard |
| Warden of Veyrath | three stars on every stand of Hard (`CAMPAIGN.md` §7 milestone) |
| Loremaster | chronicle level 100 |

Titles live in `src/content/titles/`; adding one is a data change (`CONTENT_AUTHORING.md` §7).

## 5. Energy

| Rule | Value |
| --- | --- |
| Cap | `60 + 10 × (level − 1)` → 60 at Lv1, 150 at Lv10, 550 at Lv50, 1,050 at Lv100 (+10 per level, owner's answer) |
| Regeneration | **1 energy per 60 s** while below cap (online and offline, computed from timestamps) → 1,440 per day |
| Overflow | Rewards always add, with **no upper limit**; regeneration pauses while above cap |
| Refill | 50 Gems → +100 energy (no daily limit) |
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

Nothing grants keys in `0.2.0`: the cap is reached by waiting and the over-cap case is unreachable
until a source exists. A gem exchange is sized in `balance/tower.ts`
(`TOWER_KEY_REFILL_GEMS = 40` for 5) and deliberately not wired — `USER_QUESTIONS.md` Q49.

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
(ADR-034). Tier 0 — no boss down yet — pays nothing and the chest says so.

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

The chest shows fill %, time to full, the settlement and tier it farms, the band line, and a
preview of the **guaranteed** contents — the luck is deliberately unlisted, because finding it is
the point of opening it. Offline gains beyond capacity are lost — the "come back in time" tension
the brief asks for — and the chest says as much when it is opened full.

## 7. Gem budget (sanity)

Measured, not estimated: the figures below are what `pnpm sim:economy` reports, and the tool derives
every line from the content and the balance tables through the same functions the game uses. Rerun
it after any tuning change — `tools/sim/economy-script.ts` holds the bands CI checks.

The *active* player of these figures sits down twice a day and spends a bar of energy each time,
farming Normal in the back half of the map at level 30. `sim:economy` also plays a casual player
(one sitting) and a dedicated one (four), which is the spectrum a tuning pass should look at.

| Gems per week | Active | Where it comes from |
| --- | --- | --- |
| First clears while progressing | ~273 | three new stands a day, first-clear bundles |
| The daily hundred | ~350 | the 100-point chest, with its every-third-day Ancient Shard |
| The weekly board and its chest | ~112 | claimed once a week |
| Gargoyle (daily) | ~420 | the Normal tier's 60-gem chest at 60 %, every day (`BOSSES.md` §2) |
| Titan (weekly) | ~182 | the Normal tier's chests once a week (`BOSSES.md` §3) |
| The Chronicler's Path | ~42 | eight missions a week plus a chapter chest |
| **Income** | **~1,430** | |
| Spend: 2 Ancient Shards + 2 refills | ~700 | `SHARD_EXCHANGE`, `ENERGY_REFILL_GEMS` |
| **Net** | **~730** | about two further Ancient Shards saved a week |

A casual player earns ~850 a week, which still clears an Ancient Shard; a dedicated one ~1,760,
because the boss and chest lines do not scale with how often you sit down — only the campaign does.

> **Superseded.** This section used to print ≈ 800 gems a week with "bosses 100", written while the
> bosses were still a plan. `BOSSES.md`'s tier tables (Phase 10) then gave Gargoyle's Normal tier 60
> gems a day, so the boss line alone is worth ~600 and the old total was stale by exactly that much.
> Every other line came in where this section said it would. Whether ~1,430 a week is the intended
> generosity is `USER_QUESTIONS.md` Q45; the bands hold the shape either way.

## 8. Gold budget (sanity)

| Gold per day | Active | Where it comes from |
| --- | --- | --- |
| Campaign farming | ~155k | ~100 runs of a Normal stand in settlement 9 |
| Gargoyle's chests | ~80k | once a day at 60 % of the Normal tier |
| The idle chest | ~58k | two claims a day at farm tier 20 (§6) |
| The boards, the bosses' weekly, the Path | ~29k | |
| **Income** | **~322k** | |
| Spend: gear levels | ~90k | 24 levels a day on 5★ pieces around +9 |
| Spend: the Tavern | ~68k | 40 champion levels a day around level 34 |
| Spend: Faded Shards | ~40k | eight a day at 5k each |
| Spend: crafting | ~12k | an Ember craft a day, with its Glyph Sigil |
| **Net** | **~112k** | |

Gold should feel tight but never blocking, and no script of any activity level ends a day in the red
— that invariant is a band, not a hope. A casual player earns ~218k a day (the boss and the chest do
not care how long you play) and spends ~53k of it.

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
