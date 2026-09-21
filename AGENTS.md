# AGENTS.md — How to work in the ChronicleIdle repository

Operational guide for any AI agent or contributor. `CLAUDE.md` holds the rules; this file holds
the procedure. Read both before starting.

## 1. Start-of-session checklist

1. Read `CLAUDE.md`, then `ROADMAP.md` to find the current phase and its status line.
2. Read the design doc(s) the phase references (`docs/design/*`) and `docs/tech/ARCHITECTURE.md`.
3. Read `USER_QUESTIONS.md` — answered questions change defaults; unanswered ones have defaults.
4. Read the latest `CHANGELOG.md` entries to learn what shipped last.
5. Run `pnpm install && pnpm typecheck && pnpm test` (after Phase 0) and confirm green before
   changing anything. A red baseline is fixed first and noted in the changelog.

## 2. Phase execution protocol

```
PLAN     → write the phase's task list (screens, engine modules, content, tests) before coding
BUILD    → engine first (with tests), then content, then state, then UI/render, then audio/FX
VERIFY   → run the Definition of Done (below); play the feature in the browser end-to-end
DOCUMENT → CHANGELOG.md entry, a Chronicle of Changes release, ROADMAP.md status line, docs
SHIP     → conventional commit(s), push, tag `0.0.<phase>` (or `0.1.0` for EA-0.1)
CHECK-IN → post summary; ask the owner (optionally) for improvements/bugs before the next phase
```

Never start the next phase while the current one has an open acceptance criterion.

## 3. Definition of Done (every phase)

Feature completeness
- [ ] Every acceptance criterion listed for the phase in `ROADMAP.md` is demonstrated in-game.
- [ ] No placeholder text, no disabled "coming soon" buttons, no console errors or warnings.
- [ ] All new content is data in `src/content/**`, validated by `pnpm content:validate`.
- [ ] New systems are reachable from the hub through real navigation (no dev-only URLs).

Quality
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, `pnpm build` all green.
- [ ] Engine changes have unit tests covering formulas, edge cases and determinism (same seed →
      same events).
- [ ] UI flows that spend/grant currency or mutate roster have interaction tests.
- [ ] Save/load round-trips the new state; a migration exists if the save schema changed; an old
      save from the previous phase loads without data loss (fixture in `tests/fixtures/saves/`).

Game feel
- [ ] Every new screen follows `docs/tech/UI_DESIGN.md` (kit frames, tokens, fonts, motion, sound).
- [ ] Every new interactive element has hover, press, disabled and focus states.
- [ ] Every reward, unlock and level-up has a visible + audible moment.
- [ ] Reduced-motion preference respected for non-battle UI.

Performance
- [ ] Battle at ×4 speed stays within the frame budget (`tools/perf` report attached in the
      changelog entry when battle rendering changed).
- [ ] No new synchronous work > 16 ms on the main thread during play (autosave is deferred).

Documentation
- [ ] `CHANGELOG.md` updated (Added / Changed / Fixed / Balance).
- [ ] The **Chronicle of Changes** has a release for this version in `src/content/changelog/`, with
      its strings in `src/i18n/en/changelog.ts` — one short player-facing sentence per change
      (`CLAUDE.md` §9.3). This is what the player reads on the title screen; `CHANGELOG.md` is not.
- [ ] `ROADMAP.md` phase status set to `✅ shipped in x.y.z`.
- [ ] Any new tunable documented in the relevant `docs/design/*.md` table.
- [ ] Any new question added to `USER_QUESTIONS.md` with its default.

## 4. Adding content — quick recipes

| I want to add… | Do this | Reference |
| --- | --- | --- |
| a line in the player's changelog | a `release(...)` at the top of `src/content/changelog/index.ts` plus its strings in `src/i18n/en/changelog.ts`; **required for every shipped version** | `docs/tech/CONTENT_AUTHORING.md` §13, `CLAUDE.md` §9.3 |
| a champion | `src/content/champions/<id>.ts` with `defineChampion`, abilities via the effect DSL, add sprite/avatar to `/game/assets/champions/<id>` (or use placeholder), run validate | `docs/tech/CONTENT_AUTHORING.md` §2 |
| an ability effect that does not exist | add a new effect type in `src/engine/battle/effects/`, register in the effect resolver, write tests, document in `docs/design/BATTLE.md` §6 | `docs/design/BATTLE.md` |
| an enemy | `src/content/enemies/<id>.ts` with `defineEnemy` (archetype + stat curve + abilities) | `docs/design/CAMPAIGN.md` §5 |
| a settlement / stages | `src/content/stages/<nn>_<slug>.ts` with waves, drop table, star rules | `docs/design/CAMPAIGN.md` |
| a period boss (daily / weekly) | `src/content/bosses/<slug>.ts` with `defineBoss` — one kit, the tier table exactly as the design prints it, the chest ladder, `enrageEvery`, and for a boss that changes gear `phases`, `adds` and an `addStats` row per tier — plus `bosses/index.ts` and its strings in `src/i18n/en/bosses.ts`; the tier enemies, the escort's definitions and their encounters are derived | `docs/tech/CONTENT_AUTHORING.md` §3.2, `docs/design/BOSSES.md` |
| floors in the Eternal Tower | nothing is authored: raise `TOWER_FLOORS` in `src/content/balance/tower.ts` and the floors exist, because everything a floor fields and pays is a function of its number. Deeper rows in `TOWER_SHARD_ODDS` are optional — floors above its last row keep that row's odds | `docs/tech/CONTENT_AUTHORING.md` §3.3, `docs/design/ETERNAL_TOWER.md` |
| a hall or stage in the Brewery | a row per element in `HALL_FACTIONS` (`src/content/brewery/index.ts`) naming which settlement's faction holds each stage, plus the hall's name and blurb in `src/i18n/en/brewery.ts`; every number (scale, brews, guards, level, turn limit) and the calendar live in `src/content/balance/brewery.ts`, and the fight itself is derived from the faction. The validator refuses a stage whose faction is not the hall's element | `docs/tech/CONTENT_AUTHORING.md` §15, `docs/design/BREWERY.md` |
| a node in the Glorious Palace | a row in `RING_TEMPLATE` (`src/content/palace/index.ts`) — it is stamped into all four branches — plus its name in `src/i18n/en/palace.ts` and its glyph in `src/ui/screens/palace/palace-icons.ts` if the name is new, and the matching figure moved in `PALACE_BRANCH_TOTALS`; the validator checks the branch still costs `PALACE_BRANCH_COST` and adds up | `docs/tech/CONTENT_AUTHORING.md` §14, `docs/design/GLORIOUS_PALACE.md` |
| a gear set | `src/content/sets/<slug>.ts` with the `set()` helper (2-piece / 4-piece bonus written as a passive), add it to `sets/index.ts`, its two i18n keys and every home settlement's `setPool` | `docs/tech/CONTENT_AUTHORING.md` §5, `docs/design/GEAR.md` §5 |
| a currency | `src/content/currencies/index.ts` + icon manifest key | `docs/design/ECONOMY.md` §2 |
| a quest | a `quest()` in `src/content/quests/daily.ts` or `weekly.ts` (slug, glyph, goal, points, rewards, and the `feature` it needs) plus its line in `src/i18n/en/quests.ts`; keep the board at 100 points — the validator checks that at every unlock level, replacement included | `docs/tech/CONTENT_AUTHORING.md` §8, `docs/design/QUESTS_MISSIONS.md` §2–§3 |
| a goal type that does not exist | add it to `Goal` (`content/quests/types.ts`), evaluate it in `engine/quests/goals.ts` with a test, and — for a counter goal — name its counter in `COUNTER_KEYS` and bump it from the reducer that owns that play | ADR-040, `docs/design/QUESTS_MISSIONS.md` §1 |
| a mission | a `mission()` in `src/content/missions/chapter_<nn>.ts` (goal, rewards, and a glyph only when the family's own is wrong) plus its line in `src/i18n/en/missions.ts`; twelve per chapter, and position decides the id and the key | `docs/tech/CONTENT_AUTHORING.md` §8, `docs/design/QUESTS_MISSIONS.md` §4 |
| a tutorial lesson | a `step()` in `src/content/tutorial/<chapter>.ts` (when it opens, what it points at, what finishes it) plus its line in `src/i18n/en/tutorial.ts`; a new spotlight means one name in `TUTORIAL_TARGETS` and one selector in `@ui/tutorial/targets.ts` — never a change inside a screen | `docs/tech/CONTENT_AUTHORING.md` §8, ADR-042 |
| a banner or a featured rotation | `src/content/banners/<slug>.ts` (`kind`, `shards`, and for a featured banner an appended `rotations` row: one Legendary + two Epics, plus `mythic` on a Primordial Rotation), add it to `banners/index.ts` and its two i18n keys; rates and mercy stay in `balance/summon.ts` | `docs/tech/CONTENT_AUTHORING.md` §8, `docs/design/SUMMONING.md` §3 |
| a champion the player may *choose* as a reward | a row in `CHAMPION_CHOICES` (`balance/campaign.ts`): the difficulty whose mastery owes it, the rarity, and an i18n key for where it came from | `docs/tech/CONTENT_AUTHORING.md` §8, ADR-032 |
| an idle-chest reward | edit `src/content/balance/idle.ts` (capacity bands, per-hour yields, the chance rolls and their per-fill caps); the engine tests check the table and the caps | `docs/design/ECONOMY.md` §6 |
| a craft tier or forge cost | edit `src/content/balance/forge.ts` (materials, gold, rarity/star weights, set pool); the 10k-craft test guards the bands | `docs/design/GEAR.md` §6 |
| a balance tweak | edit `src/content/balance/*.ts`, run `pnpm sim:balance`, note in CHANGELOG "Balance" | `docs/design/*` tables |
| a sound | owner file under `/game/assets/music_and_sounds/**` or a synth recipe in `tools/audio/recipes/`; map a key in `src/audio/registry.ts`; add a credits row | `docs/tech/ASSETS.md` §2, `docs/tech/UI_DESIGN.md` §7 |
| a visual effect | owner sheet under `/game/assets/music_and_sounds/vfx/**` or a procedural recipe in `tools/vfx/recipes.ts`; register in `src/render/battle/fx/registry.ts`; add a credits row | `docs/tech/UI_DESIGN.md` §6.3 |

## 4.1 A fixture must be able to do what its chronicle has done

A save fixture describes a player at a point in the game, and every screen reads it. `path.chronicle`
claimed six chapters of the Path and 24 crafts in its counters while carrying no Scrap Iron — so the
Forge's Strike button was disabled, and a walkthrough that tried to craft waited on it forever.

When you write or borrow a fixture, check the *verbs* the spec will use against the purse, the
roster and the inventory it is given: a spec that crafts needs materials, one that pours brews needs
brews, one that summons needs shards. `pnpm test:e2e` failing with a timeout on a visible, enabled-
looking control is almost always this.

The related trap: Playwright's action timeout is capped in `playwright.config.ts` precisely so this
fails in fifteen seconds instead of consuming the test's whole budget. Do not remove it.

## 5. Never do

- Never modify files under `/game` (generate derived assets into `public/assets/generated`).
- Never use `Math.random()` or `Date.now()` in `src/engine`.
- Never special-case a champion, item or stage by id in engine or UI code.
- Never ship a screen without a backdrop, motion and kit chrome.
- Never use a serif font, a `border-radius` pill, a default browser control or an unstyled scrollbar.
- Never add PvP, social, account or payment code paths "for later".
- Never skip or weaken a failing test to get green.
- Never force-push `main`; never create long-lived branches — work lands on `main` (fast-forward a
  harness-assigned working branch into `main` before the session ends).
- Never add an asset without a `docs/tech/CREDITS.md` row (owner-provided, CC0 source, or generated in-house).
- Never leave a phase half-done because it was "mostly working".

## 6. Asking the owner

Write questions into `USER_QUESTIONS.md` under the correct section with:
`Q<id>`, the question, why it matters, the default you are proceeding with, and what would change
if answered differently. Keep coding under the default. When the owner answers, move the entry to
the "Answered" section, update the affected docs and content, and note it in the changelog.

## 7. Session end

Before ending any session: all work committed with conventional messages, pushed to `main`
(and to any harness-assigned branch), `CHANGELOG.md` and `ROADMAP.md` status current, and a final message that states what was
done, what is verified, and what is next.
