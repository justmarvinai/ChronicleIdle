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
│  │ battle · gear · forge · economy · progression · summon · quests · rng · time · schema│   │
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
   energy regen, period resets (daily/weekly), the boss rollover — a spent period's unclaimed
   chests are paid as tribute on the way in (BOSSES.md §1) and the keys come back with it — and the
   quest rollover, which writes each board's new baseline once for a period that turned over while
   the game was closed (ADR-040). Idle-chest accrual is computed lazily on claim from
   `lastClaimAt`.
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
- **Domain events**: `champion.levelled`, `gear.levelled`, `currency.changed`, `campaign.runFinished`,
  `summon.revealed`, `boss.fightFinished`, `quests.claimed`, … Consumed by UI toasts, audio cues
  and (from Phase 14) tutorial triggers. Quests deliberately do **not** listen: they read the
  lifetime counters the reducers write (`engine/progression/counters.ts`), so a missed event cannot
  leave a quest stuck (ADR-040).
- **Immutability**: reducers use Immer's `produce` internally; the state layer applies the
  returned object. No class instances in state; plain JSON.

### 3.2 Battle module

```
createBattle(setup: BattleSetup, seed) → BattleState          // setup: encounter, party, enemyById, control
step(state, decision?) → { events, request, outcome }         // exactly one unit's turn per call
runAuto(state) → { events, outcome }                          // whole fight, headless
replay(setup, seed, decisions) → BattleEvent[]                // the determinism proof
autoDecide(state, unit) → Decision · snapshot(state) → BattleView · retreat(state) · setControl(state, mode)
```

- `BattleSetup`: party (`{ instance, def }` pairs; stats are computed at creation), encounter
  (waves, scaling, turn limits, boss config through the enemy defs — immunities, enrage, phases and
  the escort a phased boss stands with, linked to their master at spawn), control mode. The seed is
  mixed with the encounter id and the party so two fights never share a stream.
- `BattleState` is mutable and advanced in place: `step` resolves one turn, returns early with a
  `DecisionRequest` for a manual ally, and resumes with that decision. Only player decisions are
  logged — AI decisions re-derive from state and seed — so a replay is `(setup, seed, decisions)`.
- **Determinism**: the xorshift RNG lives in the state and is forked per subsystem; nothing in
  `engine/` reads the clock or `Math.random`.
- Effect resolution follows `docs/design/BATTLE.md` §6 with one resolver per `kind` in
  `engine/battle/effects/<kind>.ts`, registered in `effects/index.ts`; passive-only kinds live in
  `passives.ts`, `stats.ts` and `damage.ts`.
- `wave.started` carries the spawned units' `UnitView`s so presenters never reach into the state;
  `snapshot` produces the same view for the HUD and the result screen.

### 3.3 Battle controller (state layer)

`battleController` (`src/state/battle/controller.ts`, a Zustand vanilla store read through
`useBattleSession`) owns the live battle. `start({ encounterId, instanceIds, roster, control,
speed, seed, awaitPresenter })` validates the team, creates the state and pumps `step()` with
**back-pressure**: the next step runs only after the presenter's `play(events, speed, onEvent)`
promise resolves. The store holds the *presented* view — every event is folded into it as the
presenter lands it (`applyEventToView`: HP, shields, statuses, TM, waves, corpses leaving on the
next wave), plus the open `DecisionRequest`, a 400-event log for the Info panel, the outcome and,
for bench fights, the stage's frame statistics. `awaitPresenter` (set by the UI flow) holds the
pump until the battle screen attaches its stage presenter, so no turn resolves off-screen; tests
and headless runs use the `instantPresenter` and never wait. Switching to auto answers an open
request with the AI policy; speed changes alter presenter timing only; `retreat()` ends the
fight; `end()` tears the session down after the result screen.

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

**The ticker is configured once** (`render/gsap.ts`, which every timeline imports instead of the
package). GSAP's lag smoothing treats a frame longer than half a second as a stall and advances by
33 ms rather than by the time that really passed, which turns a machine that cannot hold the frame
rate into one that plays the fight in slow motion — §5.6 of `CLAUDE.md` asks for frames to be
dropped instead. It is off; the gap a hidden tab leaves is never played back because the stage and
the ritual both pause their timelines on `visibilitychange`.

**The fight is never hostage to the stage.** The controller holds the first turn until a presenter
attaches, so nothing resolves off-screen, but a WebGL context that hangs rather than fails would
hold it for ever; after twenty seconds `BattleStageMount` attaches the instant presenter and the
fight plays through the HUD, which is what a *failed* stage already did.

Shipped shape (Phase 2): `createBattleStage(host, { backdrop, view, hooks, embers })` mounts a
Pixi application on the 1920 × 1080 stage grid (`render/battle/layout.ts`, shared with the HUD's
plate anchors) and returns `{ presenter, setPaused, frameStats, destroy }`. Effects come from
`render/battle/fx/registry.ts` (owner packs + generated `fx.gen.*` flipbooks) and play through
`fx/flipbook.ts`; numbers from `numbers.ts`; the melee/ranged choreography is synthesised from
squash-stretch, lunges and projectile flights rather than authored attack animations.

### 3.5 Economy, progression, summon, quests

Each is a folder of reducers + calculators + tests. Cross-cutting rules (unlock gating, cost
checks) are helpers in `engine/progression/unlocks.ts` and `engine/economy/wallet.ts`.

`engine/economy/pool.ts` is the one implementation of a **regenerating resource**: a
`{ value, lastTickAt }` pair that earns whole units on read, stops at a cap, accepts grants past it
and is spent with a typed error when it is short. Energy and the Eternal Key are both thin calls
into it (`engine/economy/energy.ts` and `engine/tower/tower.ts`), which is why a rule stated once —
"regeneration pauses above the cap" — holds for both without being written twice.

`engine/tower/` is three files: `encounter.ts` (what a floor fields, derived from its number),
`tower.ts` (the keys, the thirty-day season and each floor's state) and `rewards.ts` (what a floor
pays, and the seeded shard roll on a boss floor). Nothing about a floor is authored
(`docs/design/ETERNAL_TOWER.md` §3).

`engine/summon/` is four files: `summon.ts` (the rarity row and the champion roll), `pity.ts`
(mercy counters, guarantees, soft climbs), `rotation.ts` (the fourteen-day wheel from a fixed UTC
epoch, and which mercy rules a Primordial Rotation swaps in) and `choices.ts` (which champion
choices the campaign owes). A pull takes its rarity roll even when a guarantee has already decided
the answer, so the seeded stream advances identically and a replay cannot diverge.

### 3.6 Gear module

```
generateGear(input, rng) → GearInstance                  // one roll: main stat, substats, any levels
levelGear(piece, levels, rng) → { piece, rolls }         // never mutates the piece it is given
planEquip(champion, pieceId, inventory, roster) → EquipPlan   // what the swap would do; the store does it
gearedStats(def, instance, worn) → ChampionStats         // what a battle unit is built from
totalStats / totalPower(def, instance, worn, setById)    // what the screens show (sets included)
setPassives(worn, setById) → PassiveDef[]                // what the battle adds to the unit
gearEntries / sortAndFilterGear(entries, view)           // the Armoury's racks
```

- Two stat functions, deliberately (`engine/gear/champion-stats.ts`): `gearedStats` stops at the
  pieces, because the battle applies a set's `stat_mod` through the passive engine like any other
  passive — baking it in here would count it twice. `totalStats` adds them, for the screens,
  where there is no passive engine to do it.
- A set is data (`content/sets/*.ts`) written in the champions' own passive shape, so the battle
  learned only the two mechanics the sets introduced (`lifesteal`, `counterattack`). Complete
  groups are counted by `setGroups`; a doubled two-piece group grants two copies of its passive,
  each with its own id, so `oncePerBattle` bookkeeping and the log stay unambiguous.
- A piece's own "power" is measured against `GEAR_POWER_REFERENCE` (`content/balance/gear.ts`) —
  a percentage roll is worth nothing without a champion to apply it to — and is a sorting
  yardstick only.

### 3.7 Forge module

```
craftCost(tier, withSigil) → CurrencyAmount[]        // the recipe, as the wallet reads it
craftPool(tier, sets) → string[]                     // which sets the tier carries
craftGear(input, rng) → Result<GearInstance>         // the drop generator, with the tier's bands
planDismantle(pieces, goldSpentOn) → Result<DismantlePlan>   // merged yield + the level refund
planRefine(piece, sacrifice) → Result<RefinePlan>    // the climb, and the re-based main stat
```

- A craft is the *same* generator a drop goes through (`@engine/gear/generate`); the tier only
  decides the rarity band, the star band and the set pool, so a struck piece can never be a
  different kind of thing from a fallen one.
- `planDismantle` refuses the whole selection when any piece is worn or locked: a multi-select is
  exactly where a partial action is unrecoverable, because the player cannot see which half went.
- A refine keeps the piece's identity — same `instanceId`, rarity, level and substat values — and
  only its star changes, which re-bases the main stat through `mainStatValue`.

### 3.7a Palace module

`engine/palace/` is three small files and no state of its own:

- `bonus.ts` — `palaceBonus(bought, nodeById)` folds the bought ids into one flat grant per element
  plus the Heart's percentage; `withPalace` adds it as the **last** stat layer, after every
  multiplier (`GLORIOUS_PALACE.md` §3). The lookup is injected rather than imported: the engine may
  read content *types* but not the content tables (`CLAUDE.md` §5.1), the same way gear sets are.
- `ledger.ts` — earned/spent/available, and `nodeState` (owned / ready / unreachable / too short),
  which is the one place that decides whether a point may be spent on a node.
- `points.ts` — one pure function per source, each returning "what is owed that has not been paid"
  plus the watermark to store with it, so a reducer can be replayed and a source can never pay
  twice.

The state layer (`state/palace.ts`) applies those answers, and `gearedStats`/`totalStats`/
`totalPower` take a `PalaceBonus` as a **required** last argument — so adding the Palace made the
compiler enumerate every screen that reports a champion's stats instead of letting one of them
quietly under-report.

### 3.7b Brewery module

`engine/brewery/` is three small files and, like the Palace's, no state of its own:

- `encounter.ts` — `breweryEncounterId` / `parseBreweryEncounterId`, and `breweryEncounter(def,
  stage, faction, settlement)`, which derives a stage's one wave from the faction holding it: a
  window over its six units that walks by one per stage, its captain on stage 5, and its
  settlement's backdrop, music and surface. The faction and settlement are **passed in**, not
  imported — the engine may read content types but not the content tables (`CLAUDE.md` §5.1), the
  same discipline the Palace's node lookup follows.
- `schedule.ts` — `opensOn` / `isBreweryOpen` / `daysUntilOpen` / `nextOpenWeekday` /
  `msUntilBreweryOpens`, over `gameWeekday`, which shifts `getDay` by the daily reset hour so a
  hall's Wednesday is the player's own (`BREWERY.md` §2).
- `runs.ts` — the day's ledger read at the door (`breweryDay` treats a record from an older day as a
  fresh one), `runsLeft`, `clearedStage`, `isStageUnlocked`, `stageState` and `breweryRewards`.

`content/registry.ts` memoises a derived encounter per `(element, stage)` and resolves brewery ids
in `encounterById`, so every screen that takes an encounter id — battle setup, the HUD, the result —
works on a brewery stage without knowing the mode exists.

### 3.8 Time

`Clock` interface (`now(): number`, `todayKey()`, `weekKey()`) with `SystemClock` and
`FixedClock` (tests). Daily boundary 00:00 local, weekly boundary Monday 00:00 local, by default (`balance/economy.ts`).
`applyOfflineElapsed` is idempotent and records the last applied period keys.

## 4. State (Zustand)

Slices: `profile`, `wallet`, `energy`, `roster`, `gear`, `campaign`, `bosses`, `tower`, `summon`,
`quests`, `missions`, `idle`, `tutorial`, `settings`, `stats`, `ui` (transient: screen stack, dialogs,
selection), `battle` (transient controller). Persisted slices form `SaveGame`; `ui` and `battle`
are not persisted (an interrupted battle is forfeited, energy already spent — standard for the
genre; a "battle in progress" flag prevents double-spend on reload).

Selectors compute derived data (total stats, power, unlocks, quest progress) and are memoised with
`reselect`-style helpers; React components subscribe to narrow selectors.

### 4.1 Save schema (v6 — target shape)

Shipped so far: v1 (Phase 0: profile, wallet, energy, settings, stats, periods, provisions),
v2 (Phase 1: `roster`, `counters`, `profile.avatarChampionId`; migration 1→2 drops the old
`avatarKey`), v3 (Phase 2: `teams` with three presets and the last team per party-size mode;
`settings.battleSpeed` / `settings.autoBattle`), v4 (Phase 3: `campaign` — stars, best turns, the
selected pointer and the auto-repeat count), v5 (Phase 4: `profile.titles` becomes
`profile.title`, the one title the chronicle *wears*; which titles are **earned** is derived from
the play by `@engine/progression/titles`, never stored), v6 (Phase 6: `inventory` with every
piece of gear the chronicle owns, and `counters.gear`), v7 (Phase 8: `summon`), v8 (Phase 9:
`idle`), v9 (Phase 10: `bosses`), v10 (Phase 12: `quests`), v11 (Phase 13: `missions`), v12
(Phase 14: `tutorial`), v13 (0.1.1: the tutorial's step ids rotate when the Path moves to chapter 2), v14
(0.2.0: `tower`, plus the `key_eternal` wallet row), v15 (0.6.0: `palace`, whose migration also
back-pays a skill point for every settlement boss stand the chronicle had already cleared) and v16
(0.7.0: `brewery`, whose migration writes an empty day because there is nothing to back-pay).
Fields
below that no phase has shipped yet are the planned shape and are added by their phase with a
migration and a fixture in `tests/fixtures/saves/`.

```ts
interface SaveGame {
  saveVersion: 6; createdAt: number; updatedAt: number; seedRoot: string;
  profile: { name: string; level: number; xp: number; avatarChampionId: ChampionId | null; title: string | null };
  wallet: Record<CurrencyId, number>;
  energy: { value: number; lastTickAt: number };
  provisionsClaimed: string[];   // one-time grants already paid, by id (the Provisions, Eldric's shard)
  roster: Record<string, ChampionInstance>;   // instance ids are `<def>-<n>` from `counters.instances`
  counters: { instances: number; gear: number };   // monotonic serials so ids never collide after a release
  inventory: Record<string, GearInstance>;    // gear ids are `gear-<n>` from `counters.gear`
  teams: Record<'campaign' | 'boss', { presets: string[][]; lastUsed: string[] }>;   // 3 presets per mode (Q25)
  campaign: { stages: Record<string, { stars: 0|1|2|3; clears: number; bestTurns: number | null }>;
              unlocked: { normal: boolean; hard: boolean }; speeds: { x3: boolean; x4: boolean }; starChests: string[] };
  // Shipped in save v9. The period a boss's numbers belong to is stored, not a reset timer: a
  // record from an older period reads as a fresh one, so nothing has to run at midnight (ADR-033's
  // discipline). `claimed` holds `<tierId>:<pct>` per chest taken; `records` outlive every reset.
  bosses: Record<BossId, { periodKey: string; keysUsed: number; damage: Record<string, number>;
            claimed: string[]; records: Record<string, { damage: number; team: string[]; at: number }> }>;
  // Shipped in save v14. An anchor, a period key, two floors and a key pool: the first floor the
  // chronicle ever attempted (0 until then, so a migrated chronicle does not start a season it has
  // not played, and it never moves again), which season the climb belongs to, how high that climb
  // got, and the best floor ever — which outlives the season, as a boss record outlives its
  // period. A climb stamped with an older season reads as an empty one, so the thirty-day reset
  // happens at the door. Every floor's state is read off `highestFloor`, because floors are
  // climbed in order, so there is no per-floor list to fall out of step (ETERNAL_TOWER.md §2, §8).
  tower: { firstAttemptAt: number; climbSeason: number; highestFloor: number; bestFloor: number;
           keys: { value: number; lastTickAt: number } };
  // Shipped in save v15. The Glorious Palace (GLORIOUS_PALACE.md): which nodes are bought, how many
  // points have ever been earned, and one watermark per source so nothing is ever paid twice — the
  // settlements that have paid, the highest tower floor paid in which season, and the period each
  // boss last paid for. `earned` is stored because two of the four sources repeat and today's
  // progress cannot recover what last month paid; `spent` never is, because it is always the sum
  // of what is bought, which is what makes the free reset bookkeeping-free (CLAUDE.md §5.5).
  palace: { nodes: string[]; earned: number; settlementsPaid: string[];
            tower: { season: number; floorPaid: number }; bossesPaid: Record<string, string> };
  // Shipped in save v16. The Brewery (BREWERY.md §5): the game day the count belongs to, the runs
  // spent that day across all four halls, and the deepest stage cleared per hall. A record from an
  // older day reads as a fresh one, so the twenty runs come back at the door with nothing running at
  // midnight; `cleared` outlives the day, because a ladder is progress rather than an allowance.
  brewery: { periodKey: string; runs: number; cleared: Record<string, number> };
  // Shipped in save v7. `pity` counts pulls since each rarity the shard tracks; `unseen` drives the
  // "NEW" ribbon; `choices` records the champion choices taken (which are *owed* is derived from
  // the campaign's stars, so the ledger cannot disagree with the play).
  summon: { pity: Record<ShardId, Partial<Record<Rarity, number>>>; history: SummonRecord[];
            unseen: string[]; choices: Record<string, { championId: ChampionId; instanceId: string; at: number }> };
  // Shipped in save v10. A board is derived, never stored (ADR-040): what a period keeps is its
  // own key, the lifetime counters as they stood when it began — a counter goal is the delta
  // against them — what has been claimed, and whether a finished daily board has counted its day.
  // A record whose key is older than now reads as a fresh board.
  quests: { daily: QuestPeriodSave; weekly: QuestPeriodSave };   // { periodKey, baseline, claimed, chests, dayCounted }
  // Shipped in save v11. The Chronicler's Path is derived from `claimed`: the mission being walked
  // is the first one not in it, and a chapter opens when the one before it is finished (ADR-040).
  // `baseline` is the counters the open mission started from — only the keys its own goal reads.
  missions: { claimed: string[]; baseline: Record<string, number>; chests: number[]; gearChoice: string | null };
  // Shipped in save v8. The chest's whole state: when it was last emptied (ADR-033).
  idle: { lastClaimAt: number };
  // Shipped in save v12. Which lesson is open is derived from these and where the player is
  // standing (ADR-042), so the save cannot disagree with the step it is on: what it keeps is what
  // Eldric has taught and which chapters were waved off — the latter also carrying the chapters a
  // pre-tutorial chronicle had already outgrown when it migrated.
  tutorial: { completedSteps: string[]; skippedChapters: string[] };
  settings: { music: number; sfx: number; speed: 1|2|3|4; auto: boolean; reducedMotion: boolean; fullscreen: boolean; language: 'en' };
  stats: Record<string, number>;          // lifetime counters used by quests/missions
  periods: { lastDailyKey: string; lastWeeklyKey: string };
}
```

### 4.2 Persistence

- Debounced autosave (2 s) after any change to the save; settings and profile edits (deliberate,
  rare player actions) are written at once; explicit flushes after new game, import and reset,
  and later after battle end, summon and claim.
- `visibilitychange` (hidden) and `pagehide` flush asynchronously **and** write a synchronous
  localStorage mirror (`chronicleidle.save.unload`) because an IndexedDB transaction started
  during unload can be cut off. On boot the mirror wins when it is newer than the IndexedDB
  record, is written back and cleared (`platform/storage.ts`, ADR-022).
- Rolling backups: 3 most recent autosaves plus 2 per event reason (`pre-import`, `pre-reset`,
  `pre-new-game`, `pre-migration`).
- Export: `.chronicle` file = JSON envelope `{ format, version, checksum, payload }` with a
  base64 payload and SHA-256 checksum; import validates format, checksum and schema, shows a
  summary (name, level, saved date) before overwriting, and stores a backup of the current save
  first. Damaged or foreign files are rejected with a readable toast.
- Multiple save slots: not in EA-0.1 (Q in `USER_QUESTIONS.md`); the schema keeps a `slotId`
  key path to allow it later.

## 5. Rendering

- One Pixi `Application` per stage (battle, summon — `render/summon/ritualScene.ts`, mounted by
  `RitualLayer` as a full-stage layer so the ring stays a circle at every window size); created on
  screen entry, destroyed on exit;
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

Music and ambience beds are fetched only after the first pointer or key event (`audio/gate.ts`):
browsers refuse to play before a gesture, and the multi-megabyte tracks must not compete with the
first paint. Directors remember the requested state and start it the moment audio is armed.

- `MusicDirector`: states `title`, `hub`, `battle`, `summon`, `boss`; cross-fade 1.2 s; the two
  provided tracks map to `hub/title` and `battle/boss`; summon reuses hub with a low-pass filter
  until a dedicated track exists (generated or provided).
- `AmbienceDirector`: one looping ambience bed per screen from the owner's ambience sets (town,
  interior day/night, forest day/night, sea/beach, cave/dungeon, river/waterfall, torch), with
  rain/storm variants per settlement; cross-fades on screen change; ducks under battle music.
- `Sfx.play(key, { variant, pitchJitter })` with per-key pools, round-robin variants and a limiter
  (max 8 voices); keys map to the owner's WAV packs or generated sounds (`UI_DESIGN.md` §7).
- Mixer: master/music/ambience/sfx volumes persisted in settings; ducking of music during the
  summon burst and level-up stingers.

## 8. Asset pipeline (`tools/assets`)

Input `/game/assets/**` → output `/public/assets/generated/**` + `src/assets/manifest.generated.ts`.

| Source | Output |
| --- | --- |
| `champions/<id>/idle/frame_*.png`, `still/*.png` | one atlas per model (`models/<id>.png` + `.json`), frame durations (200 ms) |
| `champions/<id>/<id>_avatar.png` (1254²) | WebP at 1024 / 512 / 256 / 128 |
| `enemies/<id>/…` | same as champions |
| `ui/dark-ember`, `ui/stone-vine` | copied; 9-slice insets recorded in `ui-kit.json` (measured once, hand-tuned) |
| `ui/deco-frames/*.png` (96²) | one packed sheet (`deco.sheet`); frames cut and tinted at runtime, 32 px insets |
| `ui/line-glyphs/*.svg` | inlined as data-URI CSS variables (CSS masks, zero requests) and emitted as files for Pixi |
| `ui/spell-icons/*.webp` | copied + 64 px thumbs atlas |
| `wallpapers/*` | WebP 1920 and 2560 widths + 64 px blurred placeholder |
| `logos/*` | copied |
| `music_and_sounds/background_music/*.mp3` | copied; loudness-normalised (−16 LUFS) |
| `music_and_sounds/ambience_sounds/**` (WAV 60 s loops + MP3) | transcoded to OGG (+ MP3 fallback), loop points trimmed, −20 LUFS; file names sanitised into manifest keys (the MP3 names contain mis-encoded dashes — never renamed in `/game`) |
| `music_and_sounds/sfx/**/*.wav` | transcoded to OGG (+ MP3 fallback), peak-normalised, grouped into per-category audio sprites |
| `music_and_sounds/vfx/Free Pixel Effects Pack/*.png` (100 px grids) | sliced into frame atlases with frame counts detected from the grid; per-effect JSON (frame size, fps 24) |
| `music_and_sounds/vfx/GameFXExport/SPRITESHEET_Files/*.png` (64/96/133 px strips) | packed into atlases; frame count = width / frame size; GIFs ignored (strips are canonical) |
| `tools/audio` and `tools/vfx` recipes | rendered into the same output folders and manifest groups as owner assets |

The manifest is typed (`AssetKey` union) so a typo in a content file is a compile error. Groups
(`ui`, `hub`, `battle`, `summon`, `model:<id>`) drive preloading.

## 9. Testing & tooling

- `vitest` for engine (target ≥ 90 % line coverage in `engine/`), React Testing Library for UI
  flows, Playwright e2e for tutorial chapter 1 and a full campaign battle.
- Fixtures: content snapshots, saves per phase (`tests/fixtures/saves/v<phase>.json`).
- `pnpm sim:balance`: runs every stage on every difficulty with the reference teams in
  `tools/sim/teams.ts` ("starter Lv10", the same roster at its star caps, "mid Epic 4★40",
  "endgame 6★60 geared" — rank-up and gear are modelled as a star tier and a stat multiplier until
  Phases 5–6 ship them) and prints win rate and three-star rate per settlement, then checks the
  bands declared beside those teams. `--strict` fails CI when a band breaks, `--scan` prints the
  enemy scale each team can actually take (the table a tuning pass fits `DIFFICULTY_MULT` and
  `stageScale` to) and `--runs`/`--team`/`--difficulty` narrow a run.
- `tools/perf/battle-bench.ts` (`pnpm perf:battle`, against a running preview): headless
  Chromium via Playwright creates a throwaway chronicle, opens `/?screen=perf` and runs the Stress
  Bench encounter (4 v 4, two waves, ×4, four maxed legendaries) on the real battle screen; the
  stage records unclamped frame times and the perf screen reports p50/p95/max (`--strict` fails
  over the 16 ms budget; `--software` forces SwiftShader for GPU-less runners, whose numbers only
  compare with earlier software runs).
- `tools/audio`: deterministic synth recipes (oscillators, noise, envelopes, filters, convolution
  reverb) rendered to OGG/MP3 at build time for UI ticks, stingers and layered impacts; recipes are
  code, outputs are build artifacts.
- `tools/vfx`: procedural flipbook generator — `recipes.ts` paints frames deterministically with
  the soft-shape raster in `painter.ts`, `build.ts` renders them as horizontal PNG strips through
  the asset pipeline (`fx.gen.slash_arc`, `sparks`, `rune_ring`, `smoke`, `speed_lines`; rarity
  bursts arrive with Summoning), same manifest shape as the owner's packs.

## 10. Electron readiness (backlog)

Everything platform-specific is behind `platform/`: `StorageAdapter` (IndexedDB now; file-based
later), `FileDialogAdapter` (download/upload now; native dialogs later), `WindowAdapter`
(fullscreen API now; BrowserWindow later). No Node APIs are used anywhere in `src/`.

## 11. Game window and PWA

- `vite-plugin-pwa` generates the web manifest (`display: standalone`, dark theme colour, icons
  from the logo mark) and a Workbox service worker that precaches the build (hashed files) and
  the generated asset manifest group `ui`; large groups (models, VFX, audio) are runtime-cached
  on first use (cache-first, versioned by the build hash).
- Updates: `registerType: 'prompt'` — a new build is downloaded in the background and applied only
  when the player accepts the in-game "Update available — restart" banner or on the next cold
  start. Mixed-version loads are impossible because every file is hashed and the service worker
  swaps atomically. `sw.js` and the manifest are served with `no-cache` (`DEPLOYMENT.md`).
- Fullscreen: `platform/window.ts` wraps the Fullscreen API (request once on the first title click
  when the setting is on; `F11`/`Alt+Enter`; state persisted). Never forced: a declined or exited
  request flips the setting off, no re-prompt, and the game is fully playable windowed. The
  Electron adapter later maps the same interface to `BrowserWindow.setFullScreen`.
- Input guards (`app/inputGuards.ts`): context menu, text selection, image drag, browser zoom
  shortcuts and back-navigation keys are intercepted inside the viewport (`UI_DESIGN.md` §2.1).

## 12. Error handling, logging

- `ErrorBoundary` per screen with in-universe panel and "export save" action.
- `log` utility with levels; in production only warnings/errors are kept in a ring buffer
  (last 200) that is attached to exported bug reports (save + seed + decision log + log tail).
- Content validation errors list every problem at once, with file ids.
