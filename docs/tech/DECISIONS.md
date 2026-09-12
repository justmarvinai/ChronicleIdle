# Architecture Decision Records

Short records of decisions that shape the codebase. Add a new record rather than editing history.

| # | Decision | Status |
| --- | --- | --- |
| ADR-001 | React for screens + PixiJS for battle/summon stages | accepted |
| ADR-002 | Fixed 1920×1080 virtual viewport, uniform scaling | accepted |
| ADR-003 | Content as typed TypeScript modules validated by Zod | accepted |
| ADR-004 | Simulation/presentation split with an event log | accepted |
| ADR-005 | Local-only saves: IndexedDB + export/import, versioned migrations | accepted |
| ADR-006 | CSS Modules + design tokens; no Tailwind, no UI library | accepted |
| ADR-007 | Single package with lint-enforced boundaries (workspace-ready) | accepted |
| ADR-008 | Deterministic schedules from a fixed epoch (banner rotation, resets) | accepted |
| ADR-009 | Gear levelling never fails; cost curve is the sink | accepted |
| ADR-010 | Placeholder model tinting for missing art | accepted |
| ADR-011 | Sans-serif font trio (Alegreya Sans SC / Nunito Sans / Rajdhani), self-hosted | accepted |
| ADR-012 | Seeded RNG everywhere; no `Math.random` in engine | accepted |
| ADR-013 | Tutorial ships last (Phase 14) although listed first in the brief | accepted |
| ADR-014 | All seven finished Epic models are used (roster 23, not 21) | accepted (owner, Q1) |
| ADR-015 | Party size 3 in campaign encounters, 4 in boss encounters | accepted (owner, Q2) |
| ADR-016 | Skill upgrades use Skill Tomes only; duplicates are ordinary copies | accepted (owner, Q8) |
| ADR-017 | Generous energy: +1/min, cap +10 per level, unlimited reward overflow, ~3,000 early provisions | accepted (owner, Q15) |
| ADR-018 | Installable PWA + fullscreen offered at launch, never forced | accepted (owner, Q10, Q27) |
| ADR-019 | In-house generated SFX/VFX allowed alongside owner packs and CC0 sources | accepted (owner, Q24) |
| ADR-020 | All work is pushed directly to `main` | accepted (owner, Q23) |

---

## ADR-001 — React + PixiJS
**Context.** The game is menu-heavy (rosters, gear lists, filters, dialogs) and also needs
animated, particle-rich battles. **Decision.** React owns all screens and HUD; Pixi owns the
battle and summon stages and ambient particle layers. They communicate only via the engine's
events and the store. **Consequences.** Two rendering worlds to keep consistent (tokens are shared
through a generated JSON); excellent DX for menus; battle performance independent of React.

## ADR-002 — Fixed virtual viewport
**Context.** "Must not feel like a web UI." Responsive reflow makes game screens look like
dashboards and multiplies layout work. **Decision.** 1920×1080 virtual canvas scaled uniformly;
letterbox filled with backdrop. **Consequences.** Simpler, pixel-precise layouts matching the
references; small windows scale text down (minimum sizes enforced); mobile is out of scope.

## ADR-003 — Content in TypeScript, validated
**Context.** The owner wants to add champions/items/quests easily and tune balance. **Decision.**
`define*` helpers with full typing and autocomplete; Zod validation with cross-reference checks at
dev boot, in tests and CI. **Consequences.** No separate editor needed for EA-0.1; JSON export
remains possible later; typos are compile/validation errors.

## ADR-004 — Simulation / presentation split
**Context.** ×1–×4 speeds, auto/manual, tests, balance sims, replays. **Decision.** The battle
simulation is a pure step function emitting events; the presenter plays events on a timeline.
**Consequences.** Instant headless battles; no drift between what happened and what is shown;
manual mode is a paused simulation at decision requests.

## ADR-005 — Local saves with export/import
**Context.** No accounts, single player, later Steam. **Decision.** IndexedDB primary store,
rolling backups, `.chronicle` export with checksum, versioned migrations. **Consequences.**
Players own their data; Electron swaps the adapter for file storage; no anti-cheat by design.

## ADR-006 — CSS Modules + tokens
**Context.** Forbidden: generic rounded UI. **Decision.** Hand-written CSS Modules using kit
assets via `border-image`, tokens in CSS variables; Framer Motion for transitions. **Consequences.**
More CSS to write; complete control of the look; no utility-class drift.

## ADR-007 — Single package, enforced boundaries
**Context.** Solo owner + AI agents; future Electron app and editor tools. **Decision.** One Vite
package with `@engine/@content/@state/@ui/@render/@audio/@platform` aliases and lint rules
forbidding upward imports. Extraction to pnpm workspaces is mechanical later. **Consequences.**
Fast iteration now; clean seams preserved.

## ADR-008 — Deterministic schedules
**Context.** No server, but rotating banners and daily/weekly resets are wanted. **Decision.**
Compute rotations from a fixed epoch and the device clock; resets keyed by the local date at
00:00 device time (weekly: the night from Sunday to Monday, 00:00).
**Consequences.** Clock manipulation is possible; accepted for a single-player free game.

## ADR-009 — No gear upgrade failure
**Context.** Reference games use failure chances as a gold sink. **Decision.** Guaranteed
success; steeper cost curve. **Consequences.** Less frustration; gold economy tuned via costs.

## ADR-010 — Placeholder tinting
**Context.** Only seven champion models exist. **Decision.** The lizard model with per-definition
tints/scales and rarity rings until art arrives; the manifest makes swapping a one-line change.

## ADR-011 — Fonts
**Context.** No serif fonts, needs fantasy character. **Decision.** Alegreya Sans SC (display),
Nunito Sans (body), Rajdhani (numerals), self-hosted, OFL.

## ADR-012 — Seeded RNG
**Context.** Reproducible battles, drops and summons for testing and bug reports. **Decision.**
xorshift128+ per subsystem with seeds derived from the save's `seedRoot` and counters.

## ADR-013 — Tutorial last
**Context.** The tutorial must teach every feature interactively; those features are built across
phases. **Decision.** Phase 14 builds the tutorial against the finished feature set; each earlier
phase still ships an in-screen "?" help panel. **Consequences.** New-player flow is validated once
at the end, with a full e2e test.

## ADR-014 — Use all seven Epic models
**Context.** Brief: 5 Epics; assets: 7 finished Epic models. **Decision.** Ship 7 Epics (confirmed by the owner).
Reverting to 5 is a two-line content change (mark two champions `obtain: []`).

## ADR-015 — Party sizes 3 (campaign) / 4 (boss)
**Context.** The owner chose 3-champion campaign parties and 4-champion boss parties (Q2).
**Decision.** `partySize` is a property of the encounter type; the battle engine, setup screen,
presets and balance tables take it from data. Wave sizes were reduced to 2–4 enemies.
**Consequences.** Campaign teams are tighter and more tactical; boss fights reward a wider roster;
per-mode presets avoid confusion; the perf bench uses a 4 v 4 stress encounter above any real one.

## ADR-016 — Skill upgrades via Skill Tomes only
**Context.** The owner chose tomes over duplicates (Q8).
**Decision.** One Rare/Epic/Legendary/Mythic Tome = one upgrade step for a champion of that
rarity; duplicates are ordinary copies usable as rank-up food.
**Consequences.** Tome supply is the pacing lever for skill power (tables in `ECONOMY.md` §3.3);
pulling a duplicate never feels like a lost skill book, and the roster screen needs no
"auto-convert duplicate" flow.

## ADR-017 — Generous energy model
**Context.** The owner wants +1 energy per minute, +10 cap per level and 1,000–3,000 energy over
cap after the tutorial and first quests (Q15).
**Decision.** Cap `60 + 10 × (level − 1)`; regen 1/min below cap; reward overflow unlimited (regen
pauses above cap); Chronicler's Provisions (500 + 4 × 250) plus boosted mission, first-clear and
level-up grants (`ECONOMY.md` §5.1), all listed in `ENERGY_PROVISIONS` for one-place tuning.
**Consequences.** Early sessions are long and satisfying; stage costs stay 4–10 (re-checked by the
Phase 15 economy simulation, Q26); gem refills are a convenience rather than a necessity.

## ADR-018 — Installable PWA and fullscreen offered (never forced) window
**Context.** "It should feel like a real game, not a browser window" (Q10) while staying a
static web build.
**Decision.** `vite-plugin-pwa` with a prompt-style update flow; fullscreen offered on the
first title click (setting, default on) but never forced — declining is remembered and the game
is fully playable windowed (Q27); custom cursor; browser-chrome guards; no responsive
reflow. **Consequences.** Chrome/Edge users get a chrome-free standalone window today; the
Electron build later reuses everything; the service worker must be treated as part of the
release process (`DEPLOYMENT.md`).

## ADR-019 — In-house generated SFX and VFX
**Context.** The owner allows sourcing reputable CC0 assets and generating sounds/effects
in-house (Q24) and supplied SFX, ambience and VFX packs.
**Decision.** Priority: owner assets → generated (`tools/audio`, `tools/vfx` recipes rendered at
build time) → CC0. Every asset is credited in `CREDITS.md`.
**Consequences.** Complete control over the audio-visual language with reproducible outputs;
no unclear licences ever enter the repository.

## ADR-020 — Direct pushes to `main`
**Context.** The owner granted direct pushes (Q23); the brief wants a single branch.
**Decision.** All work is committed to `main` and pushed directly; a harness-forced working
branch is fast-forwarded into `main` before the session ends; never force-push `main`.
**Consequences.** CI on every push keeps `main` deployable; the changelog and roadmap status are
updated in the same commits as the work.

## ADR-021 — Deco frames tinted at runtime; kit textures shipped as WebP
**Context.** The pixel deco frames are ivory sources that must appear in six rarity colours,
gold and ash; shipping tinted copies would multiply 140 files by every colour. The painted kits
are large PNGs (up to 1.5 MB each).
**Decision.** The asset pipeline packs all deco frames into one exact PNG sheet (one request,
decoded once at boot); `useDecoTint` copies a frame into a 96 px canvas, fills it with
`source-in` and caches the data URL per (frame, colour), so tinting is synchronous and frames
never flash their source colour. Painted kit textures are re-encoded as WebP (quality 92, alpha
kept); glyphs are inlined into the generated CSS as data URIs (zero requests) and also emitted as
files for Pixi.
**Consequences.** One asset per frame, any colour for free, ~70 % smaller kit downloads; a new
rarity colour is a token change, not an asset change.

## ADR-022 — Immediate writes for explicit edits and a synchronous unload mirror
**Context.** A debounced IndexedDB autosave can be cut off when the tab is closed or reloaded
within the debounce window; IndexedDB writes issued during `pagehide` are not guaranteed to
commit.
**Decision.** Settings and profile edits bypass the debounce; `pagehide`/`visibilitychange`
additionally write the save synchronously to a localStorage mirror that boot reconciles (newer
mirror wins, written back to IndexedDB, then cleared).
**Consequences.** A changed setting survives an immediate reload; the mirror costs one small
synchronous write per tab hide and is invisible otherwise. Electron later replaces both stores
with file writes behind the same adapter interface.
