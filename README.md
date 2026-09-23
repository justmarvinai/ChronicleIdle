# ChronicleIdle

A 2D pixel-art, dark-fantasy, **turn-based idle gacha champion-collection RPG** for desktop
browsers (and later Steam via Electron). Single player, no accounts, no monetisation.

> Status: **`0.9.4` — Every Mark in Its Place.** Early Access 0.1 shipped as `0.1.0`
> with all fifteen phases in: the game shell, 23 champions, deterministic animated battles, the
> twelve-settlement campaign, chronicle levels and titles, the Tavern, gear and its fourteen sets,
> the Forge, the Portal, the idle chest, the two period bosses, quests, the Chronicler's Path and
> the tutorial. Since then, one feature a minor version: the Eternal Tower (`0.2.0`), the Chronicle
> of Changes (`0.5.0`), the Glorious Palace (`0.6.0`), the Brewery (`0.7.0`), the Dungeons
> (`0.8.0`) and the Market, the Bag, the three boosts and the thirty-day Daily Rewards calendar
> (`0.9.0`) — and the patches since, from the owner's play: every gear piece painted and every set
> given its emblem (`0.9.3`), then gear tooltips, a rebuilt Champions overview and every drop list
> shown by its marks (`0.9.4`). See `ROADMAP.md` for what is planned and `CHANGELOG.md` for what
> landed.

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
| `ECONOMY.md` — 25 currencies, energy, player level, idle chest | `DECISIONS.md` — architecture decision records |
| `MARKET.md` — the two shelves, the consumables, the boosts, the Bag | `CREDITS.md` — asset provenance and licences |
| `LOGIN.md` — Daily Rewards: thirty days, and no streak | |
| `DUNGEONS.md`, `BREWERY.md`, `GLORIOUS_PALACE.md`, `ETERNAL_TOWER.md` | |
| `SUMMONING.md`, `BOSSES.md`, `QUESTS_MISSIONS.md`, `TUTORIAL.md` | |

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
