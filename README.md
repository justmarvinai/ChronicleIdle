# ChronicleIdle

A 2D pixel-art, dark-fantasy, **turn-based idle gacha champion-collection RPG** for desktop
browsers (and later Steam via Electron). Single player, no accounts, no monetisation.

> Status: **Planning complete and reviewed by the owner (all 24 questions answered) — Phase 0
> (Foundation & Game Shell) starts on the owner's go.**
> See `ROADMAP.md` for the phase plan to Early Access 0.1.

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
| `SUMMONING.md`, `BOSSES.md`, `QUESTS_MISSIONS.md`, `TUTORIAL.md` | `CREDITS.md` — asset provenance and licences |

## Assets

All game art, UI kits, icons, music and design references live in `/game` (owner-provided,
read-only). The build pipeline derives optimised assets from it.

## Quick start (available after Phase 0)

```
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # static output in dist/
```
