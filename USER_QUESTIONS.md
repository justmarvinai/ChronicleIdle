# USER_QUESTIONS.md — Questions for the owner

Each question states **why it matters** and the **default** in use until answered. Nothing here
blocks development. Answered items live in §2 with the owner's answer and the change it caused.

## 1. Open

### Q44 — Where the auto-repeat lesson sits, and how hard a lesson holds the screen

**Why it matters.** `TUTORIAL.md` §6 lists the standalone lessons of Steel and Bone with the levels
they belong to and writes auto-repeat as *(5/20/30)* — the three tiers' unlock levels rather than
three lessons. Level 5 is already busy: it is where chapter 4 teaches both the daily board and the
Idle Chest, and the first repeat tier is what the selector opens on anyway.

**The default in use.** The auto-repeat lesson waits for the **second** tier (level 20, the first
time the choice is a choice), and Steel and Bone's eight lessons run 7, 8, 9, 10, 12, 15, 18, 20.
One line in `src/content/tutorial/chapter_6.ts` moves it back to 5.

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

### Q41 — Nyxara's phase thresholds, and how far out of reach her tiers start

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
deeper 70/35 comes back (one line in `src/content/bosses/nyxara.ts`).

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
| Q6 | Naming canon | As recommended | Veyrath, Emberhold, Eldric, Gravemaw, Nyxara, settlement and champion names kept |
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
