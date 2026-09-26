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

## ADR-023 — Champion kits are authored through a small DSL and described from their effects
**Context.** Twenty-three champions with two to four abilities each, all authored before the
battle engine exists (Phase 2), must be validated now and must never drift from what their
descriptions claim. Raw effect objects are verbose and easy to get subtly wrong (a missing
`chance`, a status without a duration).
**Decision.** `src/content/champions/dsl.ts` exposes builders (`hit`, `status`, `heal`, `cleanse`,
`strip`, `tm`, `revive`, `extraTurn`, `leech`, `when`, `up.*`) that return plain `Effect` values;
`defineChampion` derives ids, i18n keys and defaults. Descriptions never hard-code numbers that
the effects already carry: the engine computes them (`abilityNumbers`, `passiveNumbers`) with the
instance's upgrades folded in, and the content test renders every description to prove no token
is left unresolved. Content folders list their objects in an explicit `index.ts` rather than a
Vite glob so `tools/` scripts and Vitest load the same modules.
**Consequences.** A new champion is one data file plus strings; a new mechanic is a new effect
kind in the engine (with tests) before it can be used from data; descriptions stay truthful when
balance numbers change.

## ADR-024 — The battle controller holds the fight until a stage presenter attaches; the HUD shows the presented view
**Context.** The battle screen mounts its Pixi stage asynchronously (atlases, FX sheets). The
controller pumps `step()` with back-pressure from whatever presenter is attached, and the default
is the instant presenter for tests and headless runs. Started in auto mode, a fight therefore
resolved completely before the stage existed and the screen opened on a finished battle; in
manual mode the enemies' opening turns were skipped visually. Separately, a HUD that read the
simulation directly would show HP dropping before the hit landed on stage.
**Decision.** `start()` takes `awaitPresenter`; the UI flow sets it and the pump stays armed
only once a presenter attaches (or the stage fails and the screen attaches the instant presenter
explicitly). The session store holds the *presented* view, folded from events as the presenter
lands them, never a snapshot of the live state; the engine's `wave.started` event carries the
spawned units so the fold needs nothing from the simulation.
**Consequences.** Tests keep starting instantly; the screen is always consistent with what is on
stage; a presenter that never attaches (WebGL unavailable) degrades to an unanimated fight
instead of a stuck one.

## ADR-025 — Missing effects are generated flipbooks rendered at build time, and dev screens ride the query string
**Context.** The owner's two VFX packs cover element casts and hits but not slashes, sparks,
rune rings, smoke or speed lines; the owner allows in-house generation (`CLAUDE.md` §2.6). The
frame budget must be measured on the real battle screen at ×4, a speed the UI locks until the
Phase 3 unlocks.
**Decision.** `tools/vfx` paints flipbooks deterministically from recipes and renders them through
the asset pipeline as `fx.gen.*` strips with the same manifest shape as the packs, so the runtime
does not care where a sheet came from. The perf bench is a code-split `perf` screen reachable only
through `?screen=perf`, like the DevKit gallery: it starts a `bench`-kind encounter (never listed
in-game) through the normal controller with `speed: 4` and returns to the perf screen with the
stage's frame statistics; `pnpm perf:battle` drives it headlessly.
**Consequences.** New shapes are recipes plus a registry line; the bench measures exactly what
players see; `bench` encounters and the perf route exist in production builds but are unreachable
from the game's navigation.

## ADR-026 — Set bonuses are passives, and gear stats are computed twice for two different callers
**Context.** The fourteen sets (`GEAR.md` §5) change stats, heal on a hit, counterattack, shield a
wave and stun — most of which the battle engine already does for champion passives. Meanwhile the
screens have to show a champion's real numbers, including set bonuses, where no battle exists.
**Decision.** A set is data written in the champions' own `PassiveDef` shape
(`src/content/sets/*.ts`), and the engine learned only the two mechanics it was missing
(`lifesteal`, `counterattack`); `setPassives(worn, setById)` hands a unit its sets' passives at
battle creation, one copy per complete group with its own id. Stats are therefore computed two
ways on purpose: `gearedStats` (base + the pieces) builds battle units, because the battle applies
each set's `stat_mod` through the passive engine like any other passive, and `totalStats`
(+ set bonuses) is what the screens show.
**Consequences.** A new set is content, not code, as long as its mechanic exists; a set needing a
new mechanic adds an effect kind with tests, never a special case. The two stat functions must
stay in step — the doc comment on each says which caller it is for, and `gear-battle.test.ts`
proves a set's stat bonus lands exactly once in a real fight.

## ADR-027 — A piece's power is measured against a fixed reference champion
**Context.** The Armoury sorts by power, but half of what gear carries is a percentage of a
champion's base stats. A piece has no power of its own.
**Decision.** `piecePower` applies the piece to `GEAR_POWER_REFERENCE`
(`src/content/balance/gear.ts`) — one imaginary mid-campaign champion — and reports the
difference. It is a yardstick for ordering an armoury, never a promise about a particular
champion; the compare panel, which does have a champion, uses `totalPower` instead.
**Consequences.** The racks keep a stable order as the selection changes, and flat and percentage
rolls are comparable. The reference is a balance number with a comment, so re-weighting how
percentage rolls look is a one-line change (`USER_QUESTIONS.md` Q37).

## ADR-028 — A craft is a drop with a narrower band
**Context.** Crafting could have had its own roller — its own main-stat weights, its own substat
ranges — and `GEAR.md` §6 only fixes the rarity and star bands per tier.
**Decision.** `craftGear` calls the same `generateGear` a campaign drop calls, passing the tier's
rolled rarity, its rolled star and the set (the Sigil's choice or a roll on the tier's pool). The
tier decides *nothing* else.
**Consequences.** "Crafted gear rolls exactly like a drop" is true by construction rather than by
two tables being kept in step, and the Phase 6 generator tests cover the crafted piece too. A
future tier that must roll differently needs a new argument on the generator, not a second roller.

## ADR-029 — A dismantle is all or nothing
**Context.** A multi-select can contain a piece that must not be broken — one somebody is wearing,
or one the player locked. Breaking the rest and skipping those would be the forgiving behaviour.
**Decision.** `planDismantle` refuses the entire selection and names the offending piece; the UI
never offers a protected piece in the first place, so the refusal is a guard, not a workflow.
**Consequences.** A press either does exactly what the preview said or nothing at all. The player
never has to work out which half of a selection went, which is the one mistake a scrap heap cannot
undo.

## ADR-030 — A guarantee replaces the result, never the roll
**Context.** Mercy can decide a pull's rarity before the dice are thrown (`SUMMONING.md` §2). The
obvious implementation skips the rarity roll when a guarantee is owed.
**Decision.** `summonOne` always draws the weighted rarity roll and then overrides the *result*
when a hard guarantee is owed.
**Consequences.** The seeded stream advances identically whether mercy fired or not, so a pull
replays exactly from a save and a seed, and a ×10 cannot diverge from the run that produced it.
The cost is one wasted draw per merciful pull, which is nothing.

## ADR-031 — A soft climb is paid for by the commonest rarity
**Context.** A soft pity adds percentage points to a rarity (`+1 pp per pull past 100`). Adding
them to the row makes it sum to more than 100, and the other rarities' shares then depend on how
the weighted roll normalises — a silent rate change nobody authored.
**Decision.** `rarityWeights` takes the climb out of the commonest rarity on the row, capped at
what that rarity has to give.
**Consequences.** Every row always sums to 100, the doc's table is the whole truth about a shard,
and a long dry streak trades commons for the rarity it owes rather than inflating the shard.

## ADR-032 — Champion choices are derived, and only the taking is stored
**Context.** Mastering a difficulty owes a champion of the player's choosing (`CAMPAIGN.md` §7).
Storing "you are owed one" in the save would mean writing it at the moment of mastery — which a
chronicle that mastered Intro before the Portal existed never got.
**Decision.** `CHAMPION_CHOICES` names the entitlement (difficulty, rarity, reason);
`openChoices(progress, taken)` derives what is owed from the campaign's stars, and the save stores
only `summon.choices` — which choice became which copy.
**Consequences.** Every chronicle that has mastered Intro is owed its Epic the moment the Portal
opens, a claim is idempotent by construction, and no migration had to guess at past play. Later
choice-granting rewards are one row in the table (CLAUDE.md §5.5).

## ADR-033 — The Idle Chest is a timestamp, not an accumulator
**Context.** The chest earns rewards per hour, online and offline. The obvious implementation adds
what is owed to the save on a timer and on load.
**Decision.** The save stores only `idle.lastClaimAt`. Fill, capacity, hours held and the whole
payout are derived from that instant and the clock; `applyOfflineElapsed` deliberately ignores the
chest.
**Consequences.** There is nothing to apply on load and nothing that can be applied twice, so an
import, a reload or a second tab cannot double-pay. A clock moved backwards waits instead of
paying out, and the rolls — seeded from that same instant — cannot be re-rolled by looking at the
chest. The cost is that the chest cannot carry more than its capacity, which is exactly what the
design asks for.

## ADR-035 — The Idle Chest is a bonus, priced against a run
**Context.** Phase 9 shipped the chest with the reward table the design docs had carried since
Phase 0: brews, dust, a band material, chronicle XP, energy and a gear roll, all by the hour. Seen
in the running game, a twelve-hour chest at tier 12 paid 67k gold, 18 brews across three elements,
40 dust and a piece of gear. Measured against the rest of the economy that was not a bonus: 18
brews is 27,000 champion XP where a campaign run drops a brew 12 % of the time, and the gold was
roughly two thirds of what a whole day of active play pays. The owner's steer was explicit — "this
chest should be a nice little bonus only. Do not add too many rewards."
**Decision.** The chest is priced against a single campaign run at the tier it farms: one idle hour
owes about one run's gold (`120 × tier`, linear like the campaign's own gold), the tier's own band
material and nothing from the bands below it, a quarter of the chronicle XP it used to pay, and
energy. Brews move out of the owed list into the luck table (6 % an hour, at most two per fill, the
farm settlement's element only). Arcane Dust and the gear roll are gone: the campaign drops dust
every run, and gear that the racks are too full to hold is a reward that vanishes.
**Consequences.** Four owed lines and four chances, so the preview reads at a glance; a full chest
is worth a dozen to two dozen runs against the ~180 an active day spends, and roughly a tenth of a
day's levelling. The numbers live in `balance/idle.ts` with the calibration in the comment, so a
future rebalance argues with a run rather than with taste. Anything the chest no longer pays is a
line removed, not a number set to zero — if the owner wants gear or dust back, it returns as a
table row.

## ADR-036 — A boss's enrage is the boss's own cadence
**Context.** Enrage arrived in Phase 2 as one global constant — ATK +10 % every 8 of a boss's own
turns, past a per-enemy threshold — which suits a campaign stage boss that takes a dozen turns in a
fight it is expected to win. BOSSES.md gave Gargoyle a 50 ally-turn limit and an enrage turn of 20.
Measured with `tools/sim`, a race lasts it 6–16 own turns: at that threshold the first step would
have landed on its 28th, so the mechanic the design leans on to end a race would never once have
fired in the shipped game.
**Decision.** The cadence belongs to the boss block (`enrageEvery`, defaulting to the campaign's
eight), the daily gate enrages from its 12th own turn every 2, and the content validator rejects a
tier whose first step could not land inside half the ally-turn limit — the share of the race a boss
actually gets to act in.
**Consequences.** A long race now turns lethal as designed (about +60 % ATK by the turn limit) while
short ones are untouched, and campaign enemies keep the numbers Phase 3 was balanced against. The
validator makes the next boss state its own cadence rather than inherit one that does not fit, and
a mechanic that cannot fire is a build error instead of a doc that lies.

## ADR-037 — Placeholder art is washed at load, not filtered at render
**Context.** BOSSES.md asks for the daily boss to stand in as bone-white until it has a model of
its own, but the tint every placeholder uses is a *multiply*: it can only darken, so a pale tint
did nothing and Gargoyle was a green lizard with a bone-coloured name. A `ColorMatrixFilter` on the
sprite fixed the look and brought two costs: a filter pass on the stage's hot path — the project
had none until then, deliberately (CLAUDE.md §5.6) — and a Pixi warning on every boss teardown,
because the renderer destroys the filter's pooled texture sources while its bind group still holds
them.
**Decision.** `art.desaturate` is content, and each renderer implements it without a filter: the
Pixi stage bakes one greyscale copy of the model's atlas at load (canvas, Rec. 601 luma, cached per
model) and tints that; the DOM `SpriteView` blends its masked tint layer with `mix-blend-mode:
color`, which is the same operation — the model's light and shade, the tint's colour.
**Consequences.** The look is identical in both layers, the stage keeps a filter-free render path,
and the teardown is quiet. The cost is one extra decode and a canvas pass per washed model (a 84 px
atlas, once) and a second texture in memory for it, which is why the flag is opt-in per definition
rather than "anything with a tint".

## ADR-034 — The farm tier is the best of the three difficulties
**Context.** `ECONOMY.md` §6 defines the farm tier as "the highest settlement whose boss was
cleared on the highest unlocked difficulty". Read literally, unlocking Normal drops the tier to
zero until a Normal boss falls — a chronicle would be punished for progressing.
**Decision.** `farmTier` takes the maximum of `offset(difficulty) + highestBossCleared(difficulty)`
over all three difficulties.
**Consequences.** The tier is monotone: it never falls, and mastering Intro is worth exactly the
twelfth tier until the first Normal boss goes down. The doc now says so.

## ADR-038 — A boss's escort is a unit in its own wave, not a spawn mechanic
**Context.** `BOSSES.md` §3 gives the weekly boss two Choristers that take half of every hit meant
for it, come back on a schedule and at every phase change, and never count towards the damage
pool. The obvious reading is a summon mechanic: an ability that spawns units mid-fight, with a new
spawn path, new ids, a wave whose size changes and a presenter that has to learn to add sprites
after `wave.started`.
**Decision.** The escort is authored as part of the boss's tier and stands in the boss's own wave
from the first frame. `defineBoss` builds one escort kit and one definition per tier
(`enemy.chorister_<tier>`), the derived encounter puts `count` copies in the wave behind the
master, and `linkAdds` ties them together at spawn: each add learns whose hits it shares
(`guards`), the master learns whom to bring back (`adds`). Reviving is `reviveUnit` on a unit that
already exists, and the split is the redirect Ally Protection already had — the buff wins when both
apply, so a champion's play is never undone by the fight's furniture.
**Consequences.** No new spawn path, no ids invented mid-fight, and the presenter, the plates, the
save and `damageToBoss` (which sums the boss's own definition id) all work unchanged. The stage
needed one thing: its own marks for an escort (`ENEMY_ESCORT_SLOTS`), because a ×2.4 sprite covers
the ordinary enemy slots. The cost is that a boss cannot grow its escort mid-fight; when a later
boss needs that, it is a new effect type with tests, not a rewrite of this one.

## ADR-039 — Phase thresholds are set by measurement, not by the design's first draft
**Context.** The design printed Titan's phases at 70 % and 35 % of its HP — the shape a *kill*
fight has. Hers is a damage race against a 5,000,000 pool that a finished roster takes an eighth of
in one key, with its chorus taxing half of every hit. At 70/35 its second gear would have been rare
and its third would never have fired at all: `minPhase` abilities, an aura and a revive schedule
shipped but never seen.
**Decision.** The thresholds are 90 % / 75 %, chosen against the roster the fight is written for
(`tests/fixtures/saves/weekly-boss.chronicle`, four 6★ champions in full Legendary gear): phase II
lands inside an ordinary key, phase III on a good one. The chorus is 2 % of the pool per Chorister
for the same reason — at a tenth of that the party deletes both on the turn they appear and the
split never happens. Both numbers, and the measurements behind them, are recorded as Q41 for the
owner to overrule.
**Consequences.** Every mechanic the phase ships can be seen in the running game, and the content
validator rejects a `minPhase` past the last phase or an escort holding more than a tenth of the
pool. The design doc carries the measured numbers rather than the drafted ones, which is the rule
in CLAUDE.md §1 applied to a balance table.

## ADR-040 — A quest board is derived from the play, not driven by it
**Context.** Quests count what a player does: stages cleared, keys spent, pieces levelled. The
obvious implementation is a tracker that listens to the event bus and writes progress into the save
as it happens. That makes every quest a second copy of the truth: an event missed while a screen is
unmounted, a battle whose result arrives after a reload, or a listener that throws leaves a quest
stuck at 4/5 with nothing to recover from, and a `gear_reach_level` goal double-counts a piece
levelled twice.
**Decision.** The save keeps three things per period — the period's key, the lifetime counters as
they stood when it began, and what has been claimed — and everything else is a function of them and
the clock. A counter goal is `counter(now) - baseline`; a state predicate is read off the save
itself. Claiming is the only write. `COUNTER_KEYS` names every counter the game writes, so a goal
cannot ask for one nobody keeps, and the content validator checks it.
**Consequences.** A missed event cannot exist, because nothing is listening: the counters are
written by the reducers that already own the play. A period whose stored key is older than now *is*
a fresh board, so a rollover across a closed game lands exactly once, on the read that notices it —
the same discipline the period bosses use (ADR-033) and no midnight job in either. Two things
follow that are worth naming: a quest added in a later version starts from the current period's
baseline rather than from a player's whole history, and the one piece of memory a derived board
cannot do without — whether a finished daily board has already counted its day — is a boolean in
the period's record (Q42), not a second tracker.

## ADR-041 — The mission line is a list of claimed ids, not a pointer
**Context.** The Chronicler's Path is 120 missions, sequential inside a chapter and across
chapters. The obvious save shape is the planned one: the chapter the chronicle is on, the mission
inside it, and a progress map. That is three facts that have to agree with each other *and* with
the content: insert a mission in chapter 3 in a later release and every stored pointer past it
means something different, while a progress map keeps counting things the missions no longer ask
for.
**Decision.** The save keeps the ids that have been claimed, the counters the open mission started
from, and the chapter chests taken. The mission being walked is *the first one not in that list*,
and a chapter is open when every id of the chapter before it is. `pathView` derives the rest.
**Consequences.** A mission added later simply becomes the next one walked into, and one removed
stops being asked for — no migration either way. The baseline holds only the keys the open
mission's own goal reads (`missionBaselineKeys`), so it is small and says what it is for. Two
things follow: a claimed mission always reads as finished, whatever the counters do afterwards
(the view reports its target rather than re-evaluating it), and a mission still to come is
evaluated against the counters *as they stand*, so its counter goals read zero while its state
predicates tell the truth — which is what lets the screen show a locked card the chronicle already
satisfies.

## ADR-042 — The tutorial points at test ids and watches the world
**Context.** An onboarding overlay has to know two things the rest of the game would rather not
tell it: *where* a control is on the screen, and *when* the player has used it. The obvious answers
are the invasive ones — a ref registry every screen writes into, and a tutorial event every reducer
fires — and both spread the tutorial through the codebase, where it rots the moment a screen moves
a button or a phase adds a system.
**Decision.** A step names a **target**, and one map in `@ui/tutorial/targets.ts` turns that into a
`data-testid` selector the screens already carry for the e2e suite. A step's trigger and completion
are **conditions** over what the save and the router already say: a screen is open, a dialog is up,
a feature has unlocked, a stand has fallen, a lifetime counter has moved. Exactly two answers come
from the overlay itself — the Continue press, and a click on the spotlit element — because nothing
else can see them. Which step is open is derived from the ids already taught; the save keeps only
those and the chapters waved off.
**Consequences.** No screen imports anything tutorial-shaped, and moving a control moves its
spotlight with it. The maps are exhaustive over the script's own unions, so a target or a screen
the script names and the UI cannot find is a compile error rather than a spotlight that never
appears. Three things follow that are worth naming. A step is taught in two beats — the line, then
the action — and the world is only watched in the second, so a counter that was already satisfied
cannot finish a lesson before it has been read. A step whose own gate closes behind it ("open the
Tavern" is triggered on the hub and finished off it) is completed by the overlay that is still
holding it; the machine only ever decides which step to *open*. And a lesson whose target is
nowhere on screen dims nothing and blocks nothing, so a spotlight that does not exist can never
trap anybody.

Two rules fell out of building it, and both are checked rather than remembered. A lesson names
*where* it is taught — a step whose trigger mentions no screen, dialog or turn is a content error,
because one that could open anywhere opened on the title screen. And a lesson never opens over a
dialog it does not name: the Welcome Back report and a level-up are the game asking the player a
question, and two things holding the screen at once is a player with nothing to press.

## ADR-043 — A tower floor is a function of its number, and the climb is one number
**Context.** The Eternal Tower is a hundred floors that will one day be more. Authored the way
campaign stands are, that is a hundred files of waves, drops and scaling to write and retune, and
two hundred when the owner asks for floors 101–200. It also wants per-floor state — which floors
are cleared, which boss floors may be fought again — which in the obvious shape is a hundred rows
in the save that can fall out of step with each other.
**Decision.** Nothing about a floor is authored. Who holds it, what stands on it, how hard it hits,
what it pays and what it may drop are all pure functions of the floor number
(`@engine/tower/encounter.ts`, `rewards.ts`), and its encounter is derived on demand and memoised
by the content registry exactly as a campaign stage's is. The fight is pitched at Intro's flat
multiplier and stage index 0 — both 1.0 — so `towerScale(floor)` is the *only* curve acting on a
tower enemy: one number decides how hard a floor is. The save keeps three facts and a key pool:
when the season began, how high this season's climb has got, and the best floor ever reached.
Because floors are climbed in order, `highestFloor` alone says which floors are behind the player,
which one is open and which boss floors are repeatable.
**Consequences.** Floors 101–200 are `TOWER_FLOORS = 200` and nothing else; the curve is defined
per floor rather than between endpoints, so growing it never retunes a floor that already exists.
The shard table is read by floor with its last row held flat above it, which is the owner's rule
("after floor 100 the chances do not increase") expressed as a lookup rather than as a special
case. There is no per-floor state to desynchronise, and no migration when floors are added. The
cost is that a floor cannot be hand-authored — a floor with a scripted gimmick would need a new
mechanism — and that a tuning pass moves a whole band of floors at once rather than one.

## ADR-044 — One regenerating pool, used by energy and the Eternal Key
**Context.** The tower's key is energy with different numbers: a value that earns a unit on a
clock, stops at a cap, may be granted past that cap, and is spent with an error when it is short.
Energy already implemented all of that, timestamp discipline included. Writing it a second time
means two places where "regeneration pauses above the cap" has to stay true, and the second one is
the one that quietly drifts.
**Decision.** `@engine/economy/pool.ts` is that mechanism once — `regenerate`, `msUntilNext`, `add`
and `take` over a `{ value, lastTickAt }` pair, with the caller naming the cap, the period and the
error code a shortfall throws. `engine/economy/energy.ts` became thin wrappers around it and the
tower's keys are wrappers of the same shape. Nothing is stored but the pair: whole units are earned
on read, so nothing has to run while the game is closed.
**Consequences.** Energy's existing tests were the safety net for the extraction and passed
unchanged, which is the evidence the refactor was behaviour-preserving. The next resource on a
clock — a dungeon's tickets, a shop's daily stock — is a cap, a period and an error code. The
over-cap case (a chronicle at 16/10) is one implementation rather than two, so it is either right
everywhere or wrong everywhere; the tower's UI shows it in ember because it is a state worth
seeing, and nothing in `0.2.0` can reach it yet.

## ADR-045 — A rotating shop is a function of the hour, and a boost is an instant
**Context.** The Gold Market carries six slots that change every sixty minutes, and the three
boosts each last twenty-four hours. Both are the kind of thing that gets built with a stored
snapshot and a clock: roll six rows at the top of the hour and keep them; store "time left" on a
boost and count it down. Both of those shapes are wrong in the same two ways. Something has to run
at the boundary — and nothing runs while the game is closed, so the first visit after a night away
has to reconstruct what should have happened. And a stored roll is a roll a player can refuse: a
shelf written to the save can be rerolled by closing the tab before it is written, which is the
oldest exploit in the genre.
**Decision.** Neither is stored. The stall is `goldShelf(seedRoot, now)` — a weighted draw without
replacement seeded by `(seedRoot, floor(now / 60 min))` — so the six slots at 14:00 are the same
six at 14:59 and a different six at 15:00, with nothing running at the top of the hour. What the
save keeps is only which slot indices have been bought from and the hour that record belongs to; a
record stamped with an older hour reads as an untouched stall, which is `ADR-033`'s rule applied to
a shop. A boost stores **the instant it runs out**, never a duration, and `applyBoost` extends from
`max(current expiry, now)` — which is also what makes the owner's "they stack in time" rule a
single expression rather than a special case for "already running".
**Consequences.** The reroll exploit cannot exist: there is nothing to refuse. A boost used before
a weekend comes back correctly spent rather than owing two days, and three boosts used at once are
seventy-two hours without anything having to remember that there were three. The header's
countdown is a subtraction against `Date.now()` rather than a timer that has to survive a reload.
The cost is that the stall cannot be hand-curated — there is no "this hour, a sale on brews"
without a second mechanism — and that changing `GOLD_MARKET_POOL` changes every past hour's shelf
as well as every future one, which is only a problem if a shelf were ever worth reproducing, and it
is not: it is gone in an hour either way.

## ADR-046 — The Mine is one timestamp and two fractions, and it opens full
**Context.** The Mine (`MINE.md`) pays whole gems from a store that fills by the clock, and a level
at 13 or 16 gems a day does not divide a day into whole gems. The shapes that suggest themselves
each break something. Storing the gems held means a job has to add to them while the game is
closed; rounding each collection down loses a part-gem every visit, so a player who visits often is
paid less than one who visits once; rounding up pays a gem that was never dug. And a Mine that
starts empty cannot be taught: a chronicle can reach level 6 in a couple of hours, and at six gems
a day the lesson's first collection would find nothing whole to take.
**Decision.** The save keeps the level, `collectedAt` and a `carry` of the fractions below one gem
and one Sigil that the last collection could not pay; the store is `carry + rate × min(elapsed,
store)`, derived on every read (`ADR-033`'s rule for the Idle Chest, with the carry added). A
collection pays the whole units and carries the rest; whole units are counted with a float
tolerance, because 0.35 a day for twenty days must be seven Sigils. An upgrade *settles* the old
store — pays it at the old rate — before the next level starts digging, so a level never re-prices
time already worked. A new Mine's `collectedAt` is one store's length before the chronicle began,
and a migrated chronicle's one store's length before its last save: every Mine opens full.
**Consequences.** Ten small collections pay what one large one would; nothing runs at a boundary;
a reload, an import or a clock moved backwards (which leaves `collectedAt` where it was) cannot pay
twice. The tutorial's first collection is guaranteed three gems however fast the chronicle got
there. The cost is two floats in the save — schema-checked to `[0, 1)` — and a `collectedAt` that
can be earlier than `createdAt`, which is true of nothing else in the save and is the whole point.

## ADR-047 — An instant clear is a fought run's settlement without the fight
**Context.** The owner asked for instant three-star clears: a stand already mastered should not have
to be watched again to be farmed. The shapes that suggest themselves each drift from the fight they
replace. A separate reward table for instant runs would be a second set of numbers to keep in step
with `CAMPAIGN.md` §7; a discount or a ticket would make the fought run and the written one pay
differently and push the player to one of them; and a synthetic three-star `BattleOutcome` fed to
`settleRun` would record best turns nobody fought and touch the stars, the chests and the
milestone logic for nothing.
**Decision.** An instant run spends what a fought run spends and pays through `rollRunRewards` with
`firstClear: false`, no chest thresholds and no milestone — exactly the arguments a fought repeat of
a mastered stand passes — on the same seed scheme and the next run index. The bookkeeping a fought
run and an instant one share was lifted out of `applyRunFinish` into four helpers
(`claimRunIndex`, `runRng`, `mintRunDrops`, `payChampionXp`), so there is one code path for what a
run mints and who it pays. Only a stand at `STAGE_MAX_STARS` qualifies, and nothing the feature
does writes stars, best turns or the `battles.*` counters.
**Consequences.** The equivalence is testable and tested: a batch of instant runs leaves the wallet,
the energy, the chronicle, the roster and the armoury identical to the same runs fought flawlessly
(`state/instant.test.ts`). Changing a reward in §7 changes both at once; the economy simulation
needs no new line, because instant clears move no number it measures — they only save the time a
fight takes. The cost is that an instant clear can never be *better* than a fight (no bonus for the
convenience), which is the point: the choice between them is only about time.

## ADR-048 — The Hall of Deeds stores claims, reads the whole chronicle, and learns feats as counters
**Context.** The owner asked for challenges and achievements as long-term goals. The obvious shapes
each break something. Storing progress per achievement would be a second record of play the
counters already keep, free to drift from them. Counting from the day the Hall opened would tell a
veteran that nothing they did before 0.12.0 counts. Storing renown would let a save edited by hand
mint a rank. And a challenge that names *how* a fight was won — alone, untouched, with commons on
Hard — asks something no counter or state predicate could answer after the fight is over.
**Decision.** Both ledgers are goals from the shared DSL (ADR-040), evaluated against a baseline of
zero: the Hall reads the lifetime counters and the chronicle as it stands. The save keeps only what
was *claimed* — tiers per achievement, challenge ids, ranks claimed — and the frame worn (save v21).
Renown is the sum of what was claimed, the rank is where that sum stands, and frames and titles are
derived from claimed ranks and challenges. Feats are written as ordinary lifetime counters
(`feat.*`) by `recordBattle` the moment a victory is recorded, from the battle's report and the
fielded champions (`engine/deeds/feats.ts`), so the challenges read them like any other counter.
Where a mode has a top, the top is a challenge and the achievement below it stops a rung short, so
nothing pays twice.
**Consequences.** The Hall opens full for an old chronicle — every tier it passed is waiting — with
no back-pay migration and no event replay; the v20 → v21 migration only adds an empty `deeds`. A
counter a tier names is checked against `COUNTER_KEYS` like any quest's, and the validator refuses a
rank ladder the Hall cannot pay. The price is that feats can only be learned from the day they were
first recorded (0.12.0): a lone win fought in 0.11.0 is not on any record, and a veteran has to win
it again. Deliberately, the Hall is one-off rewards rather than a rate, so `sim:economy` does not
model it (`ECONOMY.md` §7).

## ADR-049 — The largest string tables load with the panels that print them
**Context.** 0.12.0 put the first screen's JavaScript at 353.7 kB gzipped against the 350 kB budget
(CLAUDE.md §5.6). Measured module by module, the biggest single table of words in that bundle was
the Chronicle of Changes — about 14 kB gzipped, and the one table guaranteed to grow with every
release, since every release writes into it. Everything else of that size is a library the first
screen draws with (the motion library, the schema library behind save loading).
**Decision.** The releases (`content/changelog`) and their strings (`i18n/en/changelog.ts`) leave the
eager registry and the eager dictionary. `ChangelogView` is a lazy shell: it loads the panel and
the words together, `registerStrings` joins the words to the dictionary, and the frame keeps its
size while they arrive. Release keys come out of content data and are read with `translate`; the
panel's own labels stay typed in `ui.ts`. Validation and tests read every table through
`i18n/catalog.ts` (`ALL_I18N_KEYS`), which the game itself never imports.
**Consequences.** The first screen is 338 kB and no longer grows with the changelog. The title
screen's frame paints a beat before its text — a precached local chunk, so a frame or two. The
same mechanism is how a large feature's words can ship in its own chunk later: a table that only
one screen reads can be registered by that screen's loader, the way this one is.

