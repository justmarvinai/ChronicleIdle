# ROADMAP — ChronicleIdle to Early Access 0.1

Rules: one phase = **one fully working feature** (Phase 0 is the playable shell everything else
plugs into). No phase ships partially. Definition of Done: `AGENTS.md` §3. Between phases the
agent asks the owner for improvements/bugs without requiring an answer (`CLAUDE.md` §9.2).

Status legend: `⬜ not started` · `🟨 in progress` · `✅ shipped in x.y.z`

| Phase | Feature | Version tag | Status |
| --- | --- | --- | --- |
| P | Planning (this document set) | — | ✅ |
| 0 | Foundation & Game Shell | 0.0.0 | ✅ shipped in 0.0.0 |
| 1 | Champions & Collection | 0.0.1 | ✅ shipped in 0.0.1 |
| 2 | Battle System | 0.0.2 | ✅ shipped in 0.0.2 |
| 3 | Campaign | 0.0.3 | ✅ shipped in 0.0.3 |
| 4 | Player Level & Profile | 0.0.4 | ✅ shipped in 0.0.4 |
| 5 | Tavern — Champion Upgrading | 0.0.5 | ✅ shipped in 0.0.5 |
| 6 | Gear | 0.0.6 | ✅ shipped in 0.0.6 |
| 7 | The Forge — Crafting | 0.0.7 | ✅ shipped in 0.0.7 |
| 8 | Summoning Portal | 0.0.8 | ✅ shipped in 0.0.8 |
| 9 | Idle Chest | 0.0.9 | ✅ shipped in 0.0.9 (rebalanced in 0.0.9.1) |
| 10 | The Gargoyle | 0.0.10 | ✅ shipped in 0.0.10 |
| 11 | The Titan | 0.0.11 | ✅ shipped in 0.0.11 |
| 12 | Daily & Weekly Quests | 0.0.12 | ✅ shipped in 0.0.12 |
| 13 | The Chronicler's Path (missions) | 0.0.13 | ✅ shipped in 0.0.13 |
| 14 | Tutorial & Onboarding | 0.0.14 | ✅ shipped in 0.0.14 |
| 15 | Balance, Polish, Performance → **EA-0.1** | **0.1.0** | ✅ shipped in 0.1.0 |

Why this order: the engine (0–2) must exist before content that uses it; campaign (3) is the
first real content and the source of XP/drops for everything after; player level (4) gates all
later unlocks; champion growth (5) and gear (6–7) are needed before summoning (8) matters; the
cadence systems (9–13) reference all of the above; the tutorial (14) teaches the finished game;
15 turns it into a release. Currencies and elements are cross-cutting and are introduced in
Phase 0/2 and extended in each phase.

---

## Phase 0 — Foundation & Game Shell (`0.0.0`)

**Status.** ✅ shipped in 0.0.0 (2026-09-12). See `CHANGELOG.md` for what landed and the
verification notes.

**Goal.** A runnable, deployable game shell that already feels like ChronicleIdle: title screen,
new/continue chronicle, Emberhold hub with navigation, settings, saves, music. No game systems yet,
but everything a system will plug into.

**Scope**
- Project scaffold per `CLAUDE.md` §3–4: Vite + React 19 + TS strict, pnpm, ESLint boundaries,
  Prettier, Vitest, Playwright, CI workflow, `vercel.json`, `.nvmrc`.
- `tools/assets` pipeline → generated atlases/WebP/manifest; typed `AssetKey`.
- `GameViewport` (1920×1080 scaling, letterbox backdrop), router with screen stack, loading screen.
- Game window: installable PWA (web manifest + versioned service-worker precache with an update
  prompt), fullscreen offered at launch (never forced), custom cursor, browser-chrome guards (`docs/tech/UI_DESIGN.md` §2.1).
- Design system: tokens, fonts, the full component library of `UI_DESIGN.md` §4 with a component
  gallery (`/?screen=devkit`, code-split and never linked from the game) showing every component
  in every state.
- State: Zustand store, slices skeleton (`profile`, `wallet`, `settings`, `ui`), persistence
  (IndexedDB, debounce, backups), migration framework (v1), export/import `.chronicle`.
- Wallet system with **all 24 currencies** defined (icons, names, top-bar pills), even though most
  are earned only in later phases.
- Screens: Title, Hub (all hotspots present; locked ones show "unlocks at level N"), Settings,
  Profile dialog (name, avatar placeholder), Game Modes (cards locked as appropriate).
- Audio: MusicDirector with the two tracks, AmbienceDirector (the owner's ambience sets per screen),
  SFX bus fed by the owner's SFX packs plus in-house generated UI sounds (`tools/audio`), mixer settings.
- Ambient layers: hub fog/lanterns/fireflies, title fog; reduced-motion handling.
- Content framework: `define*` helpers, registry, Zod validation, `pnpm content:validate`,
  balance folder with the constants documented in `CONTENT_AUTHORING.md` §8.
- `docs/tech/DEPLOYMENT.md` verified with a real build to `dist/`.

**Acceptance criteria**
- `pnpm dev` boots to Title in < 3 s; New Chronicle → name → Hub; reload → Continue restores.
- Export/import round-trip; corrupted import rejected with a readable panel.
- Every hub hotspot navigates (to a "locked" panel where the feature is a later phase).
- Component gallery renders all components in all states without console warnings.
- `pnpm build` output deploys on a local nginx container and on Vercel preview.
- Lighthouse performance ≥ 90 on the title screen; no layout shift.
- Installs as a standalone app from Chrome/Edge; fullscreen toggles with F11 and the title button;
  declining or leaving fullscreen is remembered and never re-prompted; everything is playable
  windowed; no browser scrollbars, text selection or context menus anywhere.

## Phase 1 — Champions & Collection (`0.0.1`)

**Status.** ✅ shipped in 0.0.1 (2026-09-12). See `CHANGELOG.md` for what landed.

**Goal.** The full EA-0.1 roster exists as content and the Champions screens are complete.

**Scope**
- Content: all 23 champions (`CHAMPIONS.md` §4) with kits authored in the effect DSL (validated
  even though the battle engine lands in Phase 2), lore, art keys; seven models + placeholders.
- Engine: stat calculators (`statAt`, power), champion instance model, roster reducers
  (add, lock, favourite, avatar).
- Screens: Champions index (grid, sort, filters, virtualised), Champion detail (Info, Abilities,
  Lore tabs; Gear tab shows slots as locked until Phase 6), lock/favourite, avatar selection.
- Dev/debug: a hidden "Chronicle Debug" panel (dev builds only) to grant champions/currencies.
- Starting roster seeded on New Chronicle (starter choice UI, Rare trio) — the tutorial script
  comes in Phase 14; the choice screen itself ships now.

**Acceptance criteria**
- All 23 champions render with correct rarity frames, elements, roles, stars, abilities text with
  live numbers; placeholders tinted and labelled.
- Sorting/filtering correct for 200+ instances (perf test with generated roster).
- Save round-trip of roster; fixture `v1.json`.

## Phase 2 — Battle System (`0.0.2`)

**Status.** ✅ shipped in 0.0.2 (2026-09-13). See `CHANGELOG.md` for what landed; the frame
budget is verified on real hardware with `pnpm perf:battle` (USER_QUESTIONS.md Q30).

**Goal.** Complete, animated, deterministic battles: manual and auto, ×1/×2 (×3/×4 behind unlock
flags), elements, all 26 statuses, the full effect DSL, AI policy, result screen. Playable from a
temporary "Training Grounds" entry on Game Modes (removed in Phase 3 when Campaign replaces it).

**Scope**
- Engine: `engine/battle/*` per `BATTLE.md` and `ARCHITECTURE.md` §3.2–3.3 with ≥ 90 % test
  coverage; replay from seed + decision log; `sim` harness.
- Render: Pixi battle stage, sprite atlases, synthesised attack choreography, FX library built from the
  owner's VFX packs (Free Pixel Effects Pack, GameFX strips), in-house procedural flipbooks
  (`tools/vfx`) and Pixi particles (element projectiles, impacts, statuses, death, revive), damage numbers, camera, ultimate cut-ins,
  parallax backdrops with colour grading.
- UI: Battle HUD (unit plates, TM bars, status rows, wave/turn/timer, ability bar, target
  reticle, Info panel with battle log), pause menu (retreat, settings), Battle result (victory/
  defeat), speed & auto toggles, hotkeys.
- Party sizes per encounter type (3 in campaign-type encounters, 4 in boss-type) with per-mode team presets.
- Content: enemy archetypes and a Training Grounds encounter set (3 encounters incl. a boss-style
  one) used only until Phase 3.
- Audio: battle SFX map, victory/defeat stingers, music switch.

**Acceptance criteria**
- Same seed + decisions → identical event log (test); 1,000 random auto battles run headless
  in < 10 s without errors.
- All statuses and effects covered by tests and demonstrable in Training Grounds.
- ×4 stress battle (4 v 4 with FX, above any real encounter): p95 frame ≤ 16 ms on the perf bench.
- Manual mode works fully with mouse and keyboard; auto beats Training Grounds encounters 1–2
  with the starter team.

## Phase 3 — Campaign (`0.0.3`)

**Status.** ✅ shipped in 0.0.3 (2026-09-13). See `CHANGELOG.md` for what landed. The enemy
ladder was retuned during this phase (`BATTLE.md` §4.5) because the Phase 2 curve could not be
won; `pnpm sim:balance --strict` guards the bands from here on and runs in CI. Champion and player
levels now rise from battle XP; the level-up *moment* (refill, rewards, celebration) stays Phase 4.

**Goal.** The complete campaign: 12 settlements × 10 stages × 3 difficulties, world map, stage
lists, battle setup, energy, drops, stars, first-clear and star chests, speed unlocks, auto-repeat.

**Scope**
- Content: 12 settlements with named factions/enemies/bosses, 120 stage definitions, drop tables,
  difficulty overrides; energy costs; reward formulas (`CAMPAIGN.md`).
- Engine: energy (+1/min regen, cap 60 + 10 per level — level-1 cap until Phase 4 — unlimited reward
  overflow, Chronicler's Provisions hooks), stage
  unlock logic, star evaluation, reward rolls, first-clear/star-chest tracking, difficulty and
  speed unlocks, auto-repeat loop.
- Screens: Campaign map, Settlement stages, Battle setup (team slots, presets, waves preview,
  auto-repeat selector), auto-repeat HUD and summary; Game Modes card shows current stage.
- `pnpm sim:balance` with reference teams and win-rate bands; initial tuning pass.

**Acceptance criteria**
- Every stage playable; unlock chain correct; Normal/Hard gating and ×3/×4 unlock verified
  with debug saves; energy spent/refunded correctly (retreat refunds nothing; a crash/reload
  does not double-spend).
- Drop tables validated to sum; 10k-roll statistical test within tolerance.
- Balance report: Intro clearable by the "starter Lv10" team through settlement 3, "mid Epic"
  team through Intro end; Hard end requires "endgame" team (bands in `tools/sim/teams.ts`).

## Phase 4 — Player Level & Profile (`0.0.4`)

**Status.** ✅ shipped in 0.0.4 (2026-09-14). See `CHANGELOG.md` for what landed. Intro's
all-3★ chest (an Epic champion of the player's choice) is the one piece still waiting: it needs
the Summoning Portal's picker, so `MILESTONE_CHESTS.intro` is `null` until Phase 8.

**Goal.** Player XP, levels 1–100, level-up rewards and energy cap growth, the unlock schedule,
the Profile screen with stats and titles.

**Scope**: XP sources wired (campaign, later bosses/quests add theirs), level-up moment (full
energy refill, rewards, stinger, dialog), unlock gating for every hub hotspot and screen using the
table in `GAME_DESIGN.md` §6, Profile dialog (avatar picker, name, stats, titles), top-bar chip
with XP bar. Tests for curve, unlocks, refill/overflow.

**Scope carried from Phase 3**: the all-3★ milestone chest of `CAMPAIGN.md` §7 — Normal's
(2 Sacred Shards + 300 Gems) and Hard's (1 Primordial Shard + 1,000 Gems + the title "Warden of
Veyrath") land here with titles; Intro's (an Epic champion of the player's choice) waits for the
Summoning Portal's picker in Phase 8.

**Acceptance criteria**: level-up at exact thresholds; unlocks appear/disappear correctly on
level change; fixture save `v4.json` (Phase 3's schema, frozen); profile stats reflect lifetime
counters; the milestone chests pay out once, on the run that completes the difficulty.

## Phase 5 — Tavern: Champion Upgrading (`0.0.5`)

**Status.** ✅ shipped in 0.0.5 (2026-09-14). See `CHANGELOG.md` for what landed. Ascension is
not part of it (owner's answer Q9 keeps it in the backlog), so the Tavern has three tracks rather
than the reference screen's four.

**Goal.** Level up (brews + food), rank up (stars), skill upgrades (Skill Tomes only) with the
full Tavern screen and animations.

**Scope**: reducers and costs (`ECONOMY.md` §3), food finder/auto-fill with safety rules, level
cap by stars, rank-up star ignition, skill upgrade steps applied to ability numbers (battle uses
them), Tavern screen tabs and offering slots, confirmations for consuming Rare+ or leveled food.

**Acceptance criteria**: XP maths matches doc; cannot exceed cap; rank-up requires exact food;
skill upgrade changes live ability text and battle behaviour (test); locked/favourite champions
never consumed.

## Phase 6 — Gear (`0.0.6`)

**Status.** ✅ shipped in 0.0.6 (2026-09-14). See `CHANGELOG.md` for what landed. The inventory
ships as its own screen, the Armoury, and stays one by the owner's answer to Q36; Phase 7's Forge
is *Craft* / *Dismantle* / *Refine* beside it (`UI_DESIGN.md` §5.11).

**Goal.** Gear items with rarity/stars/level/main/sub stats and 14 sets; drops from campaign;
equip/unequip with compare; upgrade to +16; inventory management; set bonuses active in battle.

**Scope**: gear generator (drop and craft share it), stat tables, level-up rolls, set bonus
passives in the engine, inventory slice and screen, champion Gear tab, compare panel, lock, sort/
filter, capacity rules; campaign drop integration; power recomputation.

**Acceptance criteria**: 10k generated pieces respect tables; set bonuses verified in battle
tests (e.g. Retaliation counters ~30 %); equip/unequip persists; capacity overflow handled.

## Phase 7 — The Forge: Crafting (`0.0.7`)

**Status.** ✅ shipped in 0.0.7 (2026-09-14). See `CHANGELOG.md` for what landed. Glyph Sigils
ride the 20-star chests until the weekly boss and the quests arrive (`USER_QUESTIONS.md` Q38).

**Goal.** Craft (three tiers, set choice via Glyph Sigil), dismantle (multi-select), refine
(star-up), with the Forge screen and animations; materials wired into campaign drops.

**Scope note.** The Armoury stays its own screen (owner's answer Q36), so the Forge is three tabs
— *Craft*, *Dismantle*, *Refine* — and the two screens link to each other. Refine's own gate is
player level 18 (`gear_refine`), above the Forge's level 8, so a fresh chronicle sees the tab
locked with its level named.

**Acceptance criteria**: recipes consume exactly the documented materials; rarity/star weights
statistically correct; refine keeps substats and re-bases the main stat; dismantle yields match.

## Phase 8 — Summoning Portal (`0.0.8`)

**Status.** ✅ shipped in 0.0.8 (2026-09-14). See `CHANGELOG.md` for what landed. Save v7 carries
the mercy counters, the pull history and the champion choices taken; the Intro milestone's Epic is
owed by the campaign's stars rather than stored, so a chronicle that mastered Intro before the
Portal existed is owed one the moment it opens.

**Goal.** Four shard types, standard portal, featured banner with deterministic rotation, pity,
exchange, the full reveal ritual (Pixi) with ×1/×10, history and rates panel.

**Scope carried from Phase 3**: Intro's all-3★ milestone chest — an Epic champion of the player's
choice (`CAMPAIGN.md` §7) — uses this phase's champion picker.

**Acceptance criteria**: 100k-roll rate test within tolerance; pity guarantees hold in tests;
rotation computed identically across reloads and time zones for the same instant; duplicates
are ordinary roster copies (rank-up food) and are never auto-converted; reveal skippable; new-champion badge.

## Phase 9 — Idle Chest (`0.0.9`)

**Status.** ✅ shipped in 0.0.9 (2026-09-15), rebalanced in 0.0.9.1. See `CHANGELOG.md` for what
landed. The chest stores one timestamp and derives everything else from it, so there is no accrual
to apply on load and a clock that jumped cannot desynchronise it (ADR-033); its rewards are priced
against a single campaign run, four owed and four by luck, because the chest is a bonus and not a
second way to play (ADR-035).

**Goal.** The accumulating chest with level-band capacities, farm-tier yields, seeded rolls,
offline computation, hub presence and claim dialog.

**Acceptance criteria**: accrual matches table to the minute; overflow capped; rolls seeded by
`lastClaimAt` (reload-safe); offline scenario tests (1 h, 26 h, clock moved back).

## Phase 10 — The Gargoyle, the daily gate (`0.0.10`)

**Status.** ✅ shipped in 0.0.10 (2026-09-15). See `CHANGELOG.md` for what landed. The period a
boss's numbers belong to is stored rather than a reset timer, so keys, damage and claims turn over
on their own and a spent period's unclaimed chests are paid as tribute on the next visit. The
enrage became the boss's own cadence, because the shared one could never have fired inside a race
(ADR-036), and placeholder art gained `art.desaturate` so the Bone Tyrant reads as bone.

**Goal.** Gargoyle with four tiers, 4-champion parties, keys, damage accumulation, threshold chests, records panel,
enrage, immunities, boss HUD and arena presentation.

**Acceptance criteria**: keys reset at 00:00 local (test with FixedClock across DST); damage
persists across two fights; chests claim once; records store team; boss rotation deterministic.

## Phase 11 — The Titan, the weekly gate (`0.0.11`)

**Status.** ✅ shipped in 0.0.11 (2026-09-16). See `CHANGELOG.md` for what landed. The phase
thresholds and the chorus's size were set by measurement rather than by the first draft's numbers
(Q41): a key takes an eighth of the pool with the escort taxing half of every hit, so the 70/35 the
design printed would have meant her last two gears never fired at all, and a chorus a tenth of its
shipped size would have died on the turn it appeared.

**Goal.** Titan with three tiers, phases, Choristers (adds with revive), weekly keys and
chests, phase-driven kit, weekly reset.

**Acceptance criteria**: phase transitions at HP thresholds; adds revive on schedule; Ally
Protection split verified; weekly reset Monday 00:00 local; six chests per tier.

## Phase 12 — Daily & Weekly Quests (`0.0.12`)

**Status.** ✅ shipped in 0.0.12 (2026-09-16). See `CHANGELOG.md` for what landed. The board is
derived from the save and the clock rather than driven by events (ADR-040), which is what makes a
rollover across a closed game land exactly once; a quest revealed by a mid-period level-up shows up
at once, and the day it completes still counts once (Q42).

**Goal.** Goal DSL evaluator, lifetime counters, ten daily and eight weekly quests, points and
chests, Quests screen, hidden-until-unlocked substitution, reset handling.

**Acceptance criteria**: every goal type has an evaluator test; 100 daily points reachable at
every unlock state; claims are idempotent; period rollover while offline handled once.

## Phase 13 — The Chronicler's Path (`0.0.13`)

**Status.** ✅ shipped in 0.0.13 (2026-09-16). See `CHANGELOG.md` for what landed. The line is
derived from the list of claimed missions rather than stored as a pointer (ADR-040 again), and
mission 2.5 asks for a rank-up rather than "a champion at 3★", which a Rare starter already is
(Q43).

**Goal.** 120 missions in 10 chapters, chapter chests, Eldric as the final reward (champion
definition exists since Phase 1 with `obtain: ['mission']`), the missions screen with Eldric's
dialogue per chapter.

**Acceptance criteria**: sequential gating; progress deltas measured from activation; state
predicates evaluated live; completing 10.12 grants Eldric exactly once; fixture save that has
completed chapters 1–6 loads and continues.

## Phase 14 — Tutorial & Onboarding (`0.0.14`)

**Status.** ✅ shipped in 0.0.14 (2026-09-16). See `CHANGELOG.md` for what landed. The overlay finds
what it points at through the `data-testid` values the screens already carry and reads what the save
and the router already say, so no screen knows the tutorial exists (ADR-042); a lesson that sends
the player somewhere points rather than cages (Q44); and the first stand's seed and the first
summon's rarity are fixed so the scripted moments always happen.

**Goal.** The interactive scripted onboarding of `TUTORIAL.md` across six chapters, spotlight
overlay, Eldric dialogue with typewriter, forced actions, deterministic first battle and first
summon, Chronicler's Provisions energy grants per chapter, resume after reload, per-chapter skip.

**Acceptance criteria**: Playwright e2e completes chapter 1 in < 6 minutes of scripted play;
every later chapter triggers on its unlock; skipping never leaves the game in a locked state;
tutorial state migrates.

## Phase 15 — Balance, Polish, Performance → EA-0.1 (`0.1.0`)

**Status.** ✅ shipped in 0.1.0 (2026-09-16). See `CHANGELOG.md` for what landed, including the four
new gates CI runs and the three faults the budget tooling found. Two acceptance criteria were met
differently than written and are recorded rather than glossed: "Lighthouse ≥ 90" is gated on
accessibility, SEO and the paint budgets instead of the performance category, which cannot describe
a permanently animating canvas (Q46); and the VPS and Vercel deploys need one real run on the
owner's infrastructure, which this container does not have (`DEPLOYMENT.md` §4.1). The owner's
improvements list was empty at the release; their first pass over the built game followed it and
shipped as `0.1.1` (see below).

**Goal.** Turn the feature-complete game into the release.

**Scope**: full `sim:balance` pass and tuning; economy sanity vs `ECONOMY.md` §7–8 using a
30-day simulated player script (including the stage energy costs, Q26); perf pass on all screens (bundle budget, atlas memory, frame
times); audio mix; copy review of every string; accessibility pass; error-panel review; save
migration test matrix (every fixture from v1–v14 → v15); deployment verified on VPS and Vercel
with the guide followed literally; `CHANGELOG.md` release notes; tag `0.1.0`.

**Acceptance criteria**: every EA-0.1 feature of the brief demonstrated in one recorded
walkthrough; zero known blocking bugs; all CI green; Lighthouse ≥ 90; the owner's "improvements"
list from the check-ins is empty or explicitly deferred to the backlog.

---

## After EA-0.1 — the fine-tuning pass

The owner asked for fine-tuning once every feature was in. It runs as patch releases off `0.1.0`,
one batch of the owner's notes at a time, each with its own `CHANGELOG.md` entry.

| Batch | Shipped | What it covered |
| --- | --- | --- |
| First | `0.1.1` | The Chronicler's Path from level 1 and taught right after the first stand; worn gear off the racks and upgradeable from its champion; the racks grouped by set under each set's crest; Q45 answered — the economy stands as measured |
| Second | `0.1.2` | The battle log inside its panel; the summoned champion centred in the gate; every champion facing the enemy, with facing moved to one table the pipeline and the content both read |

---

## After EA-0.1 — features the owner asked for

New systems asked for after the release, each shipped as a minor version: one feature, complete in
the running game, to the same Definition of Done as a phase (`AGENTS.md` §3).

| Version | Feature | What it covered |
| --- | --- | --- |
| `0.9.0` | **The Market and Daily Rewards** (`docs/design/MARKET.md`, `docs/design/LOGIN.md`) | The game's one shop, in two tabs that are deliberately nothing alike. The **Gold Market** is six random slots drawn from seventeen rows and replaced every hour — mostly everyday materials, brews and tomes, occasionally a Legendary Tome, an Ancient Shard or, once in eighty-odd hours, a Sacred Shard at 260,000 gold — which is finally somewhere for a day's surplus gold to go. The **Gem Market** never changes: nine consumables that never run out, and four bundles at ~70 % of their parts that can each be taken once. Nine items — a Brewery Token, three 24-hour ×2 boosts, two quest vouchers, a Mission Skip Token, the Champion's Chicken and the Champion's Cheatmeal — live in a **Bag** and are spent when the player decides, never on purchase. Boosts **stack in time**: three Chronicle XP Boosts is 72 hours at ×2, and each running one draws a pill with its countdown beside the profile chip on every screen. Alongside it **Daily Rewards**: thirty days of shuffled rewards with the three best at the end, one taken per day the player comes back, **no streak to lose**, and the board loops from day 1 forever. `sim:economy` gained line bands, carries the calendar as permanent income and audits every shelf entry against the one rule the Gem Market has — no entry may pay its own price back in gems. Save v19 |
| `0.8.0` | **The Dungeons** (`docs/design/DUNGEONS.md`) | Five keeps on the Game Modes menu between the campaign and the bosses, open from player level 1 — where gear comes from when a player wants a *particular* set at a *particular* star. Each keep holds its own share of the game's fourteen sets, and the share is the reason to choose it: Cindervault the four a roster is built on, the Pale Expanse the three that decide whether a debuff lands, Velkora's Cradle the crit three, Ashenreach the four that bend the turn order. Twenty stages on Normal and twenty on Hard, Hard opening per keep when that keep's Normal 20 falls; eight reward bands where stars, rarity and energy step together, so a price says what it buys. Every clear pays a piece, with a chance of a second, plus thin gold, champion and player XP, and a rare summoning shard. The fifth keep, the Gilded Veil, ships sealed until accessories exist. Party of four with its own presets, the campaign's auto-repeat tiers, and the campaign itself softened 8 % across all three difficulties with a second notch of chronicle XP. Save v18 |
| `0.7.0` | **The Brewery** (`docs/design/BREWERY.md`) | Four halls, one per element, on the Game Modes menu from player level 3 — the main source of the brews a champion levels on, and the only source at volume for an element the player's own stand does not drop. Five stages a hall, pitched at starting out, early, mid, late and endgame, each fought against the factions of that element and each paying its own number in brews. Twenty runs a day **across all four halls**, so a day is the question which element needs brews most; a run is charged before the fight and a defeat spends it. The Eclipse hall, the Waning Cellar, brews only Wednesday, Saturday and Sunday, and a barred door never costs a run. Save v16 |
| `0.6.0` | **The Glorious Palace** (`docs/design/GLORIOUS_PALACE.md`) | An account-wide skill tree: a Heart worth +1 % HP to every champion, and four 59-point branches — one per element — of small flat stats that reach every champion of that element the chronicle will ever own. 237 points in all, paid by finished content: 36 settlement boss stands, a point every fifth tower floor (again each season), one for the daily boss's pool and three for the weekly's. A mandala you drag and zoom, with every node's story on hover; the Palace's share printed in violet beside gear's green on a champion's sheet; a free reset, any time. Save v15, whose migration back-pays the stands a chronicle has already cleared |
| `0.5.0`–`0.5.1` | **The Chronicle of Changes**, and four faces | The title screen keeps a frame of everything that changes in the game, newest first, filtered by kind, and the same panel opens from Settings; every version from here on writes its own lines into it. Art for Bran, Maelis, Reva and Corvin — the four champions a new chronicle meets first |
| `0.4.2` | **A legible battle log** | Every line opens with an icon and a coloured rail, champions named in their rarity's colour and enemies in their element's, damage and healing in their own tones, buffs and debuffs carrying their icons |
| `0.4.0` | **Who, then what**, and a roster that names itself | A press picks the target and the ability spends the turn; the cooldown reaches the icon it is drawn on. The Index sorted into element and role sections, with a page that scrolls to its lore. The gear rack inside its panel, wearing each piece's rarity. Champions renamed to one word, two only for Legendary and Mythic. A fight that neither waits for a stage that never comes nor plays in slow motion on a machine that cannot keep up |
| `0.3.0` | **The Chronicle Index**, and the fight the player steers | The Index finished: four catalogues (champions found and unfound, the bestiary of all twelve factions, the gear sets, the statuses). Marking the enemy every champion attacks, in manual and in auto. Drag-to-scroll everywhere the wheel scrolls. Gear equippable from level 1; the boss cards off the hub; the ability bar's keyboard numbers and cooldowns drawn properly |
| `0.2.0` | **The Eternal Tower** (`docs/design/ETERNAL_TOWER.md`) | A hundred floors climbed in order, opened by clearing the whole Intro campaign; every tenth floor a boss floor that rolls for Ancient and Sacred Shards on the owner's own table; the Eternal Key (cap 10, one every 15 minutes, spent won or lost); gold, 1–5 energy, brews and XP per floor; ordinary floors one-time, boss floors farmable; a thirty-day season that resets the climb and keeps the best floor. Plus **Account Power** in the header — every owned champion's power summed, under the experience bar. Save v14 |

---

## Next — the owner's order of 26 September 2026

The owner read the state of the game and set the next five pieces of work, in this order. Each
ships to the same Definition of Done as a phase (`AGENTS.md` §3).

| Order | Work | Version | Status |
| --- | --- | --- | --- |
| 1 | The four bugs the audit found, and every open question settled on its recommendation | `0.9.10` | ✅ shipped in 0.9.10 |
| 2 | **The Mine** — an upgradable building that works while the chronicle is away, as in the references | `0.10.0` | ✅ shipped in 0.10.0 (`MINE.md`) |
| 3 | **Instant 3★ clears** — a stage mastered is a stage that no longer needs fighting | `0.11.0` | ✅ shipped in 0.11.0 (`CAMPAIGN.md` §10) |
| 4 | **Challenges & Achievements** — long-term goals across every system | `0.12.0` | ✅ shipped in 0.12.0 — the Hall of Deeds (`ACHIEVEMENTS.md`) |
| 5 | **The roguelite mode** — the game's deepest mode, built and polished as its flagship | `0.13.0` | ✅ shipped in 0.13.0 — the Unwritten (`UNWRITTEN.md`) |

All five are shipped. The Unwritten is the largest of them: expeditions of one to six champions
through three branching folios, fifty-four inscriptions in four inks with illumination and blends,
twenty-four relics, twenty mysteries, the Peddler, shrines, Echoes, kept wounds, sixteen Omens of
difficulty with their own twists, a sixteen-folio Scriptorium of permanent upgrades, the Tale of
every expedition, a weekly Tithe of Skill Tomes, a ninth ledger in the Hall of Deeds, and a
headless simulator that holds its difficulty curve to bands in the gate. Save v22.

## Next — the owner's second order of 26 September 2026

Three pieces, in this order; the third starts only after the first two ship.

| Order | Work | Version | Status |
| --- | --- | --- | --- |
| 1 | **The title screen reworked** like every other screen, with the Chronicle of Changes kept open on it | `0.13.1` | ✅ shipped in 0.13.1 (`UI_DESIGN.md` §5.1) |
| 2 | **The Chronicle of Changes rewritten** — plain patch notes, nothing said twice, no lore | `0.13.1` | ✅ shipped in 0.13.1 (`CONTENT_AUTHORING.md` §13) |
| 3 | **The Electron build** — a `production` branch and a phased plan to a Windows desktop game | — | 📝 planned: `production` created, phases D0–D6 in `docs/tech/ELECTRON.md`; D1 waits on the owner's go |

## The Windows desktop build — on `production`

Planned in `docs/tech/ELECTRON.md`. Each phase ships to the Definition of Done as a desktop build on
`production`; no Electron code is written before the owner's go.

| Phase | Deliverable | Status |
| --- | --- | --- |
| D0 | The `production` branch and the plan | ✅ done |
| D1 | The game in its own window — the Electron shell, secure by default | ⏳ waits on the owner's go |
| D2 | Display and window — windowed / fullscreen, remembered, Quit | ⏳ |
| D3 | Saves on disk — files, backups, native dialogs, web-save import | ⏳ |
| D4 | The Windows build — installer, Steam folder, icon, CI | ⏳ |
| D5 | Steam — achievements from the Hall of Deeds, overlay, cloud, presence | ⏳ needs the App ID (Q65) |
| D6 | Release readiness — hardware QA, updates outside Steam, first public build | ⏳ |

---

## Backlog (after EA-0.1 — not scheduled)

| Item | Notes |
| --- | --- |
| ~~Electron wrapper & Steam release~~ | planned as phases D1–D6 on `production` (`docs/tech/ELECTRON.md`) |
| More champions & models | replace placeholders first; new Legendaries/Mythics; faction models |
| Accessories (ring, amulet, banner) | three more gear slots as in the references |
| Awakening / Ascension | post-6★ growth track |
| Dungeon variants for materials | the five keeps ship in `0.8.0` and pay gear; a potion/tome keep would be a sixth |
| Events & limited banners | timed content with deterministic schedule |
| Achievements & titles expansion | the Hall of Deeds shipped in `0.12.0` (`ACHIEVEMENTS.md`); mirroring its deeds as Steam achievements is desktop phase D5 (`ELECTRON.md`) |
| ~~Skip tickets / instant battle~~ | shipped as instant clears in `0.11.0` (`CAMPAIGN.md` §10): the energy is the ticket |
| Multiple save slots, cloud-free sync via export | slots in UI |
| Localization (German first) | i18n keys already in place |
| Controller support | Steam Deck friendliness |
| Content packs (mod support) | JSON export of the content registry |
| Champion vaults, team presets expansion | QoL |
