# CLAUDE.md — ChronicleIdle Engineering Constitution

This file is the single source of truth for **how** ChronicleIdle is built. Every agent and every
human contributor reads it before touching the repository. When this file and any other document
disagree, this file wins; fix the other document.

Companion documents:

| Purpose | File |
| --- | --- |
| How to work in this repo (phase protocol, definition of done, checklists) | `AGENTS.md` |
| Phased development plan to Early Access 0.1 and backlog | `ROADMAP.md` |
| What changed, per phase and version | `CHANGELOG.md` |
| Open questions for the owner, with the default assumption used until answered | `USER_QUESTIONS.md` |
| Game design bible (systems, rules, formulas, numbers) | `docs/design/*.md` |
| Technical architecture, UI spec, content authoring, assets, deployment | `docs/tech/*.md` |

---

## 1. What ChronicleIdle is

ChronicleIdle is a **2D pixel-art, dark-fantasy, turn-based idle gacha champion-collection RPG**,
in the family of Raid: Shadow Legends, Infinite Magicraid, Age of Magic and Void Hunters. It is a
**single-player** game with **no accounts, no server, no PvP, no clans and no monetisation**. It ships
first as a desktop-first web build (static files on an Ubuntu VPS or Vercel) and later as an Electron
build for Steam (backlog only — never a scheduled phase before EA-0.1).

Core loop: collect champions → level, rank and gear them → beat content until you stall → summon,
craft, upgrade → beat harder content. The game is incremental in spirit: there is always a next
number to raise and a next stage to clear.

The game must **never feel like a web UI**. It is a game that happens to run in a browser: fixed
16:9 game viewport, textured frames from the provided UI kits, ambient motion on every screen, real
battle animation, music and sound.

## 2. Non-negotiables (from the owner's brief)

1. **Production quality at all times.** No skeletons, no MVPs, no prototypes, no "TODO: implement".
   A phase ships one feature that is completely working in-game, or it does not ship.
2. **Data-driven content.** Champions, abilities, enemies, gear, sets, stages, bosses, quests,
   missions, banners, drop tables, currencies, unlocks and every balance number live in
   `src/content/**` as typed, validated data. Adding a champion must never require touching engine
   or UI code.
3. **Extendable, editable, scalable code.** Small modules, explicit interfaces, no god files, no
   hidden coupling. If a future feature would require rewriting a system, the system is wrong.
4. **Performance is a priority.** 60 fps on an average laptop iGPU at 1080p. Budgets in §5.6.
5. **Fully playable without an account.** All state is local (IndexedDB) with export/import.
6. **Use the owner's assets in `/game`.** Prefer them everywhere. Additional assets may be sourced
   from reputable CC0 / commercially-safe sources, or **generated in-house** (synthesised SFX,
   procedural VFX flipbooks) — the owner allows both; record provenance in `docs/tech/CREDITS.md`.
7. **Champions without a finished model use the `teritorial_lizard` model** as a placeholder,
   never a missing-texture box.
8. **Never serif fonts. Never generic rounded "AI-slop" UI.** See §7.
9. **Everything is pushed directly to `main`.** The owner granted direct pushes; there are no
   long-lived development branches (§9.4).
10. **Explicitly out of scope:** PvP, clans, guilds, arena, chat, friends, microtransactions,
    accounts, analytics that leave the device.

## 3. Tech stack

| Concern | Choice | Why |
| --- | --- | --- |
| Language | TypeScript 5.x, `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` | Type-safe content and engine; refactors stay cheap |
| Package manager | pnpm (workspace-ready, single package for now) | Fast, deterministic lockfile |
| Bundler / dev server | Vite 6 | Best-in-class DX, static output for VPS/Vercel, easy Electron later |
| UI layer | React 19 + CSS Modules + CSS custom properties (design tokens) | Menu-heavy game; React is the right tool for lists, panels, forms. No Tailwind, no component library — they produce the look we forbid |
| UI animation | Framer Motion (`motion`) for screen/element transitions; CSS keyframes for loops | Declarative, interruptible, performant |
| Battle / FX rendering | PixiJS 8 (WebGL2, WebGPU when available) | Sprite batching, filters, particles; pixel-perfect nearest scaling |
| Tweening in Pixi | GSAP (core) | Timeline control for choreographed attack sequences |
| State | Zustand (slices + `immer` middleware) with selectors | Small, fast, testable, no boilerplate; engine stays framework-free |
| Validation | Zod | Content schemas, save-file schemas, migrations |
| Persistence | IndexedDB via `idb` (localStorage fallback), file export/import | No server; robust local saves |
| Audio | Howler.js | Music cross-fades, SFX pools, sprite sheets |
| RNG | `seedrandom`-style xorshift implemented in-engine | Deterministic, seedable battles and drops |
| Testing | Vitest (engine/unit), React Testing Library (UI), Playwright (e2e) | Fast, standard |
| Lint / format | ESLint (typescript-eslint, react-hooks, import boundaries), Prettier | Enforced module boundaries |
| CI | GitHub Actions: typecheck, lint, test, build on every push to `main` | Keeps `main` deployable |
| Image tooling | `sharp` in `tools/` | Atlas packing, WebP/AVIF generation from `/game` |
| Fonts | Self-hosted via `@fontsource` (sans-serif only, see §7.2) | No runtime third-party requests |
| PWA | `vite-plugin-pwa` (Workbox precache, `registerType: 'prompt'`) | Installable standalone window, cached assets, controlled updates — the game runs like an app, not a tab |

Rationale for the two-renderer approach: React owns every screen and overlay (hub, lists, panels,
dialogs); Pixi owns the battle stage, the summoning ritual scene and ambient particle layers. They
communicate only through the engine's event stream and the Zustand store — never by reaching into
each other's internals.

## 4. Repository layout

```
/game/                        Owner-provided source assets. READ-ONLY. Never edited in place.
/public/                      Static files served as-is (favicon, generated asset output at build)
/src/
  app/                        Bootstrap, router, GameViewport, providers, loading screen
  engine/                     Pure TypeScript game logic. No React, no Pixi, no DOM, no timers.
    battle/                   Simulation, turn meter, effects, status, AI policy, event log
    economy/                  Currencies, wallet, energy, drops, idle chest maths
    progression/              Player level, champion level/rank/skills, gear upgrade, unlocks
    summon/                   Banner rolling, pity, rotation schedule
    quests/                   Daily/weekly quests, mission-line evaluation
    rng/                      Seeded RNG, weighted tables
    time/                     Clock abstraction, reset boundaries, offline elapsed time
    schema/                   Zod schemas for content and saves
  content/                    Game data only (see docs/tech/CONTENT_AUTHORING.md)
    champions/  abilities/  enemies/  gear/  sets/  stages/  bosses/  banners/
    quests/  missions/  currencies/  balance/  tutorial/  unlocks/  registry.ts
  state/                      Zustand store: slices, selectors, persistence, migrations
  ui/                         React: screens/, components/, hooks/, styles/ (tokens, mixins)
  render/                     Pixi: battle stage, sprite/atlas loading, FX library, camera, ambient
  audio/                      Howler wrappers, music/sfx registry, mixer
  platform/                   Storage adapters (web now, electron later), clipboard, file dialogs
  i18n/                       String tables (English shipped; keys everywhere, no literals in UI)
/tools/                       Node scripts: assets:build, content:validate, sim:balance
/tests/e2e/                   Playwright specs
/docs/                        Design + technical documentation (see document map)
```

Path aliases: `@engine/*`, `@content/*`, `@state/*`, `@ui/*`, `@render/*`, `@audio/*`,
`@platform/*`, `@i18n/*`, `@app/*`. Relative imports never cross a top-level boundary.

## 5. Architecture rules

### 5.1 Module boundaries (lint-enforced)

```
content  →  engine/schema only
engine   →  engine only (+ content types)
state    →  engine, content
render   →  engine (events/types), state (read), content (asset refs)
ui       →  state, engine (pure helpers), content (display data), render (mount points), audio
app      →  everything
```

Violations fail `pnpm lint`. If you need data across a boundary, add a selector or an engine
function; never import upward.

### 5.2 Determinism

Every simulation (battle, drop roll, summon, offline gain) is a pure function of
`(state, content, seed, inputs)`. No `Math.random`, no `Date.now()` inside `engine/`. The engine
receives an `Rng` and a `Clock`. This makes battles replayable, balance testable and bugs
reproducible from a save + seed.

### 5.3 Simulation / presentation split

Battle logic emits an ordered `BattleEvent[]` (turn started, ability cast, hit, status applied,
unit died, wave cleared …). The Pixi presenter plays those events on a timeline at the selected
speed (×1–×4). Manual mode is the same simulation paused at `DecisionRequest` points; auto mode
resolves those points with the AI policy. One code path, no divergence.

### 5.4 Content is data, validated at the door

`src/content/**` exports plain objects built with typed helpers (`defineChampion`, `defineStage`,
…) and collected in `registry.ts`. `pnpm content:validate` (also run in tests and at dev startup)
validates every object with its Zod schema and checks cross-references (ids exist, drop tables
sum, unlock levels sane). A content error is a build error.

### 5.5 Saves

- One `SaveGame` schema, versioned (`saveVersion`), with an ordered migration list.
- Autosave: debounced (2 s) after any state change, plus on `visibilitychange` and before unload.
- Rolling backups (last 3 autosaves) in IndexedDB; manual export/import as a `.chronicle` file
  (base64 JSON with checksum).
- Never store derived data (computed stats, power) — recompute on load.
- Time-based systems store timestamps, not remaining durations.

### 5.6 Performance budgets

| Budget | Value |
| --- | --- |
| Frame time (battle, ×4 speed, 4 v 4 stress encounter with FX) | ≤ 16 ms p95 on Intel Iris Xe class iGPU |
| Initial load to hub (cold, 50 Mbit) | ≤ 4 s; hub interactive before non-critical atlases finish |
| JS bundle (initial route) | ≤ 350 kB gzip; screens code-split |
| Texture memory | ≤ 256 MB; atlases ≤ 2048² each; avatars served at 512/256/128 WebP |
| React commits during battle | 0 per frame (Pixi drives the stage; React updates only on events) |
| Save write | ≤ 10 ms, off the frame via `requestIdleCallback` |

Measure before optimising; keep a `tools/perf/` script to capture battle frame stats.

### 5.7 Error handling

The game never crashes to a white screen. An `ErrorBoundary` per screen shows an in-universe
error panel with "Return to Emberhold" and "Export save". Engine functions throw typed errors
(`ContentError`, `SaveError`, `BattleError`); UI never swallows errors silently.

## 6. Coding standards

- **TypeScript strict.** No `any`, no `as unknown as`, no non-null `!` outside tests. Use
  discriminated unions for effects/events/status; `satisfies` for content objects.
- **Names.** `PascalCase` types/components, `camelCase` functions/values, `SCREAMING_SNAKE` for
  true constants, `kebab-case` files except React components (`PascalCase.tsx`). Content ids are
  `snake_case` strings namespaced by type (`champ.anuria`, `gear_set.ember_guard`, `stage.03.07`).
- **One export per concern.** A file does one thing; screens are composed from components in
  `ui/components/**`; no 800-line files.
- **No magic numbers** in engine/ui. Every tunable lives in `src/content/balance/*.ts` with a
  comment saying what it does and what changing it affects.
- **Comments explain why, not what.** Public engine functions carry a short JSDoc with the formula.
- **Tests are part of the feature.** Engine: unit tests for every formula and every effect.
  UI: interaction tests for flows that move currency or state. E2E: tutorial and one battle.
- **Accessibility baseline.** Keyboard navigation for every dialog, focus rings styled to the
  theme, `prefers-reduced-motion` honoured for non-battle animation.
- **i18n keys, never literal UI strings.** English strings live in `src/i18n/en/*.ts`.

## 7. UI / UX rules

### 7.1 It is a game screen, not a web page

- Fixed virtual resolution **1920 × 1080**, scaled uniformly to fit the window (letterbox/pillarbox
  filled with the scene's own backdrop). Minimum supported window 1280 × 720. Text stays sharp via
  CSS `zoom`-free `transform: scale()` on a root container with integer-snapped font sizes.
- Every screen has a full-bleed illustrated backdrop from `/game/assets/wallpapers` with a parallax
  or ambient layer (fog, embers, dust motes, light rays). Nothing is a flat colour.
- All chrome (panels, frames, buttons, bars, slots) is built from the three UI kits via 9-slice
  `border-image` or sliced sprites. Custom CSS surfaces are only allowed as gradients/textures that
  match the kits' materials (dark stone, ember, gold hairline).
- Corners are square, bevelled or ornate — never `border-radius` pills. Round elements exist only
  where the kit provides round frames (orbs, round buttons, ability icons).
- Rarity and element colours are tokens (`docs/tech/UI_DESIGN.md`) and are applied consistently:
  card frames, name text, particle tints, summon reveal colour.
- Motion everywhere, but purposeful: hover lift + glow on interactive elements, press squash,
  panel slide/fade on open, number tick-up on currency change, shimmer on legendary/mythic frames,
  idle sprite loops in every champion slot, screen transitions ≤ 350 ms.
- Sound on interaction: hover tick, confirm, cancel, reward, level-up, summon reveal tiers.
- It runs like an app, not a tab: installable PWA (standalone window), fullscreen offered at launch (never forced),
  custom cursor, no text selection, no context menu, no native scrollbars, browser zoom shortcuts
  intercepted (the viewport scales itself). Details in `docs/tech/UI_DESIGN.md` §2.1.

### 7.2 Typography

Sans-serif only. Approved stack (self-hosted):

| Role | Font |
| --- | --- |
| Display / headings / buttons | **Alegreya Sans SC** (700/800) |
| Body / labels | **Nunito Sans** (400/600/700) |
| Numerals / stats / timers | **Rajdhani** (600/700), tabular figures |

The provided logo (`/game/assets/logos/chronicle_idle.svg`) is an image and is used as-is.

### 7.3 Reference screens

`/game/design_examples/*` are the layout references. Each screen in `docs/tech/UI_DESIGN.md`
names which reference it clones and how. Clone the **structure and density** of the references
(top currency bar, left roster rail, right action column, bottom primary button, etc.), re-skinned
with our kits and palette.

## 8. Content authoring rules

- One file per champion (`src/content/champions/<id>.ts`), one per gear set, one per settlement
  (stages inside), one per boss, one per banner, one per quest group, one per mission chapter.
- Balance curves and global constants in `src/content/balance/` (`stats.ts`, `xp.ts`,
  `energy.ts`, `drops.ts`, `summon.ts`, `idle.ts`, `battle.ts`, `element.ts`, `economy.ts`).
- Ability effects are composed from the effect DSL (`docs/design/BATTLE.md` §6). Do not add
  ad-hoc `if (champion.id === …)` code anywhere. If a champion needs a new mechanic, add a new
  effect type to the engine with tests, then use it from data.
- Every content object has `id`, `name` (i18n key), and `version` fields; drop tables declare
  weights that are validated to sum correctly.
- Assets are referenced by manifest key (`sprite: 'champ.anuria'`), never by path. The asset
  manifest is generated by `pnpm assets:build` from `/game`.

## 9. Workflow

### 9.1 Phases

Development follows `ROADMAP.md`. One phase = one fully working feature (Phase 0 is the shell that
makes the game runnable). A phase is complete only when every item of its **Definition of Done**
in `AGENTS.md` is satisfied and its acceptance criteria are demonstrated in the running game.

### 9.2 Between phases

After a phase is finished and pushed, the agent posts a short summary and **asks (does not
require)**: "Any improvements, changes or bugs you want handled before the next phase?" If the
owner answers, that work is done first (as a `x.y.z` patch entry in the changelog). If not, the
next phase starts.

### 9.3 Commits and versions

- Conventional commits: `feat(campaign): …`, `fix(battle): …`, `content(champions): …`,
  `docs: …`, `chore: …`, `perf: …`, `refactor: …`, `test: …`.
- Versioning: `0.<phase>.<patch>` during development; **EA-0.1 = `0.1.0`** is tagged when all
  EA-0.1 features from the brief are complete. The pre-release phases use `0.0.<phase>` tags.
- `CHANGELOG.md` is updated in the same commit as the change (Keep-a-Changelog format).

### 9.4 Branch policy

`main` is the only branch and is always deployable. Every session commits to `main` and pushes
directly (owner's decision, `USER_QUESTIONS.md` Q23). If a harness forces a named working branch,
the session fast-forwards `main` to it before it ends; no branch outlives a session. Never
force-push `main`.

### 9.5 Questions

Unknowns never block a phase. Write the question in `USER_QUESTIONS.md` with the default
assumption you are proceeding with, implement the default in a way that is trivially switchable,
and continue.

## 10. Document map

```
CLAUDE.md                      this file — rules
AGENTS.md                      how to work: protocol, definition of done, checklists
ROADMAP.md                     phases 0–15 to EA-0.1, then backlog
CHANGELOG.md                   history
USER_QUESTIONS.md              open questions + defaults
docs/design/GAME_DESIGN.md     vision, pillars, core loop, systems overview, glossary
docs/design/CHAMPIONS.md       rarities, stars, elements, roles, stats, full EA-0.1 roster kits
docs/design/BATTLE.md          turn system, formulas, status effects, effect DSL, AI, speeds
docs/design/CAMPAIGN.md        12 settlements × 10 stages × 3 difficulties, enemies, drops, stars
docs/design/GEAR.md            slots, rarities, stars, main/sub stats, sets, upgrade, crafting
docs/design/ECONOMY.md         currencies, energy, player level, idle chest, sources & sinks
docs/design/SUMMONING.md       shards, banners, rates, pity, rotation, reveal ritual
docs/design/BOSSES.md          daily boss and weekly boss
docs/design/QUESTS_MISSIONS.md daily/weekly quests and the Chronicler's Path mission line
docs/design/TUTORIAL.md        interactive onboarding script
docs/tech/ARCHITECTURE.md      runtime architecture, engine design, state, saves, rendering
docs/tech/UI_DESIGN.md         design tokens, layout grid, every screen, animation language
docs/tech/CONTENT_AUTHORING.md how to add champions, gear, stages, quests, etc.
docs/tech/ASSETS.md            inventory of /game and the asset pipeline
docs/tech/DEPLOYMENT.md        Ubuntu VPS (nginx) and Vercel guides, CI
docs/tech/DECISIONS.md         architecture decision records
docs/tech/CREDITS.md           asset provenance and licences
```

## 11. Commands (once Phase 0 lands)

```
pnpm install            install
pnpm dev                Vite dev server with content validation on boot
pnpm build              assets:build → typecheck → vite build (static output in dist/)
pnpm preview            serve dist/
pnpm test               vitest (engine + ui)
pnpm test:e2e           playwright
pnpm lint               eslint + boundaries + prettier check
pnpm typecheck          tsc --noEmit
pnpm content:validate   validate all content and cross-references
pnpm assets:build       generate atlases, WebP variants and the asset manifest from /game
pnpm sim:balance        headless campaign/boss simulations, prints difficulty curve report
```
