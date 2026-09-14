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
| `key_daily` | Daily Boss Key | stone-vine/icon-key | daily reset (2) | daily boss |
| `key_weekly` | Weekly Boss Key | stone-vine/icon-key (violet tint) | weekly reset (3) | weekly boss |
| `shard_faded` | Faded Shard | spell-icons/earth-dark-crystal | gold exchange, drops, quests | summon |
| `shard_ancient` | Ancient Shard | spell-icons/earth-sapphire-shard | first clears, chests, gems, missions | summon |
| `shard_sacred` | Sacred Shard | spell-icons/earth-citrine-shard | Hard clears, weekly boss, missions, gems | summon |
| `shard_primordial` | Primordial Shard | spell-icons/earth-amethyst-cluster | milestones, weekly boss top chests, missions | summon |
| `brew_justice` / `brew_valor` / `brew_faith` / `brew_eclipse` | Elemental Brew | stone-vine/icon-potion (tinted) | campaign, idle chest, quests, bosses | champion XP (1.5× when element matches) |
| `brew_universal` | Universal Brew | stone-vine/icon-potion (white) | star chests, quests, missions | champion XP (1×) |
| `tome_rare` / `tome_epic` / `tome_legendary` / `tome_mythic` | Skill Tome | stone-vine/icon-scroll (tinted) | bosses, missions, weekly quests, first clears | skill upgrades |
| `mat_scrap_iron` | Scrap Iron | spell-icons/earth-fractured-block | Intro/Normal campaign, dismantle | Forge I |
| `mat_ember_alloy` | Ember Alloy | spell-icons/earth-molten-vein | Normal/Hard campaign, daily boss | Forge II |
| `mat_starsteel` | Starsteel | spell-icons/earth-star-medallion | Hard campaign, weekly boss, dismantle L/M | Forge III |
| `mat_arcane_dust` | Arcane Dust | spell-icons/rune-astral-burst | everywhere in small amounts | all Forge tiers |
| `mat_refining_core` | Refining Core | spell-icons/earth-geode-crystal | star chests, bosses, dismantle | refine |
| `mat_glyph_sigil` | Glyph Sigil | spell-icons/rune-gilded-script | weekly boss, missions, weekly quests | choose set when crafting |

24 wallet entries. Quest points and mission progress are tracked separately (not wallet items).

## 3. Champion growth costs

### 3.1 Champion XP

```
xpToNext(L) = round(25 × L^1.7)          (L = current level; sum to 60 = 572,463)
```
Sources: battles (`CAMPAIGN.md` §7: `30 × energy × diffMult` per champion per win), brews
(elemental 1,500 XP, ×1.5 if the element matches → 2,250; universal 1,500), food champions:
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

- XP from every battle win (`10 × energyCost × diffMult`), boss battles (fixed per tier), quest
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

## 6. Idle Chest

The chest accumulates rewards every hour, online or offline, until full. The player opens it from
the hub (chest at the docks) or anywhere via the top bar.

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

### Farm tier

`farmTier` = highest settlement whose boss was cleared on the highest unlocked difficulty, mapped
to 1–36 (Intro 1–12, Normal 13–24, Hard 25–36). Hourly yield:

| Reward | Per hour | Notes |
| --- | --- | --- |
| Gold | `250 × farmTier^1.25` | tier 1: 250; tier 12: 5.6k; tier 36: 22k |
| Elemental Brews | `0.6 + 0.08 × farmTier` (fractional accrues) | element weighted to recent settlements |
| Arcane Dust | `1 + 0.2 × farmTier` | |
| Scrap Iron / Ember Alloy / Starsteel | tier-dependent 1.5 / 0.6 / 0.25 per hour | tier bands 1–12 / 13–24 / 25–36 |
| Player XP | `20 × farmTier` | never levels you past unlocks alone |
| Gems | 10 % chance/hour of 5 gems (max 3 procs per fill) | |
| Faded Shard | 6 % chance/hour (max 2 per fill) | |
| Ancient Shard | 1 % chance/hour (max 1 per fill; 2 % at tier ≥ 25) | |
| Gear piece | 8 % chance/hour of a piece at current campaign rarity table (max 2 per fill) | |
| Energy | 4 per hour (max 60 per fill) | |

Rolls are seeded from `lastClaimAt` so reloading cannot reroll. The chest UI shows fill %, time to
full, and a preview of guaranteed contents; opening plays a burst with counted-up rewards.
Offline gains beyond capacity are lost — the "come back in time" tension the brief asks for.

## 7. Gem budget (sanity)

Target weekly income for an active player mid-game: ≈ 800 gems (first clears while progressing
250, daily quest chests 7 × 40 = 280, weekly chest 120, bosses 100, missions ~50). Spend: 2 Ancient
Shards (600) + 2 refills (100). Early game front-loads first-clear gems so the Portal is used in
the first hour.

## 8. Gold budget (sanity)

Mid-game day: income ≈ 250k (campaign 120k, idle 60k, quests/bosses 70k); spend: gear levels
100k, tavern 60k, crafting 50k, Faded Shards 40k. Gold should feel tight but never blocking.

## 9. Daily / weekly reset

Daily reset 00:00 local device time; weekly reset in the night from Sunday to Monday at 00:00
local (owner's answer, Q3). Reset
handling uses timestamps; a missed reset while offline is applied on load exactly once per period.
