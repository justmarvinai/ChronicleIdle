# ChronicleIdle

A 2D pixel-art, dark-fantasy, **turn-based idle gacha champion-collection RPG** for desktop
browsers (and later Steam via Electron). Single player, no accounts, no monetisation.

> Status: **`0.0.9` — Phase 9 (Idle Chest) shipped.** Phases 0–9 are in: the game shell, the
> roster of 23 champions, deterministic animated battles, the twelve-settlement campaign,
> chronicle levels and titles, the Tavern, gear with its fourteen sets, the Forge that crafts,
> breaks and refines it, the Portal — four shards, mercy, a fourteen-day featured rotation and the
> full reveal ritual — and the chest at the docks that fills while the game is closed.
> See `ROADMAP.md` for the phase plan to Early Access 0.1 and `CHANGELOG.md` for what landed.

## Documents

| Start here | |
| --- | --- |
| `CLAUDE.md` | Engineering constitution: stack, architecture rules, coding standards, workflow |
| `AGENTS.md` | How to work in this repo: phase protocol, definition of done, recipes |
| `ROADMAP.md` | Phases 0–15 to EA-0.1, then the backlog |
| `USER_QUESTIONS.md` | Open questions for the owner with the defaults in use |
| `CHANGELOG.md` | History |

| Design (`docs/design/`) | Tech (`docs/tech/`) |
| --- | --- |
| `GAME_DESIGN.md` — vision, pillars, canon, unlock map | `ARCHITECTURE.md` — runtime, engine, state, saves, rendering |
| `CHAMPIONS.md` — rarities, stats, the 23-champion roster with kits | `UI_DESIGN.md` — tokens, components, every screen, animation |
| `BATTLE.md` — turn meter, formulas, statuses, effect DSL, AI | `CONTENT_AUTHORING.md` — how to add champions, stages, sets… |
| `CAMPAIGN.md` — 12 settlements × 10 stages × 3 difficulties | `ASSETS.md` — inventory of `/game`, usage map, pipeline |
| `GEAR.md` — slots, stars, stats, 14 sets, crafting | `DEPLOYMENT.md` — Ubuntu VPS (nginx) and Vercel |
| `ECONOMY.md` — 24 currencies, energy, player level, idle chest | `DECISIONS.md` — architecture decision records |
| `SUMMONING.md`, `BOSSES.md`, `ETERNAL_TOWER.md`, `QUESTS_MISSIONS.md`, `TUTORIAL.md` | `CREDITS.md` — asset provenance and licences |

## Assets

All game art, UI kits, icons, music and design references live in `/game` (owner-provided,
read-only). The build pipeline derives optimised assets from it.

## Quick start

```
pnpm install
pnpm dev                    # derives assets from /game, then Vite on http://localhost:5173
pnpm build && pnpm preview  # production build in dist/, served on http://localhost:4173
pnpm test                   # engine, content, state, platform and UI unit tests
pnpm test:e2e               # Playwright suite against the production build (run pnpm build first)
```

Open `/?screen=devkit` for the component gallery. Saves live in the browser (IndexedDB) and can
be exported/imported as `.chronicle` files from Settings → Save data.
