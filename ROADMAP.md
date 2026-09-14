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
| 6 | Gear | 0.0.6 | ⬜ |
| 7 | The Forge — Crafting | 0.0.7 | ⬜ |
| 8 | Summoning Portal | 0.0.8 | ⬜ |
| 9 | Idle Chest | 0.0.9 | ⬜ |
| 10 | Daily Boss | 0.0.10 | ⬜ |
| 11 | Weekly Boss | 0.0.11 | ⬜ |
| 12 | Daily & Weekly Quests | 0.0.12 | ⬜ |
| 13 | The Chronicler's Path (missions) | 0.0.13 | ⬜ |
| 14 | Tutorial & Onboarding | 0.0.14 | ⬜ |
| 15 | Balance, Polish, Performance → **EA-0.1** | **0.1.0** | ⬜ |

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

**Goal.** Gear items with rarity/stars/level/main/sub stats and 14 sets; drops from campaign;
equip/unequip with compare; upgrade to +16; inventory management; set bonuses active in battle.

**Scope**: gear generator (drop and craft share it), stat tables, level-up rolls, set bonus
passives in the engine, inventory slice and screen, champion Gear tab, compare panel, lock, sort/
filter, capacity rules; campaign drop integration; power recomputation.

**Acceptance criteria**: 10k generated pieces respect tables; set bonuses verified in battle
tests (e.g. Retaliation counters ~30 %); equip/unequip persists; capacity overflow handled.

## Phase 7 — The Forge: Crafting (`0.0.7`)

**Goal.** Craft (three tiers, set choice via Glyph Sigil), dismantle (multi-select), refine
(star-up), with the Forge screen and animations; materials wired into campaign drops.

**Acceptance criteria**: recipes consume exactly the documented materials; rarity/star weights
statistically correct; refine keeps substats and re-bases the main stat; dismantle yields match.

## Phase 8 — Summoning Portal (`0.0.8`)

**Goal.** Four shard types, standard portal, featured banner with deterministic rotation, pity,
exchange, the full reveal ritual (Pixi) with ×1/×10, history and rates panel.

**Scope carried from Phase 3**: Intro's all-3★ milestone chest — an Epic champion of the player's
choice (`CAMPAIGN.md` §7) — uses this phase's champion picker.

**Acceptance criteria**: 100k-roll rate test within tolerance; pity guarantees hold in tests;
rotation computed identically across reloads and time zones for the same instant; duplicates
are ordinary roster copies (rank-up food) and are never auto-converted; reveal skippable; new-champion badge.

## Phase 9 — Idle Chest (`0.0.9`)

**Goal.** The accumulating chest with level-band capacities, farm-tier yields, seeded rolls,
offline computation, hub presence and claim dialog.

**Acceptance criteria**: accrual matches table to the minute; overflow capped; rolls seeded by
`lastClaimAt` (reload-safe); offline scenario tests (1 h, 26 h, clock moved back).

## Phase 10 — Daily Boss (`0.0.10`)

**Goal.** Gravemaw with four tiers, 4-champion parties, keys, damage accumulation, threshold chests, records panel,
enrage, immunities, boss HUD and arena presentation.

**Acceptance criteria**: keys reset at 00:00 local (test with FixedClock across DST); damage
persists across two fights; chests claim once; records store team; boss rotation deterministic.

## Phase 11 — Weekly Boss (`0.0.11`)

**Goal.** Nyxara with three tiers, phases, Choristers (adds with revive), weekly keys and
chests, phase-driven kit, weekly reset.

**Acceptance criteria**: phase transitions at HP thresholds; adds revive on schedule; Ally
Protection split verified; weekly reset Monday 00:00 local; six chests per tier.

## Phase 12 — Daily & Weekly Quests (`0.0.12`)

**Goal.** Goal DSL evaluator, lifetime counters, ten daily and eight weekly quests, points and
chests, Quests screen, hidden-until-unlocked substitution, reset handling.

**Acceptance criteria**: every goal type has an evaluator test; 100 daily points reachable at
every unlock state; claims are idempotent; period rollover while offline handled once.

## Phase 13 — The Chronicler's Path (`0.0.13`)

**Goal.** 120 missions in 10 chapters, chapter chests, Eldric as the final reward (champion
definition exists since Phase 1 with `obtain: ['mission']`), the missions screen with Eldric's
dialogue per chapter.

**Acceptance criteria**: sequential gating; progress deltas measured from activation; state
predicates evaluated live; completing 10.12 grants Eldric exactly once; fixture save that has
completed chapters 1–6 loads and continues.

## Phase 14 — Tutorial & Onboarding (`0.0.14`)

**Goal.** The interactive scripted onboarding of `TUTORIAL.md` across six chapters, spotlight
overlay, Eldric dialogue with typewriter, forced actions, deterministic first battle and first
summon, Chronicler's Provisions energy grants per chapter, resume after reload, per-chapter skip.

**Acceptance criteria**: Playwright e2e completes chapter 1 in < 6 minutes of scripted play;
every later chapter triggers on its unlock; skipping never leaves the game in a locked state;
tutorial state migrates.

## Phase 15 — Balance, Polish, Performance → EA-0.1 (`0.1.0`)

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

## Backlog (after EA-0.1 — not scheduled)

| Item | Notes |
| --- | --- |
| Electron wrapper & Steam release | `platform/` adapters, Steamworks achievements, installer, store assets |
| Market / Shop | gold & gem offers, daily rotating stock (`bg4` backdrop is reserved) |
| More champions & models | replace placeholders first; new Legendaries/Mythics; faction models |
| Accessories (ring, amulet, banner) | three more gear slots as in the references |
| Awakening / Ascension | post-6★ growth track |
| Dungeons (material-focused stages) | potions/tomes dungeons with waves and bosses |
| Events & limited banners | timed content with deterministic schedule |
| Achievements & titles expansion | Steam-compatible |
| Skip tickets / instant battle | after ×4 speed |
| Multiple save slots, cloud-free sync via export | slots in UI |
| Localization (German first) | i18n keys already in place |
| Controller support | Steam Deck friendliness |
| Content packs (mod support) | JSON export of the content registry |
| Champion vaults, team presets expansion | QoL |
