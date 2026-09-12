# Technical Architecture

Related: `CLAUDE.md` §3–5 (stack, layout, rules), `DECISIONS.md` (why), `CONTENT_AUTHORING.md`,
`UI_DESIGN.md`, `ASSETS.md`, `docs/design/BATTLE.md`.

## 1. Runtime overview

```
┌──────────────────────────────── Browser / Electron window ────────────────────────────────┐
│  app/            GameViewport (1920×1080 scaled) · Router · Providers · ErrorBoundaries     │
│  ┌──────────────┐   ┌─────────────────────────┐   ┌──────────────────┐   ┌──────────────┐ │
│  │ ui/ (React)  │◀──│ state/ (Zustand slices) │──▶│ render/ (Pixi)   │   │ audio/       │ │
│  │ screens,     │   │ selectors · persistence │   │ BattleStage,     │   │ music, sfx   │ │
│  │ components   │   │ event bus · migrations  │   │ SummonStage, FX  │   │ mixer        │ │
│  └──────┬───────┘   └───────────┬─────────────┘   └────────┬─────────┘   └──────┬───────┘ │
│         │  commands             │ reducers/calculators      │ events             │ events  │
│         ▼                       ▼                           ▼                    ▼         │
│  ┌──────────────────────────── engine/ (pure TypeScript) ─────────────────────────────┐   │
│  │ battle · economy · progression · summon · quests · rng · time · schema              │   │
│  └────────────────────────────────────┬────────────────────────────────────────────────┘   │
│                                       │ reads                                              │
│  ┌────────────────────────────────────▼────────────────────────────────────────────────┐   │
│  │ content/ (typed data, validated)        assets manifest (generated from /game)      │   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
│  platform/  storage (IndexedDB · localStorage · file) · clock · window/fullscreen           │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Bootstrap sequence

1. `main.tsx` mounts `<App/>` inside `<GameViewport/>` and shows the loading screen (logo,
   progress bar from the kit).
2. Load the **asset manifest** (`/assets/generated/manifest.json`) and the critical atlas group
   (`ui`, `fonts`, `hub`).
3. `content/registry` builds the content index; in dev and test it is validated with Zod and
   cross-reference checks (`ContentError` halts boot with a readable panel).
4. `platform/storage` opens IndexedDB `chronicleidle` (stores: `saves`, `backups`, `settings`).
5. `state/persistence.load()` → migrate (`saveVersion` → latest) → `applyOfflineElapsed(now)`:
   energy regen, period resets (daily/weekly), boss key refills, idle-chest accrual is computed
   lazily on claim from `lastClaimAt`.
6. Store hydrated → router shows **Title** (no save) or **Hub** (save exists, "Continue").
7. Non-critical atlas groups (`battle`, `summon`, champion models) preload in the background with
   priority hints; screens await their group on entry with a short in-universe transition.

## 3. Engine

### 3.1 Shape

- **Calculators**: pure math (`statAt`, `damage`, `xpToNext`, `idleAccrual`) — no state mutation.
- **Reducers**: `(state: SaveGame, input, ctx: { content, rng, clock }) → { state: SaveGame; events: DomainEvent[] }`.
  All game actions (level up, equip, claim chest, summon, start battle result application) are
  reducers. They never throw for user-facing rule violations; they return `Result` with a typed
  `GameError` (`insufficient_currency`, `locked`, `invalid_target`, …) that the UI renders.
- **Domain events**: `champion.leveled`, `gear.upgraded`, `currency.changed`, `stage.cleared`,
  `summon.revealed`, `boss.damage_recorded`, `quest.progressed`, … Consumed by: quest/mission
  tracker (inside the same reducer pipeline via `applyProgressEvents`), UI toasts, audio cues,
  tutorial triggers.
- **Immutability**: reducers use Immer's `produce` internally; the state layer applies the
  returned object. No class instances in state; plain JSON.

### 3.2 Battle module

```
createBattle(setup: BattleSetup, content, seed) → BattleState
step(state: BattleState, decision?: Decision) → { state, events: BattleEvent[], request?: DecisionRequest, outcome?: Outcome }
autoDecide(state, unitId, policy) → Decision
resolveOutcome(state) → BattleResult (damage dealt, turns, deaths, stars input)
```

- `BattleSetup`: party (champion instance snapshots with computed stats), encounter (waves, boss
  config, turn limits), control mode, seed.
- The simulation is synchronous; `step` advances until the next decision request (manual, ally
  turn) or the end. In auto mode the controller loops `step(autoDecide(...))` until done — the
  full battle can be simulated instantly for tests and for `pnpm sim:balance`.
- **Determinism**: `xorshift128+` RNG seeded per battle; the seed and the decision log are stored
  in the battle result for replays and bug reports.
- Effect resolution follows `docs/design/BATTLE.md` §6 with one resolver per `kind` in
  `engine/battle/effects/<kind>.ts`, registered in `effects/index.ts`.

### 3.3 Battle controller (state layer)

`BattleController` owns the live battle: it holds `BattleState`, exposes `useBattle()` to React,
runs the simulation in **chunks** so the presenter never starves: the controller requests
`step()` only when the presenter has consumed the previous events (back-pressure), except in
"instant" contexts (tests, sim). Speed changes alter presenter timing only.

### 3.4 Presenter (render layer)

`BattlePresenter` maps `BattleEvent[]` to GSAP timelines on Pixi display objects:

| Event | Presentation |
| --- | --- |
| `turn.start` | active-unit ring, TM bar highlight, ability bar swap (React HUD) |
| `ability.cast` | caster lunge/cast pose (synthesised: squash-stretch + flash), spell icon flare, SFX |
| `hit` | hit-stop (60 ms ×1), target shake/flash, damage number (crit larger, gold), particles by element |
| `status.applied/expired` | icon pop on the unit's status row, tint pulse |
| `heal` | green rise particles, number |
| `unit.died` | dissolve + ash particles, slot dims |
| `wave.cleared` | camera push, "Wave 2/3" banner, enemies slide in |
| `battle.ended` | slow-mo last hit (victory), fade to result |

Ultimate (A4) casts trigger a **cut-in**: the champion's avatar slides across a dark slash with
speed lines and the ability name — the only place the 1254² avatars are shown large.

### 3.5 Economy, progression, summon, quests

Each is a folder of reducers + calculators + tests. Cross-cutting rules (unlock gating, cost
checks) are helpers in `engine/progression/unlocks.ts` and `engine/economy/wallet.ts`.

### 3.6 Time

`Clock` interface (`now(): number`, `todayKey()`, `weekKey()`) with `SystemClock` and
`FixedClock` (tests). Daily/weekly boundaries: 04:00 local by default (`balance/economy.ts`).
`applyOfflineElapsed` is idempotent and records the last applied period keys.

## 4. State (Zustand)

Slices: `profile`, `wallet`, `energy`, `roster`, `gear`, `campaign`, `bosses`, `summon`, `quests`,
`missions`, `idle`, `tutorial`, `settings`, `stats`, `ui` (transient: screen stack, dialogs,
selection), `battle` (transient controller). Persisted slices form `SaveGame`; `ui` and `battle`
are not persisted (an interrupted battle is forfeited, energy already spent — standard for the
genre; a "battle in progress" flag prevents double-spend on reload).

Selectors compute derived data (total stats, power, unlocks, quest progress) and are memoised with
`reselect`-style helpers; React components subscribe to narrow selectors.

### 4.1 Save schema (v1)

```ts
interface SaveGame {
  saveVersion: 1; createdAt: number; updatedAt: number; seedRoot: string;
  profile: { name: string; level: number; xp: number; avatarChampionId: string | null; titles: string[] };
  wallet: Record<CurrencyId, number>;
  energy: { value: number; lastTickAt: number };
  roster: Record<string, ChampionInstance>;
  gear: Record<string, GearInstance>;
  teams: { presets: Record<string, string[]>; lastUsed: Record<string, string[]> };
  campaign: { stages: Record<string, { stars: 0|1|2|3; clears: number; bestTurns: number | null }>;
              unlocked: { normal: boolean; hard: boolean }; speeds: { x3: boolean; x4: boolean }; starChests: string[] };
  bosses: Record<BossId, { periodKey: string; keys: number; damage: Record<string, number>; chests: Record<string, number[]>; records: Record<string, { damage: number; team: string[]; at: number }> }>;
  summon: { pity: Record<ShardId, { sinceEpic: number; sinceLegendary: number; sinceMythic: number }>; history: SummonRecord[] };
  quests: { daily: PeriodProgress; weekly: PeriodProgress };
  missions: { chapter: number; completed: string[]; claimed: string[]; progress: Record<string, number> };
  idle: { lastClaimAt: number };
  tutorial: { completedSteps: string[]; activeStep: string | null; skippedChapters: string[] };
  settings: { music: number; sfx: number; speed: 1|2|3|4; auto: boolean; reducedMotion: boolean; fullscreen: boolean; language: 'en' };
  stats: Record<string, number>;          // lifetime counters used by quests/missions
  periods: { lastDailyKey: string; lastWeeklyKey: string };
}
```

### 4.2 Persistence

- Debounced autosave (2 s) after any persisted-slice change; immediate on `visibilitychange`,
  `pagehide`, battle end, summon, claim.
- Rolling backups: 3 most recent autosaves + 1 "pre-migration" snapshot.
- Export: `.chronicle` file = base64(JSON) + SHA-256 checksum header; import validates schema
  and checksum, shows a summary (level, champions, updated date) before overwriting, and stores a
  backup of the current save first.
- Multiple save slots: not in EA-0.1 (Q in `USER_QUESTIONS.md`); the schema keeps a `slotId`
  key path to allow it later.

## 5. Rendering

- One Pixi `Application` per stage (battle, summon); created on screen entry, destroyed on exit;
  shared texture cache via `Assets`.
- Renderer preference: WebGPU → WebGL2; `roundPixels: true`; nearest-neighbour scaling for
  pixel-art atlases; sprites positioned at integer virtual pixels scaled by the viewport factor.
- Layers: `backdrop` (2–3 parallax planes + colour grade overlay) → `ground` (shadows) →
  `units` (y-sorted) → `fx` (particles via `@pixi/particle-emitter`-style lightweight emitter
  written in-house) → `numbers` (BitmapText, Rajdhani) → React HUD above the canvas.
- Ticker pauses when the tab is hidden; the simulation is unaffected (it is not time-based).
- Object pools for particles and damage numbers; texture atlases ≤ 2048².
- React never re-renders per frame during battle; HUD updates come from batched controller
  events (turn changes, HP changes at hit resolution).

## 6. UI layer

- Router: in-memory screen stack (`push/replace/pop`) with typed routes and per-screen lazy
  chunks; the URL is not used (Electron-friendly), but `?screen=` is honoured in dev.
- Every screen: `<Screen backdrop=… music=…>` wrapper handles backdrop, ambient layer, entry/exit
  transitions, top bar, and the asset-group await.
- Dialogs are a stack too; `Esc` pops.
- Component library in `ui/components` (see `UI_DESIGN.md` §4).

## 7. Audio

- `MusicDirector`: states `title`, `hub`, `battle`, `summon`, `boss`; cross-fade 1.2 s; the two
  provided tracks map to `hub/title` and `battle/boss`; summon reuses hub with a low-pass filter
  until a dedicated track is sourced.
- `Sfx.play(key, { variant, pitchJitter })` with per-key pools and a limiter (max 8 voices).
- Mixer: master/music/sfx volumes persisted in settings; ducking of music during summon burst.

## 8. Asset pipeline (`tools/assets`)

Input `/game/assets/**` → output `/public/assets/generated/**` + `src/assets/manifest.generated.ts`.

| Source | Output |
| --- | --- |
| `champions/<id>/idle/frame_*.png`, `still/*.png` | one atlas per model (`models/<id>.png` + `.json`), frame durations (200 ms) |
| `champions/<id>/<id>_avatar.png` (1254²) | WebP at 1024 / 512 / 256 / 128 |
| `enemies/<id>/…` | same as champions |
| `ui/dark-ember`, `ui/stone-vine` | copied; 9-slice insets recorded in `ui-kit.json` (measured once, hand-tuned) |
| `ui/deco-frames/*.png` (96²) | one atlas; 32 px insets |
| `ui/line-glyphs/*.svg` | inlined SVG sprite (`<symbol>`), usable as CSS mask and as Pixi texture |
| `ui/spell-icons/*.webp` | copied + 64 px thumbs atlas |
| `wallpapers/*` | WebP 1920 and 2560 widths + 64 px blurred placeholder |
| `logos/*` | copied |
| `music_and_sounds/**` | copied; loudness-normalised (−16 LUFS) |

The manifest is typed (`AssetKey` union) so a typo in a content file is a compile error. Groups
(`ui`, `hub`, `battle`, `summon`, `model:<id>`) drive preloading.

## 9. Testing & tooling

- `vitest` for engine (target ≥ 90 % line coverage in `engine/`), React Testing Library for UI
  flows, Playwright e2e for tutorial chapter 1 and a full campaign battle.
- Fixtures: content snapshots, saves per phase (`tests/fixtures/saves/v<phase>.json`).
- `pnpm sim:balance`: runs each stage on all difficulties with reference teams (defined in
  `tools/sim/teams.ts`: "starter Lv10", "mid Epic team 4★40", "endgame 6★60 geared") and prints
  win rate, average turns, and a difficulty curve; fails CI if a stage's win rate for its intended
  tier falls outside the band declared in `CAMPAIGN.md` §5 notes.
- `tools/perf/battle-bench.ts`: headless Chromium via Playwright records frame times for a ×4
  5 v 5 battle with FX; reports p50/p95.

## 10. Electron readiness (backlog)

Everything platform-specific is behind `platform/`: `StorageAdapter` (IndexedDB now; file-based
later), `FileDialogAdapter` (download/upload now; native dialogs later), `WindowAdapter`
(fullscreen API now; BrowserWindow later). No Node APIs are used anywhere in `src/`.

## 11. Error handling, logging

- `ErrorBoundary` per screen with in-universe panel and "export save" action.
- `log` utility with levels; in production only warnings/errors are kept in a ring buffer
  (last 200) that is attached to exported bug reports (save + seed + decision log + log tail).
- Content validation errors list every problem at once, with file ids.
