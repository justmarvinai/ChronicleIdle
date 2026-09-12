# Changelog

All notable changes to ChronicleIdle are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow `CLAUDE.md` §9.3
(`0.0.<phase>` during development, `0.1.0` = Early Access 0.1).

## [Unreleased]

_Nothing yet — Phase 1 (Champions & Collection) starts after the owner's Phase 0 check-in._

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

