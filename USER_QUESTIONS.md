# USER_QUESTIONS.md — Questions for the owner

Each question states **why it matters** and the **default** in use until answered. Nothing here
blocks development. Answered items live in §2 with the owner's answer and the change it caused.

## 1. Open

**Q38 — Where should Glyph Sigils come from until the weekly boss and the quests exist?**
*Why it matters:* a Sigil is what lets a craft name its set (`GEAR.md` §6). Its designed homes —
the weekly boss, the Chronicler's Path and the weekly quests (`ECONOMY.md` §2) — are Phases 9, 12
and 13, so without an interim source the Forge ships with a chooser nobody can use.
*Default in use:* the 20-star chest of each difficulty carries Sigils (Intro 1, Normal 2, Hard 3)
on top of what it already gave. It is a slow supply that rewards clearing a settlement properly,
and the later sources replace it rather than stack with it — one line in
`STAR_CHESTS` (`src/content/balance/campaign.ts`) to take back out.

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
