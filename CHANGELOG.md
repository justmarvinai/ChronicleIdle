# Changelog

All notable changes to ChronicleIdle are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow `CLAUDE.md` §9.3
(`0.0.<phase>` during development, `0.1.0` = Early Access 0.1).

## [Unreleased]

_Phase 6 (Gear) starts after the owner's Phase 5 check-in._

## [0.0.5] — 2026-09-14 — Phase 5: The Tavern

### Added

- **The Tavern, with its three tracks.** Upgrade Level pours brews and retires companions into
  one champion's XP bar; Upgrade Rank spends `n` copies of `n★` and the gold from the table to
  light one more star; Upgrade Skills spends one tome of the champion's rarity per step. The
  rules are pure functions in `@engine/progression/tavern-*`, so the preview, the press and the
  tests all read the same numbers (`ECONOMY.md` §3).
- **Every safety rule lives in the engine.** A locked or favourite champion is never eligible, a
  champion can never eat itself, rank-up food must be the exact star tier and the exact count, a
  rarity's star ceiling holds, and an ability stops at its last step. A refusal spends nothing:
  the wallet is checked before anything is written, so a half-paid upgrade cannot exist.
- **The food finder.** Auto-fill seats the companions the chronicle loses least by — lowest
  rarity, then lowest level, then longest held — and the Tavern asks before retiring anyone Rare
  or better, or anyone who has been levelled.
- **The Tavern screen** (`UI_DESIGN.md` §5.5): the roster rail picks who is drinking, six seats
  flank the champion (the rank track shows exactly as many as it needs), a brew row pours by the
  glass, and the right column runs the three tracks with a live cost pill. The level preview
  names the level the offering reaches and warns when XP would spill past the star tier's cap.
  Levelling flashes with its stinger; a new star bursts gold.
- **Skill upgrades reach the battlefield.** The steps were already folded into abilities by
  `effectiveAbility` (Phase 1) and read by the battle engine (Phase 2); the Tavern is what buys
  them, so a sharpened ability changes its description text and its damage in the same press.

### Changed

- The Champions screen's Tavern button opens the Tavern with that champion already on the stool,
  instead of the "not yet written" gate.
- Champions eaten at the Tavern leave every team preset and "last used" they stood on, and the
  session stops pointing at them.
- `USER_QUESTIONS.md` §1 is empty: Q28–Q35 were answered "as recommended", so the eight defaults
  that were already shipping are now decisions.

### Fixed

- **Reduced motion now stops Framer's animations too.** A token rule has stopped CSS keyframes
  since 0.0.3, but Framer Motion animates in JavaScript and never saw the setting; the app is
  wrapped in a `MotionConfig` that follows the chronicle's setting (and the OS preference before a
  chronicle exists), so screen transitions, the level-up numeral and the Tavern's flares hold
  still when they are asked to.

## [0.0.4] — 2026-09-14 — Phase 4: Player Level & Profile

### Added

- **The level-up moment.** Every level a chronicle crosses pays `level × 200` gold, 50 gems on
  every fifth level, an Ancient Shard on every tenth and a Sacred Shard at 20/40/60/80/100, and
  tops the energy up by the **new** cap on top of whatever was left — the overflow is deliberate
  (owner's answer Q15). The numbers live in `src/content/balance/levels.ts`; `levelUpRewards`
  merges a whole run of levels into one payout, so a batch that crosses five levels pays and
  celebrates once.
- **The level-up dialog.** An ember burst behind the level reached ("Level 1 → 7" after a batch),
  what it paid, every feature it opened with a one-line hint, and any title it earned; spring-in
  numeral and `stinger.levelup`. It never interrupts a fight: levels gained mid-battle queue in
  `ui.levelUp` and celebrate on the screen that follows (`UI_DESIGN.md` §5.17a).
- **Titles.** Eleven titles in `src/content/titles/`, from *Chronicler* at level 1 to *Loremaster*
  at 100, with *Warden of Veyrath* for three stars on every stand of Hard. Which ones are earned
  is **derived** from level, campaign progress and roster size on every read (CLAUDE.md §5.5), so
  they can never disagree with the play; the only stored part is the single title the chronicle
  wears. The picker lists every title — earned in gold, locked dimmed with what they ask for.
- **The profile, filled in.** Identity header (avatar, name, worn title, level and XP bar) over a
  scrolling body: the standing grid (energy cap, stands cleared, champions owned, strongest
  champion, battles, victories, chronicle begun, time played), stars per difficulty, titles
  earned, and the next three level gates with what each opens. The top-bar chip carries the worn
  title and flares on a level-up (skipped under `prefers-reduced-motion`).
- **All-3★ milestone chests** (`CAMPAIGN.md` §7, carried from Phase 3): Normal pays 300 Gems and
  2 Sacred Shards, Hard pays 1,000 Gems, a Primordial Shard and the title *Warden of Veyrath*.
  The chest pays once, on the run that puts the last third star on the difficulty. Intro's chest
  (an Epic champion of the player's choice) waits for the Summoning Portal's picker in Phase 8,
  so `MILESTONE_CHESTS.intro` is `null`.
- **`actions.grantPlayerXp`** — the one door chronicle XP comes through. Campaign runs already
  used it; bosses, quests and missions will hand their XP to the same function, which fills the
  bar, pays every level crossed, queues the celebration and reports the titles it earned.

### Changed

- **Save v5.** `profile.titles` (a stored list) becomes `profile.title` (the one worn, or none);
  earned titles are derived. Migration 4→5 drops the list, and `tests/fixtures/saves/v4.json`
  freezes a Phase 3 chronicle — roster, campaign stars, best turns, wallet and all — as the
  regression fixture for it.
- **The result screen no longer plays the level-up stinger for the chronicle** — the dialog that
  follows it does. A champion levelling still gets its cue there.
- The avatar and title pickers return to the profile dialog they were opened from instead of
  dropping the player back to the game.

### Fixed

- **The asset build is reproducible again.** libvorbis stamps every stream with a random serial
  number, so encoding the same synthesised PCM twice produced different bytes — which changed 110
  audio entries' content hashes, and with them `MANIFEST_VERSION`, on *every* build. CI's
  `git diff --exit-code` on the typed manifest had failed on `main` since 0.0.2 because of it.
  `normaliseOgg` now rewrites each page with a fixed serial and the CRC that follows from it, so
  two forced builds of the same sources agree byte for byte.
- **The e2e console gate ignores Chromium's preload advisories.** With the manifest check fixed,
  the suite ran on CI for the first time in three phases and tripped on two browser hints about
  the first-paint preloads (`vite.config.ts` `preloadBootImages`): once the service worker controls
  the page it serves those images itself, and a slow runner boots past the "used within a few
  seconds" window. The hint still warms the cache on a first visit, so the warnings join the
  WebGL driver chatter in `tests/e2e/helpers.ts`.

### Balance

- `LEVEL_ENERGY_REFILL` (on) documents and controls the refill: with it, an auto-repeat batch that
  levels the chronicle keeps running well past the energy it started with — intended, and recorded
  as Q35 with the one-line switch if it should stop instead.

## [0.0.3] — 2026-09-13 — Phase 3: Campaign

### Added

- **Twelve faction rosters (84 enemies).** Every settlement fields its own faction: six
  rank-and-file units re-skinning the shared archetype kits (`ab.arch.<archetype>.<key>`, so a
  faction file is names, element and tint — never a copy of a kit) plus one named stage boss with
  its own kit, rotation, immunities and enrage (`CAMPAIGN.md` §5–§6).
- **Twelve settlements, 120 stages.** Each settlement is authored once — faction, dominant element,
  backdrop, colour grade, surface, gear-set pool and ten wave lines — and `defineSettlement`
  derives the wave shape from the design table (`CAMPAIGN.md` §4), leading the boss stage's last
  wave with the faction's boss. Stage ids are `stage.<settlement>.<stage>`.
- **Campaign balance tunables** in `src/content/balance/campaign.ts`: energy per band and
  difficulty, star and defeat turn limits, star-chest thresholds, plate levels, gold/XP/drop/shard
  /brew rates, material ranges, first-clear and star-chest bundles, auto-repeat tiers
  (`CAMPAIGN.md` §2, §3, §7, §9).
- **Stage encounters are derived, not stored.** `stageEncounter(settlement, stage, difficulty)`
  builds the encounter for any of the 360 stage/difficulty pairs — scaling index, plate level,
  limits, backdrop and music included — and the registry resolves and memoises them by id
  (`encounter.stage.<nn>.<nn>.<difficulty>`), so a save only remembers a stage and a difficulty.
- **Campaign content validation.** Settlements, stages and factions are Zod-validated with their
  cross-references: ids carry their index, stage waves may only field their own faction, the boss
  leads only the boss stage's last wave, every faction fields all six archetypes and every
  authored enemy is fightable somewhere.
- **`pnpm sim:balance`** — the campaign's difficulty-curve report. It runs every stage on every
  difficulty with the reference teams in `tools/sim/teams.ts` (the roster a new chronicle is given
  at level 10 and at its star caps, a mid-Epic roster, and an endgame roster whose rank-up and gear
  are modelled until Phases 5–6 ship them), prints win and three-star rates per settlement, and
  checks the bands declared beside those teams. `--strict` fails CI when a band breaks; `--scan`
  prints the enemy scale each team can take, which is the table a tuning pass fits the constants
  to. CI now runs the band check.
- **The campaign engine** (`src/engine/campaign/`): energy per run and per band, the unlock chain
  (stage → settlement → difficulty, and ×3/×4 battle speed), star evaluation, seeded reward rolls
  and the run itself. Progress stores only what was played — stars and best turns per stage and
  difficulty — and everything else is derived from it, so a save can never disagree with its own
  progress: which stage is open, which chest was granted, where the player is next.
- **`ai.prefer` on abilities**: an ability can name who it goes for (`lowest_hp`,
  `lowest_hp_percent`, `highest_atk`, `lowest_def`) instead of taking its side's default. The
  Marksman archetype uses it to pick off the champion closest to death.
- **Save v4** carries campaign progress (stars and best turns per stage and difficulty, the stage
  the screens reopen on, and the auto-repeat count) with a migration from v3 and a frozen `v3.json`
  fixture. Runs go through the store: `startCampaignRun` charges the energy *before* the battle, so
  a reload mid-fight cannot yield a free run, and `finishCampaignRun` records the stars and pays
  the gold, materials, shards, brews, gems, energy and XP in one write.
- **Champions and the player now level from battle XP** (`ECONOMY.md` §3.1, §4): a win's XP fills
  the bar and levels while it can, stopping at the star tier's cap and reporting the overflow. The
  level-up moment — the energy refill, the rewards and the celebration — is still Phase 4's.
- `UnitReport.died` records that a champion went down even if it was revived, which is what the
  campaign's second star asks about.
- **The campaign is playable end to end.** The Game Modes card carries the stand you are on and
  opens the **campaign map** — twelve settlement banners with their stars, the difficulty
  selector and its gate, and the star-chest track. A settlement's screen lists its ten stands with
  stars, best turns, enemy chips, the star and defeat limits and a **Battle · ⚡cost** button, over
  a panel of what the place drops. Battle setup shows the stand's three-star conditions, the
  auto-repeat selector with how many runs the energy pays for, and what the run costs; the result
  screen shows the stars, a "New record" badge, every coin and material the run paid, first-clear
  and star-chest lines, the level-ups, and a **Next stand** button that walks straight into the
  stand the clear unlocked.
- **Auto-repeat** runs a stand up to fifty times in a row: a compact HUD counts the runs and the
  gold so far with a Stop button, and the batch ends on a defeat, on Stop, or when the energy runs
  out — the result screen then summarises the whole batch.
- The Chronicle Debug panel can set the chronicle level and clear a whole difficulty, which is how
  the unlock chain and the ×3/×4 speed gates are verified.

### Changed
- **Enemy scaling retuned (`BATTLE.md` §4.5, `CAMPAIGN.md` §5).** The old ladder was unwinnable:
  the linear `1 + 0.055 × g` term reached ×7.5 by the last stage and ×49 with Hard's multiplier,
  while a Phase-3 roster can only grow about ×3, so the campaign was lost from settlement 1
  stage 4 onwards at every champion level. The stage term is now quadratic —
  `1 + (STAGE_GROWTH_TOP − 1) × (g / 119)²`, ×1.00 → ×4.80 — which is nearly flat across the first
  settlements (where only levelling is available) and steep at the end; the difficulty step is now
  what the same stage costs per difficulty (×1 / ×2.5 / ×6); and the archetype and boss bases are
  65 % of their Phase 2 values. Measured result: a new save's roster at level 10 clears Intro
  settlements 1–4, grinds 5–6 and stalls at 7–8; a mid-Epic roster clears Intro and stalls in
  Normal's second half; the modelled endgame roster clears Hard, with three stars on its last
  settlement a real fight.
- The perf bench fights at ×5 enemy stats (was ×1.5) so it still runs 35–45 turns after the
  retune. On this GPU-less build environment it reports p50 216.6 ms / p95 233.4 ms over 97 frames
  of a 25.9 s fight — SwiftShader numbers, which say nothing about the 16 ms budget either way
  (USER_QUESTIONS.md Q30 still awaits a run on the owner's laptop).
- Battle speed is capped by campaign progress everywhere it can be chosen (the in-battle cycle
  button, the settings dropdown and every launch), so ×3 appears with Normal complete and ×4 with
  Hard instead of being hard-capped at ×2.
- `CONTENT_AUTHORING.md` §3–§4 now describe factions, derived stage encounters and settlements as
  they are actually authored, and its balance table names `campaign.ts` (the file the phase added)
  instead of the `drops.ts`/`enemies.ts` the plan had guessed at.

### Fixed
- `prefers-reduced-motion` now also stops CSS keyframes (entry rises, shimmers), not just
  transitions; the battle itself is Pixi and keeps its animation.

### Not yet
- The all-3★ **milestone chest** of `CAMPAIGN.md` §7 is not granted: Intro's reward is an Epic
  champion of the player's choice (which needs the Summoning Portal's picker, Phase 8) and
  Normal's and Hard's carry a title (Phase 4). Both are noted in those phases' scope in
  `ROADMAP.md`; everything else in the reward table pays out.

### Removed
- The three Training Grounds encounters and the seven Remnant enemies they fielded: the campaign
  replaces them, and the battle tests now fight Thornwood Crossing on Intro.
- The settlement-1 onboarding multiplier: with the retuned bases the opening stages need no
  special case.

## [0.0.2.1] — 2026-09-13 — UI pass

### Fixed
- **Panel textures now reach their frames.** Every kit surface drew the frame as the element's own
  `border-image` and the fill as a positioned child: a child always paints above its parent's
  border, so the fill could never reach under the ring and each panel, dialog, slot, pill, tooltip
  and toast showed a ring of backdrop between frame and texture (worst on the arch panel, whose
  top band is a real arch with a part-transparent ring). Frame and fill are now sibling layers
  (`KitSurface`), the fill bleeds under the ring up to each frame's measured transparent corner
  (`KIT_CORNER`, from an alpha scan of the textures), and the frame hides its edge.
- **Bars read as carved tracks again.** The groove was inset inside the track's own border, so at
  16–24 px it collapsed to a 4 px hairline: unit-plate HP, the profile XP chip and the locked-gate
  progress bar looked empty and their labels were unreadable. The groove is now the track's padding
  box, the stone and ember tracks are used at 40 px and up (where their carved rim fits) with a
  hairline frame in the same materials below that, labels and values are dropped below 20 px, and
  numbers are tabular gold on a hard shadow.
- **The gear tab.** A scrollbar thumb the full height of the panel (a few px of rounding counted as
  overflow) read as a bare orange line; the thumb now needs real overflow, is capped so it always
  reads as a handle, and sits in a carved channel with grip ridges. The six slots are labelled and
  the locked notice is a framed note.
- **Unit plates no longer collide.** Fixed 250 px plates overlapped at the 130–170 px enemy slot
  spacing and truncated each other's names; plates shrink to their content and the acting or
  targeted plate layers on top.
- The Training Grounds list dropped the Warlord drill when it was filtered to `kind: 'training'`
  (that encounter is boss-kind); it lists everything but the perf bench, with a content test.

### Changed
- Settings sliders are the kit's carved stone channel with an ember level, a glass highlight and a
  gold orb knob in the round kit frame, driven by a transparent range input so keyboard and drag
  stay native. The toggle track gained the gold hairline and its knob a grip.
- Screen sections that were flat scrims (the champions rail, the battle-setup team, enemy and
  roster columns, the battle ability bar) are one shared textured slab in the kit's materials
  (`surfaceStone`), so they read as carved chrome rather than web boxes.
- Pixel dividers are drawn as two mirrored halves: the art is a half ornament (lines running off
  one edge, the motif at the other), which rendered as a lopsided line with a stray tick.
- The "art pending" mark only appears on cards 128 px and up; on team slots and pickers it was
  clipped to a fragment ("…inding") and the placeholder tint already carries the meaning.
- The starter screen's bind button names the champion in full ("Bind Ser Corvin", not "Bind Ser").
- Gear and team slots are layered surfaces too: their recess texture reached only the ring's inner
  edge, so the panel behind showed through each frame's ornate corners. The locked marker is a
  badge inside the recess instead of a scribble across the frame's bracket, and the gear tab's
  slots and notice sit centred in the panel rather than above a long empty tail.
- Pixel dividers draw the ornament half first and the mirror second; reversed, the two motifs sat
  at the ends and the bare lines met in the middle, which read as a plain rectangle.
- `Panel` and `KitFrame` take `contentClassName` (layout for the content box) and a numeric
  `padding` measured from inside the frame's ring.

## [0.0.2] — 2026-09-13 — Phase 2: Battle System

### Added
- **Deterministic battle engine** (`src/engine/battle`). `createBattle` / `step` / `runAuto` /
  `replay` / `snapshot` / `retreat`: a whole fight is a pure function of the encounter, the party,
  the seed and the player's decisions (only manual decisions are logged; AI choices re-derive).
  Turn meter with closed-form ticks and seeded tie-breaks, element wheel, crit, mitigation with
  the per-level constant, ±5 % variance, all 26 statuses (stacks, refresh, immunity, block,
  cleanse/strip/steal, shields as % of caster HP, ally protection, counterattack, provoke, fear,
  freeze, sleep, stun, revive-on-death, DoTs and regen ticking at turn start), the full effect DSL
  (`damage`, `heal`, `apply_status`, `remove_status`, `tm`, `revive`, `extra_turn`, `detonate`,
  `leech`, conditionals), passives and auras, boss rotations and enrage, wave transitions, turn
  limits, timeout/retreat outcomes and a per-battle report (damage dealt/taken, healing, kills).
  The auto policy follows `docs/design/BATTLE.md` §7 (heal-skip above 90 % team HP, revive only
  with dead allies, TM rules, wave-start buff bonus, threat-weighted enemy targeting).
  71 engine tests cover every formula, effect and status; the same seed and decisions replay to an
  identical event log, and 1,000 random auto battles run headless in well under 10 s.
- **Enemy archetypes and the Training Grounds.** `defineEnemy` (the enemy twin of
  `defineChampion`) with seven Remnant archetypes (raider, marksman, brute, warden, hexer, mender
  and the Warlord boss), encounter definitions with waves, scaling, turn limits, backdrop, music
  and footstep surface, status metadata (`src/content/statuses`), Zod schemas and cross-reference
  validation (ids, i18n, backdrops, party sizes per kind). Three encounters on Game Modes →
  *Training Grounds* until the Campaign replaces them in Phase 3: two 3-champion fights and a
  4-champion Warlord fight with the boss bar.
- **Battle controller and presented view** (`src/state/battle`). Owns the live simulation, drives
  `step` with back-pressure from the presenter, holds the fight until the stage presenter attaches
  (`awaitPresenter`) so no turn resolves off-screen, folds every played event into the HUD's view
  (`applyEventToView`, a 400-event log for the Info panel), handles manual ↔ auto switches, pause,
  speed and retreat, and hands the outcome to the game store (`recordBattle`).
- **Pixi battle stage** (`src/render/battle`). 1920 × 1080 stage shared with the React HUD,
  ¾-perspective slots for four allies and four enemies, backdrop grading, ambient embers, idle
  model loops with placeholder tints, synthesised choreography (anticipation, lunge with speed
  lines, cast raise, projectile flight, hit-stop, shake, flash, dissolve, revive, wave slide-in,
  camera push), the FX library (`fx/registry.ts`: element casts, projectiles and hits, physical
  slashes with sparks, crits, heals, buffs, debuffs, shields, cleanses, DoT ticks, death smoke,
  turn-meter rune rings, ultimate bursts), floating numbers (damage, crit, heal, shield, status)
  and A4 cut-ins.
- **Generated VFX** (`tools/vfx`). Procedural flipbooks painted deterministically by recipes and
  rendered at build time through the asset pipeline as `fx.gen.*` strips with the same manifest
  shape as the owner's packs: slash arc, sparks, rune ring, smoke, speed lines. Tested for
  determinism and coverage.
- **Battle screens.** Training Grounds (encounter cards with waves, elements, clears), Battle
  setup (team slots with leader and aura, team power, three presets per mode with save/load,
  waves preview, control switch, free start), Battle HUD (unit plates with HP/shield/TM and status
  rows, target reticle, wave/turn/time counters, boss bar with statuses, turn banner, ability bar
  with cooldown pips and passive tag, Info panel with the battle log, Auto and ×1/×2 speed
  buttons, pause menu with resume/settings/retreat), Battle result (victory/defeat/time's up/
  retreat, turns, waves, per-champion report, hints, seed, Replay/Team/Emberhold). Hotkeys:
  1–4 abilities, Tab target, Space/Enter confirm, A auto, +/− speed, I info, Esc pause.
- **Team presets, save v3.** `teams.campaign` / `teams.boss` with three presets and the last team
  per party size; migration 2→3 and the frozen Phase 1 save `tests/fixtures/saves/v2.json`.
  Settings gained `battleSpeed` and `autoBattle`.
- **Battle audio.** Sound keys for battle start, melee/ranged attacks, light/heavy/crit hits,
  blocks, element casts, heal, buff, debuff, death, revive, wave, ultimate, victory and defeat,
  mapped to the owner's packs plus generated victory/defeat stingers; the music state switches
  to `battle` / `boss`.
- **Perf bench.** `/?screen=perf` (code-split, never linked from the game, like the DevKit)
  fights the Stress Bench encounter (4 v 4, two waves, ×4, four maxed legendaries) on the real
  battle screen and reports p50/p95/max frame times; `pnpm perf:battle` drives it headlessly
  (`--strict` fails over the 16 ms budget, `--software` forces SwiftShader).
- **E2E.** `tests/e2e/battle.spec.ts`: manual battle with mouse and keyboard, Info log, pause,
  speed and auto to a victory; auto beats Training Grounds 1 and 2 with the starting roster;
  retreat; presets.

### Changed
- `Bar` draws a hairline stone frame below 24 px so plate and chip bars keep a visible fill.
- The game window and stage use `overflow: clip`: a focus or scroll-into-view on a partly hidden
  element can no longer scroll the whole game out of place.
- Game Modes lists four cards (Training Grounds first); the navigation e2e counts four.
- The engine's `wave.started` event carries the spawned units' views so the HUD and the stage can
  add them without reaching into the simulation.

### Fixed
- Auto battles started before the stage had mounted resolved instantly through the instant
  presenter; the screen then opened on a finished fight. The controller now waits for the stage.
- Enemies of the second and later waves were missing from the HUD and the stage.
- Unit plates and the profile XP bar rendered empty at 16 px (the stone track's frame swallowed
  the fill).
- Heals for 0 HP no longer produce events ("heals X for 0").

### Balance
- Training Grounds enemies fight at 85 % of the archetype base (`statMult`). Headless win rates
  at level 1 on auto over 30 seeds, per starting roster (starter + Wenna + Gil, plus Bran in the
  Warlord fight): Sparring Ground 28–30/30, Remnant Ambush 29–30/30, The Warlord's Pit 30/30 for
  Ser Corvin and Reva, 19/30 for Sister Maelis.
- `src/content/balance/battle.ts` gained the turn-meter, mitigation, variance, status value,
  DoT, counter, revive, freeze, fear, turn-limit, difficulty, stage-growth, boss and AI
  constants of `docs/design/BATTLE.md` §11.

### Performance
- `pnpm perf:battle --software` in the GPU-less build environment (SwiftShader, 1920 × 1080,
  Stress Bench 4 v 4 × 2 waves at ×4, four maxed legendaries, 31.7 s fight, victory):

  | p50 | p95 | max | frames | budget (p95) |
  | --- | --- | --- | --- | --- |
  | 350.0 ms | 366.7 ms | 366.8 ms | 72 | over 16 ms (software renderer) |

  Software WebGL renders the stage at roughly three frames per second, so this run only proves the
  bench pipeline; the 16 ms p95 budget is signed off on the owner's iGPU laptop with
  `pnpm build && pnpm preview` then `pnpm perf:battle` (`USER_QUESTIONS.md` Q30).
- The stage records unclamped frame times (`ticker.elapsedMS`); React commits nothing per frame
  during a fight — the HUD updates only when the presenter lands an event.
- `tests/e2e`: 28 specs (Phase 0–2); the battle fights get a 480 s budget and the auto fights
  run at ×2 because CI runners render with software WebGL.

## [0.0.1] — 2026-09-12 — Phase 1: Champions & Collection

### Added
- **The roster as content.** All 23 EA-0.1 champions (`docs/design/CHAMPIONS.md` §4) live in
  `src/content/champions/<id>.ts`, authored with the effect DSL builders (`hit`, `status`,
  `heal`, `cleanse`, `strip`, `tm`, `revive`, `extraTurn`, `leech`, `when`, `up.*`) and typed by
  `defineChampion`: stats at 6★/60, art keys, obtain sources, abilities with cooldowns, upgrade
  ladders and AI hints, passives, auras and lore. Seven champions use their finished models; the
  other sixteen borrow the lizard model with a per-champion multiply tint and an "art pending"
  mark on every card and portrait (`CLAUDE.md` §2.7). English names, lore and ability text in
  `src/i18n/en/champions.ts`.
- **Content validation for champions.** Zod schemas for champions, abilities and every effect;
  `pnpm content:validate` (and the content test) now also checks ability counts per rarity, slot
  order, A1 cooldown 0, upgrade limits, passive/aura presence, starter obtain sources, asset and
  i18n references, description placeholders and stat deviation from the role template (warning;
  Varkos' HP is the one documented outlier).
- **Champion engine** (`src/engine/champions`). `statAt`/`baseStats`/`power` (star multiplier ×
  level factor, `docs/design/CHAMPIONS.md` §2), level caps and XP curve, champion instance model
  with stable `<def>-<n>` ids, roster reducers (add, lock, favourite, seed the starting roster,
  generate a seeded roster), live ability numbers (`abilityNumbers`, `passiveNumbers`,
  `effectiveAbility` fold skill-tome upgrades into damage, chance, duration, shield, turn meter
  and cooldown), and pure roster sorting/filtering (`sortAndFilter`: rank, level, power, element,
  recent, name; favourites first) with a 240-instance perf test.
- **Save schema v2.** `roster`, `counters.instances` and `profile.avatarChampionId`; migration
  1→2 drops the Phase 0 `avatarKey`; the frozen Phase 0 save `tests/fixtures/saves/v1.json`
  migrates without data loss (unit test) and `tests/fixtures/saves/roster-204.chronicle`
  (generated by `tools/fixtures/roster-chronicle.ts`) round-trips a 204-champion roster through
  import.
- **Starter choice.** New Chronicle now opens the binding screen: the three Rares (Sister Maelis,
  Ser Corvin, Reva Ashblade) with stats, kit text and passive; binding one plays the new-chronicle
  stinger, seeds the roster with the starter plus Bran, Wenna and Gil, sets the profile avatar
  and opens Emberhold. Continue/import go straight to the hub once a roster exists.
- **Champions index** (hub hotspot and bottom button). Virtualised 4-column card grid with the
  stone scrollbar (200+ champions render ~40 cards), sort dropdown with direction toggle, element,
  role, rarity, locked and favourite filter chips, live "shown of total" count, empty state.
- **Champion detail.** Rarity-framed portrait with the idle sprite loop, nameplate with element,
  role, rarity, stars and level; Info tab (power, XP bar, eight base stats with the gear-bonus
  column reserved for Phase 6), Abilities tab (icons, cooldowns, descriptions with live numbers,
  upgrade pips, passive and aura), Lore tab (obtain sources, copies owned, acquisition date), Gear
  tab (six locked slots until Phase 6); Lock, Favourite and Tavern (locked) actions.
- **Profile avatar.** Any owned champion (or the Chronicler) can be chosen from the profile
  dialog; the top-bar chip follows.
- **Chronicle Debug** (development builds only, `Ctrl+Shift+D`): grant any champion, generate 200
  seeded random champions, add gold/gems/energy. Excluded from production bundles.
- **Components.** `VirtualGrid`, `ChampionCard` tint/placeholder/compact modes, `Tabs` test ids,
  `DecoFrame` `line` variant; DevKit gallery shows the deco set at 1:1 and the card frames at 2:1.

### Changed
- `content/champions/index.ts` lists champions explicitly (no glob), so content loads identically
  in Vite, Vitest and `tools/`.
- The asset pipeline packs the bare outline deco frames as `deco.NN.line` (cache version 4).

### Fixed
- `DecoFrame` emitted `border-image-width` without a unit, which CSS reads as a multiple of the
  border width; frames were drawn as 12–16× slabs and only looked right by accident at card size.
- `AbilityIcon` drew the lit ember frame (an opaque disc) over the icon art; it is now the glow
  behind the art with the transparent ring on top.
- Passive and aura descriptions are interpolated with `passiveNumbers`, so a passive that quotes
  a duration no longer shows a raw `{turns}` token.
- The title screen's first-click fullscreen offer spent the click's user activation, so "Import
  Save" as the very first click went fullscreen and never opened the file picker; the Import
  button now keeps its activation and the offer waits for the next click.

### Balance
- Champion stats, star multipliers (`STAR_MULT`), level factor, rarity budgets, role templates,
  power weights and the champion XP curve are in `src/content/balance/stats.ts` and `xp.ts`;
  element relations in `element.ts`.

## [0.0.0] — 2026-09-12 — Phase 0: Foundation & Game Shell

### Added
- **Project scaffold.** Vite 8 (Rolldown) + React 19 + TypeScript 5.9 strict, pnpm, ESLint flat
  config with lint-enforced layer boundaries (`CLAUDE.md` §5.1), Prettier, Vitest (node + jsdom
  projects), Playwright, GitHub Actions CI (assets, manifest drift, validate, typecheck, lint,
  unit, build, e2e), `vercel.json`, `.nvmrc`.
- **Asset pipeline** (`tools/assets`). Incremental, content-hashed derivation of everything in
  `/game`: model atlases, avatar and backdrop WebP size sets with blurred placeholders, UI kits as
  WebP, the 140 pixel deco frames packed into one sheet, glyph SVGs inlined into the generated
  CSS as data URIs (and emitted as files for Pixi), spell icons, the owner's audio packs plus
  synthesised UI sounds (`tools/audio`, OGG), VFX flipbooks; a committed typed manifest
  (`AssetKey` unions, `DecoKey` frame ids, `BOOT_ASSETS`) and CSS custom properties for kit
  textures; `pnpm assets:check` guards drift.
- **Engine core.** Seeded xorshift128+ `Rng` (forks, weighted picks, shuffles), `Clock` with
  local daily (00:00) and weekly (Monday) period keys, wallet with all 24 currencies, energy
  regen/cap/overflow maths, player-level and feature-unlock tables, Zod save schema v1 and content
  schemas, new-game factory; unit tests for every formula.
- **Content framework.** `define*` helpers, registry, the 24 currency definitions, balance
  constants (energy, economy, unlocks), typed i18n tables; `pnpm content:validate` cross-checks
  ids, asset keys and strings.
- **State.** Zustand store (immer + subscribeWithSelector) with boot/save/ui slices, selectors,
  event bus; IndexedDB persistence with a 2 s debounce, immediate writes for settings/profile
  edits, a synchronous unload mirror (ADR-022) and rolling backups; ordered migrations; offline
  elapsed-time application; `.chronicle` export/import (SHA-256 checksum) with readable rejection
  of damaged or foreign files.
- **Game window.** Fixed 1920×1080 stage scaled into any window with a backdrop-painted
  letterbox; the loading screen gates only on what the title paints (logo and backdrop are
  preloaded from `index.html`, the rest of the kit warms in the background); installable PWA (web manifest, Workbox precache of the app shell and UI kit, runtime
  caching of everything else, prompt-style "new chapter" update banner); fullscreen offered on the
  first title click and never forced, with declining remembered; custom cursor; no context menu,
  text selection, zoom shortcuts or scrollbars.
- **Design system and component library.** Tokens, self-hosted Alegreya Sans SC / Nunito Sans /
  Rajdhani, 9-slice kit metadata with type-checked keys, runtime-tinted deco frames (ADR-021), and
  the components of `UI_DESIGN.md` §4 (buttons, icon buttons, kit/deco frames, panels, glyphs,
  asset images, backdrop with parallax, dividers, tabs, notification dot, timer, star row, tooltip,
  dialog, scroll area, dropdown, toggle, slider, toasts, currency pills, bars, slots, sprite view,
  champion and gear cards, ability and status icons, top and bottom bars) with a gallery at
  `/?screen=devkit`.
- **Screens and dialogs.** Loading; Title (new/continue/import/settings/fullscreen/credits/
  version, corrupt- and newer-save recovery notices); Emberhold hub (eight hotspots with unlock
  states, boss gate column, bottom navigation); Game Modes (Campaign, Daily Boss, Weekly Boss
  cards gated by level); Locked panel; Settings (audio, display, battle, save data, about);
  Profile (rename); Wallet; new-chronicle and overwrite confirmation; import confirmation; reset
  confirmation; welcome back; credits; in-universe error boundary with save export.
- **Audio.** Howler mixer (master/music/ambience/sfx), music director with cross-fades, ambience
  director per scene, SFX registry mapping UI events to the owner's packs and the synthesised set.
  Music and ambience beds are only fetched after the first user gesture (browsers cannot play
  them earlier anyway), so the multi-megabyte tracks never compete with the first paint.
- **Ambient layers (PixiJS 8).** Seeded fog, embers, fireflies, motes, light rays and lantern
  glows per screen at 30 fps; skipped under reduced motion.
- **Tests.** 51 unit tests across engine, content, state, platform, audio and UI, and 18 Playwright
  end-to-end specs (boot, viewport scaling, PWA registration, browser guards, chronicle lifecycle
  with export/import/reset, navigation, settings persistence, gallery, fullscreen offer).

### Changed
- `CLAUDE.md` §3/§11 record the shipped versions (Vite 8, TypeScript 5.9) and the real command
  list; `ARCHITECTURE.md` §4.2 documents the persistence behaviour actually built.

### Verification notes
- Deployment: production build served with `pnpm preview` (same static semantics as nginx and
  Vercel); the guides in `DEPLOYMENT.md` were reviewed against it. No live VPS/Vercel deploy was
  performed from the development environment.
- Lighthouse 12, desktop preset, production build served by `vite preview`, measured in a
  container without a GPU: **performance 98 / accessibility 100 / best practices 100** with the
  ambient WebGL layer off (`prefers-reduced-motion`; FCP 0.5 s, LCP 1.2 s, TBT 0 ms, CLS 0.001,
  1.5 MB, 109 requests). With the ambient layer on, the same build scores 60 only because
  Chromium's software rasteriser (SwiftShader) turns every Pixi frame into a long task
  (TBT 9.7 s, LCP still 1.3 s); on a real GPU those frames are a few milliseconds. Re-measure on
  the owner's laptop before EA-0.1 (Phase 15 checklist).
- Music stays the owner's MP3s (7–8 MB each, streamed on demand); re-encoding is `USER_QUESTIONS.md` Q28.

### Planning phase (before 0.0.0)

#### Added
- Planning phase: engineering constitution (`CLAUDE.md`, `AGENTS.md`), phased `ROADMAP.md`,
  `USER_QUESTIONS.md`, design bible (`docs/design/*`: game design, champions with the full
  EA-0.1 roster, battle rules and formulas, campaign, gear, economy, summoning, bosses, quests
  and the 120-mission Chronicler's Path, tutorial script), technical docs (`docs/tech/*`:
  architecture, UI specification, content authoring, assets inventory, deployment for Ubuntu VPS
  and Vercel, decision records), repository hygiene files.

#### Changed
- Planning updated with the owner's answers to all 24 questions (`USER_QUESTIONS.md` §2): party
  size 3 in campaign / 4 in boss fights; daily reset 00:00 local and weekly reset Monday 00:00
  local; skill upgrades via Skill Tomes only; generous energy model (+1/min, cap 60 + 10 per level,
  unlimited reward overflow, ≈ 3,000 early-game provisions); installable PWA + fullscreen offered (never forced) game
  window; direct pushes to `main`; in-house SFX/VFX generation allowed; ADR-014 accepted and
  ADR-015…020 recorded. Follow-up answers Q25–Q27: team presets per mode in the save schema,
  stage energy costs kept for EA-0.1 (re-checked in Phase 15), fullscreen offered but never
  forced.
- `docs/tech/ASSETS.md` and `docs/tech/CREDITS.md` now inventory the newly added ambience sets,
  SFX packs and the two VFX packs; the sound map and VFX library in `docs/tech/UI_DESIGN.md` map
  game events to the real files.

