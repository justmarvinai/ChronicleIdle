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
| ADR-018 | Installable PWA + fullscreen-first game window | accepted (owner, Q10) |
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
