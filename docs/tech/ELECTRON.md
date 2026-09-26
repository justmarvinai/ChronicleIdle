# ELECTRON.md — ChronicleIdle as a Windows desktop game

**Status: plan only.** The owner asked (26 September 2026) for a `production` branch holding the
whole game and for the Electron work to be planned in phases — and for **no Electron code to be
written until the owner says go**. This document is that plan. Phase D0 (the branch and this plan)
is done; D1 starts on the owner's word. Every open decision is in `USER_QUESTIONS.md` (Q63–Q71)
with the default this plan uses until it is answered.

## 1. What "a real Windows game" means here

When the desktop build is finished, a player on Windows:

- installs it like any game — from Steam, or from an installer — and starts it from the Start
  menu, the desktop or their Steam library, with the game's own icon on the taskbar;
- gets a game window, not a browser: no address bar, no browser menu, no zoom, no reload, no
  "install this app" prompts; fullscreen or windowed, remembered between sessions; a **Quit**
  button, because a desktop game is left through the game;
- keeps their chronicle as files in their own user folder (`%APPDATA%\ChronicleIdle\saves`),
  backed up, exportable, synced by Steam Cloud when bought on Steam;
- needs no network at all, and nothing leaves the machine (CLAUDE.md §2.11);
- plays **the same game** as the web build — same content, same saves format, same numbers — at
  the same performance budgets (CLAUDE.md §5.6).

## 2. Branches

| Branch | Holds | Receives |
| --- | --- | --- |
| `main` | The game and its web build (PWA on the VPS / Vercel). Every game feature lands here first. | Game work, as today |
| `production` | `main` + the desktop shell: `electron/`, the packaging config, the Windows CI job, Steam | Merges from `main`, and desktop-shell work |

- `production` was created from `main` at the commit that added this plan (0.13.1 + D0). It is
  long-lived by the owner's decision (CLAUDE.md §9.4).
- **One direction.** `main` is merged into `production` (a merge commit, never a rebase or a
  force-push) after each game release; `production` is never merged into `main`.
- **Seams go to `main` first.** Anything the desktop needs *inside the game* — choosing an adapter
  when a desktop bridge is present, the bridge's TypeScript interface, a "Quit" action that the web
  build hides — is written platform-neutrally and lands on `main`, inert in the browser and loaded
  behind a dynamic import so the web bundle does not grow. `production` then only *adds* files
  (`electron/`, `electron-builder.yml`, the Windows workflow), so the merges from `main` stay free
  of conflicts and the game code never forks.
- **Versions.** A desktop build carries the version of the game it wraps (`package.json`). A fix
  that only concerns the desktop shell ships from `production` with a fourth figure
  (`0.14.0.1`) — the Chronicle of Changes already reads four-figure releases (`0.0.2.1`,
  `0.0.9.1`) — and its release is written in the Chronicle on `production` only, where desktop
  players read it (Q63).

## 3. How the desktop build is put together

### 3.1 Three processes

```
┌──────────────── Electron main process (Node, electron/main) ────────────────┐
│ app lifecycle · single-instance lock · the game window · app:// protocol    │
│ save files (D3) · display modes (D2) · native dialogs · Steam (D5)          │
└───────────────▲─────────────────────────────────────────────────────────────┘
                │ IPC: a small, typed contract (electron/shared); main checks
                │ every message against its Zod schema
┌───────────────┴──────── preload (electron/preload, contextBridge) ──────────┐
│ window.chronicleDesktop — the only door between the game and the machine   │
└───────────────▲─────────────────────────────────────────────────────────────┘
┌───────────────┴──────── renderer: the game, unchanged (dist/) ──────────────┐
│ React + Pixi + the engine; src/platform picks desktop adapters when the     │
│ bridge exists, browser adapters when it does not                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Loading the game

The window loads the built game from a privileged custom protocol, **`app://chronicle/`**, whose
handler serves the packaged `dist/` out of the app archive:

- a **stable origin**, so IndexedDB and `localStorage` survive updates and reinstalls (a
  `file://` page has no stable origin; a localhost server risks port clashes and firewall prompts);
- the build's absolute URLs (`/assets/generated/…`) resolve unchanged, with correct MIME types and
  range requests for the audio;
- the handler sets the Content-Security-Policy: the game loads nothing from anywhere else.

### 3.3 What changes inside the game

Everything platform-specific already sits behind `src/platform/` (ARCHITECTURE.md §10), and no Node
API is used anywhere in `src/`. The desktop build swaps adapters; it rewrites no screen.

| Seam | Browser (today) | Desktop | Phase |
| --- | --- | --- | --- |
| `StorageAdapter` (`platform/storage.ts`) | IndexedDB + an unload mirror in `localStorage` | IndexedDB under `app://` in D1; **save files** via the bridge from D3 | D1, D3 |
| Window (`platform/window.ts`) | Fullscreen API, offered on the first title click | The window's own modes: windowed / fullscreen, remembered, F11 and Alt+Enter | D2 |
| Files (`platform/files.ts`) | Download link / file input | Native *Save as* and *Open* dialogs | D3 |
| PWA (`platform/pwa.ts`) | Service worker, "update available" banner | None — the build is the update unit; no service worker is registered | D1 |
| Input guards (`app/inputGuards.ts`) | Context menu, zoom, selection, back keys | Kept; the main process also removes the menu and blocks reload, zoom and devtools in release builds | D1 |
| Audio (`src/audio`) | Waits for the first click (autoplay policy) | Music from the first frame of the title screen | D1 |
| Title screen | *Fullscreen* toggle in the foot | *Quit* on the title and in Settings; the Display tab replaces the toggle | D2 |

### 3.4 Security baseline

Taken from Electron's security checklist and applied from the first build (D1): context isolation
on, the renderer sandboxed, no Node integration, web security on, no remote content, navigation
and `window.open` blocked (the few external links — credits, licences — open in the system browser
from an allowlist), every permission request denied except fullscreen, devtools only in development
builds, and the Electron fuses that turn off running as plain Node, `NODE_OPTIONS`, the inspector
flags, and loading the app from anywhere but its own archive.

### 3.5 Layout on `production`

```
electron/
  main/        app lifecycle, the window, the app:// protocol, IPC handlers,
               saves (D3), display (D2), steam (D5)
  preload/     the bridge (contextBridge → window.chronicleDesktop)
  shared/      the IPC channel names and the Zod schemas every message is checked against
  build/       icon, installer artwork
electron-builder.yml
.github/workflows/desktop.yml   (D4)
```

The bridge's TypeScript interface is declared once, in `src/platform/` on `main` (a seam, §2);
`electron/preload` implements it, and `electron/` imports nothing else from `src/`.

Tooling: the current stable Electron when D1 starts, pinned exactly; main and preload compiled by a
small build step of their own; the renderer is today's `pnpm build`. Packaging with
**electron-builder** — an NSIS installer and the unpacked folder Steam uploads as its depot.
Lint boundaries grow one rule: `electron/` imports `electron/shared` and the bridge's interface,
never the game. New scripts: `desktop:dev` (the Vite dev server inside an Electron window, reloading
as today), `desktop:build`, `desktop:pack`, `test:desktop`.

## 4. The phases

Every phase ships to the same Definition of Done as a game phase (`AGENTS.md` §3): working end to
end in the desktop build, tested, documented, with its release in the Chronicle of Changes — a
phase is one finished feature, never a skeleton. Each one is a desktop build on `production`.

| Phase | Deliverable | Needs from the owner |
| --- | --- | --- |
| **D0** | The `production` branch and this plan | ✅ done |
| **D1** | **The game in its own window** — the Electron shell | The go |
| **D2** | **Display and window** — modes, memory, Quit | Q68, Q71 |
| **D3** | **Saves on disk** — files, backups, dialogs, web-save import | Q67 |
| **D4** | **The Windows build** — installer, Steam folder, icon, CI | Q64, Q66 |
| **D5** | **Steam** — achievements, overlay, cloud, presence | Q65 (App ID) |
| **D6** | **Release readiness** — hardware QA, updates outside Steam, first public build | Q64, Q66 |

### D1 — The game in its own window

- The main process: single-instance lock, one game window (dark background from the first pixel,
  shown when ready so nothing flashes white), no menu bar, zoom locked, the `app://` protocol, the
  security baseline of §3.4.
- The preload bridge with its first calls: app version, platform, quit.
- In the game: the bridge is detected at boot; the service worker, the install and update banners
  are skipped; music starts on the title without a click.
- `pnpm desktop:dev` and an unpacked Windows build from `pnpm desktop:build`.
- Tests: Playwright's Electron driver boots the unpacked build, starts a chronicle, plays the first
  stage, restarts the app and finds the chronicle — the same save format, the same screens.
- **Accepted when** the whole game — tutorial, battles, every mode — plays in the desktop window
  exactly as in the browser, and a restart keeps the chronicle.

### D2 — Display and window

- A **Display** tab in Settings: *Windowed* / *Fullscreen* (borderless), *Start in fullscreen*,
  and the window's size and position remembered across sessions (and put back on screen if a
  monitor is gone). F11 and Alt+Enter toggle. Minimum window 1280 × 720, the 16:9 stage scaling as
  today (UI_DESIGN.md §2).
- While the window is minimised the game behaves as the browser does when its tab is hidden:
  drawing stops, and everything that runs by the clock — energy, the Idle Chest, the Mine — keeps
  accruing as always (Q71).
- `platform/window.ts` maps to the window through the bridge; the title's first-click fullscreen
  offer becomes the *Start in fullscreen* setting.
- **Quit**: a plate on the title screen and a button in Settings, both saving first; Alt+F4 and
  the window's close button save too.
- The tutorial and UI_DESIGN.md follow any control that moves (the owner's standing instruction).
- **Accepted when** every mode switch keeps the stage sharp and centred, the window reopens where
  it was left, and quitting from anywhere never loses a second of play.

### D3 — Saves on disk

- A file `StorageAdapter` over the bridge: the chronicle in
  `%APPDATA%\ChronicleIdle\saves\current.chronicle` — the checksummed format the export already
  writes, so a damaged file is caught rather than loaded — written atomically (write, flush,
  rename), the rolling backups of ARCHITECTURE.md §4.2 beside it, and the unload write done by the
  main process so closing the window can never tear a save.
- Moving house: on its first run with file saves, the desktop build moves a chronicle it finds in
  its own IndexedDB (from D1–D2 builds) into files, once, keeping the old copy as a backup. A
  chronicle from the **web** version comes across through the existing Export / Import (`.chronicle`
  files) — the first launch offers it.
- Native *Export* and *Import* dialogs; an *Open saves folder* button in Settings → Save data.
- **Accepted when** killing the process mid-autosave loses at most the last autosave interval,
  backups restore, and a web chronicle imported on the desktop plays on.

### D4 — The Windows build

- electron-builder: a per-user NSIS installer (no administrator prompt; Start menu and desktop
  shortcuts; uninstalling keeps the saves) and the unpacked folder that becomes the Steam depot.
- The icon from the logo mark at every Windows size, the file's product name, company and version,
  the taskbar identity, the Electron fuses flipped at pack time.
- CI: a `windows-latest` job on `production` builds both targets, runs the Electron smoke suite
  against the packaged app and keeps the installer as a build artifact.
- Budgets: about 120 MB to download and 250 MB installed, measured here and then held.
- **Accepted when** a clean Windows machine installs, plays, updates in place and uninstalls, and
  the chronicle survives all three.

### D5 — Steam

- A maintained Steamworks binding in the main process, only when the build is a Steam build; the
  game runs identically without Steam.
- **Achievements**: the Hall of Deeds mirrored — a data table on `production` maps each
  achievement tier and challenge to a Steam achievement, validated like any content; unlocking in
  the Hall unlocks on Steam, and a chronicle's existing deeds are reported on first launch.
- The Steam overlay working in the game window; rich presence ("In the Unwritten — Omen 7").
- **Steam Cloud** by Auto-Cloud on the saves folder: no code, configured in Steamworks.
- **Accepted when** a Steam build launched from the Steam client unlocks achievements, shows the
  overlay and carries a chronicle between two PCs.

### D6 — Release readiness

- Hardware QA on real Windows machines: an Iris Xe-class iGPU at the §5.6 budgets, 100 / 125 /
  150 % display scaling, two monitors, a laptop on battery, a GPU that falls back to software.
- Outside Steam (if chosen, Q64): signed installers (Q66) and in-app updates from GitHub Releases.
- Crash handling that stays on the machine: a local crash dump and the existing *Export save* panel
  — nothing is sent anywhere.
- The first public desktop release, and the Chronicle's first desktop entry.

## 5. Testing

- **Both suites on `production`:** the web suite unchanged (the game is the same game), plus
  `test:desktop` — Playwright driving the real Electron app: boot, new chronicle, restart with the
  save, display modes (D2), save files and backups (D3), the packaged app (D4).
- **Main-process units** in Vitest: the save store against a temporary folder (atomic writes,
  torn-write recovery, backup rotation), the IPC contract rejecting malformed messages, the
  window-state memory.
- The gate on `production` is today's gate plus `desktop:build` and `test:desktop`.

## 6. Risks and how each is met

| Risk | Answer |
| --- | --- |
| `main` and `production` drift apart | Seams land on `main` first (§2); `production` only adds files; `main` is merged after every release |
| A save lost between IndexedDB and files | D3 moves it once, keeps the old copy as a backup, and is tested against real v22 fixtures |
| The Steam overlay does not draw over the game | Known Electron limitation with a known set of GPU switches; D5 tests it on real hardware before it is accepted |
| WebGL refused on an old or blocklisted GPU | D6 runs the budgets on such a machine; Chromium's software renderer is the floor, and `perf:battle --software` already measures it |
| Windows SmartScreen warns on an unsigned installer | Steam builds are not affected; installers outside Steam are signed before they are public (Q66) |
| An antivirus false positive on the installer | Signed builds and a clean electron-builder NSIS; reported to vendors if it happens |

## 7. What the owner decides

Q63–Q71 in `USER_QUESTIONS.md`: how the two branches share work and versions, where the game is
sold, the Steam App ID, code signing, where saves live and sync, the window on first launch,
whether the web build stays live, which platforms follow Windows, and what a minimised window does.
Each carries the default this plan proceeds with, so none of them blocks D1.
