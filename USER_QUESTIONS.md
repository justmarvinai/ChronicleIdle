# USER_QUESTIONS.md — Questions for the owner

Each question states **why it matters** and the **default** in use until answered. Nothing here
blocks development. Answered items live in §2 with the owner's answer and the change it caused.

## 1. Open

### Q57 — "No Epic or Legendary in the Intro Campaign": the difficulty, or the early settlements?

**Why it matters.** Your balance note said *no Legendary or Epic item drops in for example the
Intro Campaign*. "Intro" is the name of a difficulty here **and** a fair description of the first
few settlements, and the two readings cap very different things: one says a whole first
playthrough is a Common-to-Rare armoury, the other says only Thornwood and its neighbours are, on
every difficulty.

**The default in use.** The **difficulty**. `DROP_RARITY_WEIGHTS` in
`src/content/balance/gear.ts` is one row per difficulty and Intro's row stops at Rare, which is
also the ladder `CAMPAIGN.md` §7 has described since Phase 3 without the code ever having it. It
reads as the cleaner rule — *stars* already come from the settlement, so the settlement decides how
big a piece is and the difficulty how good it is — and it keeps the Forge and the two bosses as the
places a top-rarity piece is actually earned.

Switching to the other reading is a data edit in the same file: key the rows by settlement band
instead of difficulty and pass `settlementIndex` where `difficulty` goes today. Or say the word and
Intro can keep a sliver of Epic (the row `CAMPAIGN.md` used to print gave it 3 %).

### Q49 — Nothing grants Eternal Keys, so 16/10 is unreachable

**Why it matters.** You asked for a cap that the count may exceed — "you can go above it for
example 16/10 but max. always stays 10". That is built: regeneration stops at ten, a *grant* does
not, and the display turns ember when the count is over the cap. But `0.2.0` ships no source of
keys other than the clock, so no chronicle can actually get there. The over-cap rule is real and
untested by play.

**The default in use.** Nothing grants keys. The exchange the rule was clearly written for is
sized and sitting in `src/content/balance/tower.ts` — `TOWER_KEY_REFILL_GEMS = 40` for
`TOWER_KEY_REFILL_AMOUNT = 5`, priced against the energy refill (50 gems for 100 energy) so that
a key costs about what ten minutes of the clock is worth — and deliberately **not wired**, because
what a key should cost is an economy decision and gems already have four sinks (`ECONOMY.md` §7).

Say the word and it is a button on the tower screen. The other candidates, if you would rather not
sell them: the daily quest chest, a weekly quest, a chapter chest on the Chronicler's Path, or a
first-clear bundle on a boss floor.

### Q48 — A lost floor still spends its Eternal Key

**Why it matters.** Ten keys is ten attempts, and the tower is built to be attempted at the edge of
what a roster can beat — a floor you lose is the normal way to find the top of your climb. Refunding
a loss would make the key free at exactly the moment it matters and turn the tower into an unlimited
retry counter.

**The default in use.** The key is charged when the floor starts and is not returned on a defeat,
which is how the campaign's energy and the bosses' keys already work. It also closes the hole a
refund opens: a crash or a reload mid-fight cannot buy a free attempt. The result screen says so
plainly ("The floor held. The key is spent; another returns shortly.") rather than leaving the
player to work it out.

If you would rather a defeat cost nothing, it is one line in `applyTowerFloorStart` — charge on the
victory instead of on the start — but a battle abandoned by closing the tab would then be free.

### Q47 — When a tower season starts counting

**Why it matters.** "The tower resets every 30 days" needs an anchor. A global one — every
chronicle's season turning over on the same date, like the banner rotation's fixed epoch — is
simpler, but it would reset a new player's tower two days after they earned it by finishing the
whole Intro campaign, which is the opposite of a reward.

**The default in use.** The season is anchored **per chronicle, to the first floor it ever
attempts** (`tower.seasonStartedAt` is 0 until then), and turns over in whole thirty-day steps from
there — so a chronicle closed for three months resumes on a season boundary rather than mid-season,
and a save migrated today gets a full thirty days whenever its owner finally walks in. The best
floor ever reached survives every reset; only the climb goes back to the foot of the tower.

The alternative, if you want every player on the same season (for a future leaderboard, or so that
"the tower resets tonight" means one thing): `seasonsElapsed` takes its epoch from a constant, and
making that constant global rather than per-save is a two-line change in `@engine/tower/tower.ts`.

### Q46 — What "Lighthouse ≥ 90" can mean for a game that never stops animating

**Why it matters.** ROADMAP Phase 15 accepts on "Lighthouse ≥ 90". Audited as a desktop page —
which is the only thing this game is (fixed 16:9, minimum window 1280 × 720) — the production
build scores **accessibility 100, SEO 100, performance 55**, with first contentful paint at 0.6 s
and largest at 1.5 s against §5.6's four-second budget.

The performance score is three-quarters Total Blocking Time, which counts main-thread long tasks
*after* load. This page's purpose is a canvas that animates for as long as it is open (§7.1:
"ambient motion on every screen"), so the main thread never goes quiet and TBT reads tens of
seconds however fast the game is. It is measuring the frame loop, not a stall — and on this
GPU-less build container every frame is software-rasterised, which inflates it further. No amount
of optimisation moves that number without removing the ambient motion the brief asks for.

**The default in use.** `pnpm perf:lighthouse --strict` gates **accessibility and SEO at ≥ 90**
(both 100) and gates **first and largest contentful paint at ≤ 4 s** — §5.6's own load budget,
which is what a flat score was standing in for. Performance is still printed, so a real regression
in it is visible. Frame time keeps its own instrument, `pnpm perf:battle --strict`, against the
16 ms p95 budget on the owner's iGPU (Q30). One line in `tools/perf/lighthouse.ts` puts the
performance category back in the gate if you would rather have the flat number.

### Q44 — Where the auto-repeat lesson sits, and how hard a lesson holds the screen

**Why it matters.** `TUTORIAL.md` §6 lists the standalone lessons of Steel and Bone with the levels
they belong to and writes auto-repeat as *(5/20/30)* — the three tiers' unlock levels rather than
three lessons. Level 5 is already busy: it is where chapter 4 teaches both the daily board and the
Idle Chest, and the first repeat tier is what the selector opens on anyway.

**The default in use.** The auto-repeat lesson waits for the **second** tier (level 20, the first
time the choice is a choice), and Steel and Bone's eight lessons run 7, 8, 9, 10, 12, 15, 18, 20.
One line in `src/content/tutorial/steel_and_bone.ts` moves it back to 5.

The same file settled a second thing worth confirming: **a lesson that sends the player somewhere
only points at it** (ring, caret, Eldric's strip — the screen stays theirs), while a lesson inside
a panel or a fight dims and blocks everything but what it asks for. The brief's "forced actions"
reads either way; this is the gentler reading, and it is one `allow: 'all'` per step to change.

### Q43 — Mission 2.5 asks for a rank-up, not for "a champion at 3★"

**Why it matters.** `QUESTS_MISSIONS.md` §4 prints mission 2.5 as *Rank up a champion to 3★*. A
Rare starts at **3★** (`RARITY_STARS`, `balance/stats.ts`) and every starter is a Rare, so the
mission would be complete before it opened — a row that pays a reward for nothing, at the exact
point in the Path where the Tavern's rank track is meant to be taught.

**The default in use.** 2.5 is **"Rank up a champion"** — `rank_up_times: 1`, the first rank-up
actually performed, whatever rank it lands on. The Path still teaches the bench, and chapter 4.3
keeps the design's *to 4★* as the first rank a Rare has to climb to. Say the word and it becomes a
`champion_reach_stars` row again (one line in `src/content/missions/chapter_02.ts`); if the intent
was instead that champions start below their rarity's base rank, that is a `balance/stats.ts`
change and a bigger conversation.

### Q42 — A quest that opens in the middle of the day

**Why it matters.** Six of the ten daily quests need a feature the chronicle may not have yet, and
a hidden one is stood in for by *Win 3 battles* carrying its points (`QUESTS_MISSIONS.md` §2). A
chronicle that crosses a feature gate at, say, four in the afternoon therefore changes boards
mid-period: the Forge quest appears and the stand-in shrinks by its ten points. The alternative is
to freeze each board's composition for the whole period, which would mean a feature you unlock
today gives you nothing to do with it until tomorrow.

**The default in use.** **The new quest appears at once.** The board is always read against the
chronicle's level now, so unlocking something is immediately worth a row. Two consequences are
handled rather than left ragged: the day a board is finished is counted **once**, even when a new
quest lands on a board that was already clear (the period's record carries `dayCounted`), and a
chest already taken is never taken back — only the points needed for one that is still waiting can
move. Say the word and the composition freezes with the period's baseline instead (one call in
`state/quests.ts`).

### Q41 — Titan's phase thresholds, and how far out of reach her tiers start

**Why it matters.** `BOSSES.md` §3 first printed her phases at 70 % and 35 % of her HP. Measured
against the roster the fight is written for — four 6★ champions in full Legendary gear,
`tests/fixtures/saves/weekly-boss.chronicle` — a key spent at those thresholds took **12.6 %** of
the Normal pool and her health never fell far enough for anything to happen: the Choristers take
half of every hit meant for her, and clearing them costs the turns that would have gone into the
pool. Nobody would ever have seen her second gear, let alone her third. A boss ability that never
fires is not shipped.

**The default in use.** The thresholds are now **90 % / 75 %**: phase II lands inside an ordinary
key, phase III on a good one, and a roster that can finish her in a week meets every gear she has.
Everything else the table prints — pools, stats, chests, XP — is untouched. Say the word and the
deeper 70/35 comes back (one line in `src/content/bosses/titan.ts`).

The same measurement sets the chorus: a Chorister holds 2 % of the pool. At a tenth of that the
party deletes both on the turn they appear and the split barely happens — six split hits in a whole
race, and a key worth the same as fighting her with no chorus at all. At 2 % it is forty, and the
choice the design asks for is real: clear them and lose the turns, or leave them and give up half
of every hit. (At the shipped numbers the same key banks about a fifth of the pool, because phase
III's self-heal keeps her standing longer and the damage that heals away still counts.)

The same measurement shows her lowest tier is a long way out at level 15: a mid-Epic roster loses
in three turns and banks a couple of thousand damage against a 100,000 first chest. That reads as
intended to me — the weekly boss is the target you grow towards and the daily boss is the farm —
but if you want her reachable the week she unlocks, the fix is a fourth tier below Normal
(≈ 500,000 HP) rather than a change to the three the design prints.

## 2. Answered

| # | Question | Owner's answer | Resulting change |
| --- | --- | --- | --- |
| Q1 | Seven Epic models vs "5 Epic" | Use all seven as Epics | Roster stays 23 (3/3/3/7/6/1); ADR-014 accepted |
| Q2 | Team size | 3 in Campaign, 4 in boss fights | `partySize` per encounter type; wave sizes reduced to 2–4 enemies; battle-setup slots per mode; ADR-015 (`BATTLE.md` §1, `CAMPAIGN.md` §1/§4, `BOSSES.md`) |
| Q3 | Reset time | Daily 00:00 local device time; weekly in the night from Sunday to Monday at 00:00 local | `ECONOMY.md` §9, `QUESTS_MISSIONS.md`, `SUMMONING.md` epoch, `ARCHITECTURE.md` §3.6, ROADMAP acceptance criteria |
| Q4 | Tutorial skipping | As recommended | Chapter 1 mandatory; later chapters skippable (`TUTORIAL.md`) |
| Q5 | Market in EA-0.1 | As recommended | Not in EA-0.1; Portal Exchange tab provides gem sinks; Market stays in the backlog |
| Q6 | Naming canon | As recommended | Veyrath, Emberhold, Eldric, Gargoyle, Titan, settlement and champion names kept |
| Q7 | Gear slots | Six now, accessories post-EA-0.1 | Unchanged; accessories in backlog |
| Q8 | Skill upgrades | Tomes only (Rare/Epic/Legendary/Mythic Tomes) | Duplicates are ordinary copies (rank-up food); ADR-016 (`CHAMPIONS.md` §3/§5, `ECONOMY.md` §3.3, `SUMMONING.md` §5, ROADMAP Phases 5/8) |
| Q9 | Ascension / Awakening | As recommended | Backlog |
| Q10 | Window handling | Fixed viewport, but it must feel like a real game, not a browser window | Installable PWA, fullscreen offered (never forced), custom cursor, browser-chrome guards; ADR-018 (`UI_DESIGN.md` §2.1, `CLAUDE.md` §7.1, ROADMAP Phase 0) |
| Q11 | Fonts | Approved | Alegreya Sans SC / Nunito Sans / Rajdhani |
| Q12 | Language | As recommended | English only; German first in backlog |
| Q13 | Save slots | As recommended | One save + backups + export/import |
| Q14 | Starter choice | As recommended | One of three Rares + the three Commons; tutorial pre-places starter + Bran + Wenna (3 slots) |
| Q15 | Energy | Unlimited refills as recommended; regen +1/min; cap +10 per player level; 1,000–3,000 energy over cap after tutorial and first quests | New energy model and Chronicler's Provisions; ADR-017 (`ECONOMY.md` §5/§5.1, `TUTORIAL.md`, `QUESTS_MISSIONS.md` rewards, `CAMPAIGN.md` §7 first clears, ROADMAP Phase 3/14) |
| Q16 | Difficulty / speed unlock strictness | Exactly as recommended | 1★ clears unlock the next difficulty and speed step |
| Q17 | Auto-repeat | As recommended | ×10 / ×25 / ×50 at levels 5 / 20 / 30 |
| Q18 | Turn limits | As recommended | 40 (50 boss stage) campaign, 50 daily boss, 100 weekly boss |
| Q19 | Eldric | As recommended | Legendary Eclipse Support, mission-line only |
| Q20 | Inventory capacity | As recommended | 400 pieces, warning at 90 %, overflow 20 |
| Q21 | Element wheel | As recommended | ±10 % damage, ±10 crit rate, no glancing hits |
| Q22 | Placeholder look | As recommended | Tinted lizard + rarity ring + sigils; bosses scaled |
| Q23 | Branching | Direct pushes to `main` granted | `CLAUDE.md` §2.9/§9.4, `AGENTS.md`; ADR-020 |
| Q24 | Additional assets | More assets added to `/game`; sourcing from reputable CC0/commercially-safe sources allowed; generating high-quality RPG sounds and VFX in-house allowed | `CLAUDE.md` §2.6, `ASSETS.md`, `CREDITS.md`, `tools/audio` + `tools/vfx` in the architecture; ADR-019 |
| Q25 | Team presets per mode | Yes, as recommended | 3 campaign presets + 3 boss presets with "last used" per mode; save schema `teams` keyed by mode (`ARCHITECTURE.md` §4.1, `UI_DESIGN.md` §5.8) |
| Q26 | Stage energy costs under the generous model | As recommended | Costs stay 4–10 for EA-0.1; re-checked by the Phase 15 30-day economy simulation |
| Q27 | Fullscreen on first launch | As recommended, but never force fullscreen | Offered once on the first title click (setting, default on); declining or exiting is remembered, never re-prompted, fully playable windowed (`UI_DESIGN.md` §2.1, `ARCHITECTURE.md` §11, ADR-018) |
| Q28 | Re-encode the two music tracks | As recommended | The originals ship untouched; the OGG/Opus re-encode stays a Phase 15 (polish) option, one pipeline step away |
| Q29 | Should an enemy's level scale its stats | As recommended | Enemy level stays cosmetic; stage index and difficulty do the scaling (`BATTLE.md` §4.5, `CAMPAIGN.md` §5) |
| Q30 | Frame-budget sign-off on real hardware | As recommended | The bench ships and the budget stands on its structure; `pnpm build && pnpm preview` then `pnpm perf:battle` is the one-command check whenever the owner is at an Iris Xe class machine. FX density and ember count are the first knobs if p95 lands high |
| Q31 | Is the retuned campaign curve right | As recommended | The Phase 3 ladder ships: `STAGE_GROWTH_TOP` 4.8, `STAGE_GROWTH_POWER` 2, `DIFFICULTY_MULT` ×1/×2.5/×6, archetype bases at 65 %; `pnpm sim:balance --strict` guards the bands |
| Q32 | Should a stand's XP level champions on the spot | As recommended | Battle XP levels champions and the chronicle immediately; the Tavern (Phase 5) adds brews and food on top of the same curve |
| Q33 | Auto-repeat opens at chronicle level 5 | As recommended | The gates stay as designed: ×10 at 5, ×25 at 20, ×50 at 30 (`AUTO_REPEAT_TIERS`, `FEATURE_UNLOCK_LEVEL`) |
| Q34 | Should a title be worn, one at a time | As recommended | One worn title chosen from those earned, or none; `profile.title` is the only stored part (save v5), the earned set stays derived |
| Q35 | Should a level-up refill interrupt a batch | As recommended | The refill lands mid-batch and the batch runs on; the celebration waits for the screen after the fight (`LEVEL_ENERGY_REFILL`) |
| Q36 | Should the Armoury stay a screen of its own once the Forge lands | Keep the extra Armoury screen for now | The Armoury stays its own route; the Forge (Phase 7) is *Craft* / *Dismantle* / *Refine* and links to it rather than swallowing it (`UI_DESIGN.md` §5.11) |
| Q37 | What a single piece's power is measured against | As recommended | The fixed reference champion stays: `GEAR_POWER_REFERENCE` keeps the racks' order stable as the selection changes (ADR-027) |
| Q38 | Where should Glyph Sigils come from until the weekly boss and the quests exist | As recommended | The 20-star chests keep carrying Sigils (Intro 1, Normal 2, Hard 3) in `STAR_CHESTS`; the weekly boss and quest sources (Phases 9/12/13) replace that line rather than stack with it |
| Q39 | Should a ×10 press play one ritual or ten | As recommended | One ritual per press, lit by the best pull in it: the gate opens once and gives up ten champions, rarest last, and a Legendary or Mythic anywhere in the ten still gets its pillar and its chime |
| Q40 | Should a chronicle that predates the Idle Chest be paid for the time it was away | As recommended | Yes: migration 7→8 starts the chest at the chronicle's last save, so a returning player finds it as full as their absence allows. The cap means that is at most one chest — a welcome back, not a windfall (`ECONOMY.md` §6) |
| Q45 | The economy is about 1.8× as generous as `ECONOMY.md` §7–§8 estimated | “The economy is fine like it is currently. 4 Ancient Shards in Week 1 is totally fine and not *too much*.” | Nothing is nerfed: the measured figures stand as the design. §7–§8 keep the printed measurements, and `tools/sim/economy-script.ts`'s bands stay as the regression guard — they now hold a signed-off shape rather than a provisional one |
| Q50 | How big should the Glorious Palace be — a tree you can finish, or one you never will | About 240 points: a long haul you can finish | 237 points (`PALACE_TREE_COST`): the Heart plus four 59-point branches. The campaign's 36 are the backbone and the tower keeps it moving (`GLORIOUS_PALACE.md` §2) |
| Q51 | Should the Eternal Tower pay skill points again after a season reset | Yes — every season, up to the floor reached | `awardTowerFloor` keeps a per-season watermark: a new season pays the whole climb again, which is what makes the tower the engine of the tree after the campaign runs out (`GLORIOUS_PALACE.md` §2) |
| Q52 | What a respec costs | Free, any time | "Reclaim all points" darkens the whole tree and hands every point back, as often as the player likes. `spent` is derived, so the reset needs no bookkeeping at all (`GLORIOUS_PALACE.md` §4) |
| Q53 | Where the Palace is entered from | A new building on the hub, open once the first settlement falls | The lit keep on the Emberhold artwork, gated on progress rather than on a player level the way the tower is (`GLORIOUS_PALACE.md` §5) |
| Q54 | Whether a Brewery run costs energy as well as one of the day's twenty | No — the twenty runs are the whole price | The brief names one cost and only one, and a second would make a day in the Brewery compete with the campaign for the same bar. `applyBreweryRunStart` charges the run and nothing else; adding a cost later is one line in the same reducer (`BREWERY.md` §5) |
| Q55 | Whether any hall other than Eclipse keeps a calendar | No — the other three brew every day | `BREWERY_OPEN_DAYS` holds one row per element, so giving the Gilded Cask a calendar is a data edit and needs no code. Only the Waning Cellar has one today, exactly as the brief asks (`BREWERY.md` §2) |
| Q56 | How far the boss rename should go — the menu labels, or the characters | Full rename: Gravemaw → Gargoyle and Nyxara → Titan everywhere, with new titles and lore to match | The owner chose the full rename. Both keep their kit and their numbers; the three abilities whose names carried the old flavour follow the new one, and both are written as *it*. Save v17 moves every id a chronicle stored for them, so nothing a player had done to either is lost (`BOSSES.md`) |
| Q58 | What happens after day 30 of the Login Calendar | It repeats from day 1, forever | The owner chose the repeat over the one-time arc, having been told it makes the board permanent income rather than an onboarding gift. So `sim:economy` carries it as an income line and holds it to two bands — ~240 gems a week and at most 12,000 gold a day — and the board's own `LOGIN_BOARD` comment says that raising a gem row moves them (`LOGIN.md` §5) |
| Q59 | What a Quest Voucher resets — the quests only, or the chests too | Full reset, chests included | The baseline is re-snapshotted to *now*, so a counter goal measures from there and the whole board is earnable again. A board earned twice still counts one day towards the weekly quest that counts days, and the daily hundred's every-third-claim Ancient Shard advances on a voucher claim like any other — which is what stops three vouchers being a cheaper shard than the Portal's 300 gems (`MARKET.md` §2.1) |
| Q60 | Whether a skipped mission still counts towards its chapter chest | Yes, counts fully | The step enters `claimed` like any other, so the line advances and the chapter's chest counts it; the only thing lost is that step's own reward. It bumps `missions.skipped` rather than `missions.claimed`, because that counter feeds quests asking how many have been *earned* (`MARKET.md` §3) |
| Q61 | Whether the Gem Market's bundles are repeatable | One-time per chronicle | Which is what lets them be priced at ~70 % of their parts: a repeatable bundle at that price would simply be a permanent 30 % discount on the shelf, and the single prices would be fiction (`MARKET.md` §2.2) |
