# USER_QUESTIONS.md — Questions for the owner

Each question states **why it matters** and the **default** in use until answered. Nothing here
blocks development. Answered items live in §2 with the owner's answer and the change it caused.

## 1. Open

None. The owner handed the last nine to the recommendation each one carried (26 September 2026, in
the `0.9.10` batch), and the table below records what that settled.

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
| Q41 | Titan's phase thresholds, and how far out of reach her tiers start | “Use your recommendation.” | The thresholds stay 90 % / 75 % with the 2 % chorus, and she gains an **Easy** tier below Normal: 500,000 HP with hits a level-15 roster can stand through, so a key banks about 5 % of it for an ungeared 4★ Epic team and a finished roster puts her down in one. The gate opens on the tier the chronicle is working on (`BOSSES.md` §3, `UI_DESIGN.md` §5.13) |
| Q42 | A quest that opens in the middle of the day | “Use your recommendation.” | Unchanged: a quest a new unlock brings appears at once; the day a board is finished counts once, and a chest already taken is never taken back (`QUESTS_MISSIONS.md` §2) |
| Q43 | Mission 2.5 asks for a rank-up, not for "a champion at 3★" | “Use your recommendation.” | Unchanged: 2.5 is *Rank up a champion* (`rank_up_times: 1`), the first rank-up actually performed; 4.3 keeps the design's *to 4★* (`QUESTS_MISSIONS.md` §4) |
| Q44 | Where the auto-repeat lesson sits, and how hard a lesson holds the screen | “Use your recommendation.” | Unchanged: the lesson waits for the ×25 tier at level 20, and a lesson that sends the player somewhere only points at it while one inside a panel or a fight holds the screen (`TUTORIAL.md` §6) |
| Q45 | The economy is about 1.8× as generous as `ECONOMY.md` §7–§8 estimated | “The economy is fine like it is currently. 4 Ancient Shards in Week 1 is totally fine and not *too much*.” | Nothing is nerfed: the measured figures stand as the design. §7–§8 keep the printed measurements, and `tools/sim/economy-script.ts`'s bands stay as the regression guard — they now hold a signed-off shape rather than a provisional one |
| Q46 | What "Lighthouse ≥ 90" can mean for a game that never stops animating | “Use your recommendation.” | Unchanged: `perf:lighthouse --strict` gates accessibility and SEO at ≥ 90 and first and largest paint at ≤ 4 s; the performance score is printed, and frame time has its own instrument, `perf:battle` |
| Q47 | When a tower season starts counting | “Use your recommendation.” | Unchanged: per chronicle, from its first floor attempt, in whole thirty-day steps, so a new tower is never reset days after it opens (`ETERNAL_TOWER.md` §7) |
| Q48 | A lost floor still spends its Eternal Key | “Use your recommendation.” | Unchanged: the key is charged when the floor starts, won or lost, so a reload cannot buy a free attempt; a player short of keys can now buy five (Q49) |
| Q49 | Nothing grants Eternal Keys, so 16/10 is unreachable | “Use your recommendation.” | The gem refill ships: five keys for **150** gems in the Wallet (the tower's *Buy keys* opens it there), past the cap like any grant. The drafted 40 was repriced before it shipped: floor 100's shard rolls are worth ~21 gems a key at the Portal's exchange, so 8 gems a key would have turned gems into shards at 2.6×. `sim:economy` audits both refills (`ECONOMY.md` §5.2) |
| Q50 | How big should the Glorious Palace be — a tree you can finish, or one you never will | About 240 points: a long haul you can finish | 237 points (`PALACE_TREE_COST`): the Heart plus four 59-point branches. The campaign's 36 are the backbone and the tower keeps it moving (`GLORIOUS_PALACE.md` §2) |
| Q51 | Should the Eternal Tower pay skill points again after a season reset | Yes — every season, up to the floor reached | `awardTowerFloor` keeps a per-season watermark: a new season pays the whole climb again, which is what makes the tower the engine of the tree after the campaign runs out (`GLORIOUS_PALACE.md` §2) |
| Q52 | What a respec costs | Free, any time | "Reclaim all points" darkens the whole tree and hands every point back, as often as the player likes. `spent` is derived, so the reset needs no bookkeeping at all (`GLORIOUS_PALACE.md` §4) |
| Q53 | Where the Palace is entered from | A new building on the hub, open once the first settlement falls | The lit keep on the Emberhold artwork, gated on progress rather than on a player level the way the tower is (`GLORIOUS_PALACE.md` §5) |
| Q54 | Whether a Brewery run costs energy as well as one of the day's twenty | No — the twenty runs are the whole price | The brief names one cost and only one, and a second would make a day in the Brewery compete with the campaign for the same bar. `applyBreweryRunStart` charges the run and nothing else; adding a cost later is one line in the same reducer (`BREWERY.md` §5) |
| Q55 | Whether any hall other than Eclipse keeps a calendar | No — the other three brew every day | `BREWERY_OPEN_DAYS` holds one row per element, so giving the Gilded Cask a calendar is a data edit and needs no code. Only the Waning Cellar has one today, exactly as the brief asks (`BREWERY.md` §2) |
| Q56 | How far the boss rename should go — the menu labels, or the characters | Full rename: Gravemaw → Gargoyle and Nyxara → Titan everywhere, with new titles and lore to match | The owner chose the full rename. Both keep their kit and their numbers; the three abilities whose names carried the old flavour follow the new one, and both are written as *it*. Save v17 moves every id a chronicle stored for them, so nothing a player had done to either is lost (`BOSSES.md`) |
| Q57 | "No Epic or Legendary in the Intro Campaign": the difficulty, or the early settlements? | “Use your recommendation.” | Unchanged: the difficulty. Intro's row in `DROP_RARITY_WEIGHTS` stops at Rare; the settlement decides a piece's stars, the difficulty how good it is (`CAMPAIGN.md` §7) |
| Q58 | What happens after day 30 of the Login Calendar | It repeats from day 1, forever | The owner chose the repeat over the one-time arc, having been told it makes the board permanent income rather than an onboarding gift. So `sim:economy` carries it as an income line and holds it to two bands — ~240 gems a week and at most 12,000 gold a day — and the board's own `LOGIN_BOARD` comment says that raising a gem row moves them (`LOGIN.md` §5) |
| Q59 | What a Quest Voucher resets — the quests only, or the chests too | Full reset, chests included | The baseline is re-snapshotted to *now*, so a counter goal measures from there and the whole board is earnable again. A board earned twice still counts one day towards the weekly quest that counts days, and the daily hundred's every-third-claim Ancient Shard advances on a voucher claim like any other — which is what stops three vouchers being a cheaper shard than the Portal's 300 gems (`MARKET.md` §2.1) |
| Q60 | Whether a skipped mission still counts towards its chapter chest | Yes, counts fully | The step enters `claimed` like any other, so the line advances and the chapter's chest counts it; the only thing lost is that step's own reward. It bumps `missions.skipped` rather than `missions.claimed`, because that counter feeds quests asking how many have been *earned* (`MARKET.md` §3) |
| Q61 | Whether the Gem Market's bundles are repeatable | One-time per chronicle | Which is what lets them be priced at ~70 % of their parts: a repeatable bundle at that price would simply be a permanent 30 % discount on the shelf, and the single prices would be fiction (`MARKET.md` §2.2) |
| Q62 | Whether a gear card keeps its slot glyph beside the set emblem | “Keep emblem only, the new Icons for the Gear pieces are identifier enough.” | The default stands: the emblem alone, bottom-left on its stone plate. The painting says the slot, and the name, the bench, the card's accessible label and the slot filter still name it; `GearCard` draws the glyph only for a piece whose set has left the content (`GEAR.md` §5.1) |
