# USER_QUESTIONS.md — Questions for the owner

Each question states **why it matters** and the **default** in use until answered. Nothing here
blocks development. Answered items live in §2 with the owner's answer and the change it caused.

## 1. Open

### Q28 — Re-encode the two music tracks?
**Why it matters.** `outside_combat.mp3` (6.8 MB) and `combat_campaign_depths_arena.mp3`
(8.1 MB) are streamed on demand, so they never block the game, but they are the two biggest
downloads by far (Lighthouse "total byte weight"). Re-encoding them in-house to OGG/Opus at
~128 kbps would cut them to roughly 2–3 MB each with no audible change on laptop speakers.
**Default until answered.** The originals ship untouched (music quality is the owner's call);
the pipeline gains the re-encode step in Phase 15 (polish) if you say yes.

### Q29 — Should an enemy's level scale its stats?
**Why it matters.** `BATTLE.md` §4.5 scales enemies by difficulty and stage index only; the
level shown on their plates (`enemyLevel`) is presentation, and the result screen's
"under-levelled" hint compares those levels with your champions'. Making level a real multiplier
would double up with the stage growth and change every campaign number.
**Default until answered.** Level stays cosmetic. Campaign stages (Phase 3) will set
`enemyLevel` to track the stage index so the read stays honest.

### Q30 — Frame-budget sign-off on real hardware
**Why it matters.** The remote build environment has no GPU: the battle perf bench runs on
SwiftShader there (roughly 2–3 frames per second at 1080p), so its numbers cannot prove or
disprove the 16 ms p95 budget of `CLAUDE.md` §5.6 on an Iris Xe class iGPU.
**Default until answered.** Phase 2 ships with the bench in place; the budget is verified on
your laptop with `pnpm build && pnpm preview` then `pnpm perf:battle` (the report prints as a
Markdown table). If p95 lands above 16 ms there, the FX density and ember count are the first
knobs (`render/battle/stage.ts` `embers`, `fx/registry.ts` scales) and the fix ships as a `0.0.2.x`
patch.

### Q31 — Is the retuned campaign curve the difficulty you want?
**Why it matters.** The Phase 2 enemy ladder could not be won (the linear stage term reached ×7.5
by the last stage, ×49 with Hard's multiplier, against a roster that can only grow ~×3 before gear
and rank-up exist), so Phase 3 retuned it: a quadratic stage term ×1.00 → ×4.80, difficulty steps
×1 / ×2.5 / ×6, and archetype bases at 65 % of their old values (`BATTLE.md` §4.5,
`CAMPAIGN.md` §5). Measured with `pnpm sim:balance`: a new save's roster at level 10 clears Intro
settlements 1–4, grinds 5–6 and stalls at 7–8; a mid-Epic roster clears Intro and stalls in
Normal's second half; the modelled endgame roster clears Hard with three stars still a fight.
**Default until answered.** Those numbers ship. They are four constants — `STAGE_GROWTH_TOP`,
`STAGE_GROWTH_POWER`, `DIFFICULTY_MULT` and the archetype bases — so "harder" or "gentler" is one
edit plus `pnpm sim:balance --strict`, and the bands live in `tools/sim/teams.ts`.

### Q32 — Should a stand's XP level champions on the spot?
**Why it matters.** `ECONOMY.md` §3.1 lists battles as a champion-XP source and the Tavern
(Phase 5) as the place to *spend* brews and food. Phase 3 therefore applies a win's XP to the
champions that fought and to the chronicle, levelling while the bar fills — otherwise the campaign
would be unplayable until Phase 5, since the difficulty curve assumes levelling. The level-up
*moment* (the full energy refill, the per-level rewards, the celebration) is still Phase 4's.
**Default until answered.** Battle XP levels champions and the chronicle immediately; the Tavern
will add brews and food on top of the same curve.

### Q33 — Auto-repeat opens at chronicle level 5; is that too far?
**Why it matters.** `CAMPAIGN.md` §9 gates ×10 at level 5, ×25 at 20 and ×50 at 30. With the
campaign as the only XP source in 0.0.3, level 5 is roughly fifty Intro runs; quests, missions and
the idle chest (Phases 9, 12, 13) will shorten that a lot.
**Default until answered.** The gates stay as designed. `AUTO_REPEAT_TIERS` and
`FEATURE_UNLOCK_LEVEL` are one edit each if you want ×10 from the start.

### Q34 — Should a title be worn, and is one at a time enough?
**Why it matters.** `ECONOMY.md` §4 listed titles as something the profile *shows*. Phase 4 makes
which titles are earned derived from the play (never stored, CLAUDE.md §5.5) and adds one stored
choice: the title the chronicle wears, shown beside the name in the top-bar chip and in the
profile. Anything more — several at once, a frame or colour per title, titles as a reward the
summon or the shop can grant — changes what a title *is*.
**Default until answered.** One worn title, chosen from those earned, or none. `profile.title` in
the save is the only stored part; adding a second slot later is a migration and a picker change.

### Q35 — A level-up refills energy by the new cap; should it also interrupt a batch?
**Why it matters.** Q15's refill is generous on purpose: early levels hand out 70–150 energy at a
run cost of 4, so an auto-repeat batch that levels the chronicle keeps going far past where its
energy would have run out. That is the intended feel (a level-up should change the evening), but
it does mean a ×50 batch on a cheap stand can run much longer than the player expected.
**Default until answered.** The refill lands mid-batch and the batch continues; the celebration
waits for the screen after the fight. `LEVEL_ENERGY_REFILL` in `balance/levels.ts` turns the
refill off in one edit if a batch should stop at the energy it started with.

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
