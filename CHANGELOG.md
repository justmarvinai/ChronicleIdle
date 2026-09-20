# Changelog

All notable changes to ChronicleIdle are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow `CLAUDE.md` §9.3
(`0.0.<phase>` during development, `0.1.0` = Early Access 0.1).

## [Unreleased]

_Nothing pending. Four questions are open for the owner: `USER_QUESTIONS.md` Q46 (what an audit can
say about a game that never stops animating), Q47 (when a tower season starts counting), Q48 (a
lost floor still spends its key) and Q49 (nothing grants Eternal Keys yet)._

## [0.4.1] — 2026-09-20

### Fixed

- **Ability icons were eggs.** The icon is round and sized in px, but it sat in a flex row with no
  `flex: none`, so a row short of width took the width out of the icon: 56 px tall, 47 wide, with
  the art stretched to match. Every ability list drew them that way — the Index's champion page,
  the bestiary's, the champion detail's.
- **A list labels its rows, the icon carries no chip.** `A1`–`A4` on a 56 px circle covered the
  art they were badging and hung past the bottom edge into the row's divider. The slot is a chip
  beside the ability's name now, where the cooldown tag already was, and the passive's `P` is the
  word PASSIVE the row already carried. `AbilityIcon` has one `badge` for the rim instead of a
  `hotkey` and an implicit `P`, and only the fight's bar — where the chip is the key you press —
  asks for it.

## [0.4.0] — 2026-09-20 — The owner's fourth batch

Six things drawn or wired wrong, and a rule about names.

### Changed

- **Champions have one name.** Common through Epic are a single word — Bran, Gil, Wenna, Orla,
  Tobbe, Mirestalker, Maelis, Corvin, Reva, Anuria, Darius, Khazgor, Maruan, Sethlurias, Thordakk
  — and only a Legendary or a Mythic earns a second, with no "the" and no comma in it: Eldric
  Lorekeeper joins Aurelia Dawnwarden and Kaelith Stormcaller, and the Mythic is **Varkos
  Sunderking**. The ids do not move: a save names its roster by id, and a tidier string is not
  worth a chronicle's champions. The rule is in `docs/design/CHAMPIONS.md` §1.
- **Pick the target, then the ability** (`BATTLE.md` §8). A press on an enemy cast at it with
  whatever ability was already selected, which in practice is the basic attack — the only way to
  aim anything else by hand was to hope the policy had preselected the right enemy. A press on a
  unit now picks it and spends nothing; the ability is chosen after, from the bar or its number
  key, and casts on the picked target whenever it can reach it. On an enemy the press still sets
  the mark, and pressing it again lifts it, which is unambiguous now that no press casts.
- **The Chronicle Index reads as a sorted catalogue**: a heading per element in the element's
  colour, a caption per role inside it, and the cards of that group on one row.
- **The gear rack says what it holds.** A worn piece wears a ring in its rarity's colour and the
  rarity named under it, and *Take off* / *Upgrade* are chips with a gold hairline rather than two
  underlined words in the dimmest text colour.

### Fixed

- **A panel told to be as tall as its parent was taller than it by its own padding.** `Frame`'s
  content box was `content-box`, so the frame drew at the right height and the content ran past
  it — which is why the Index's champion page had its lore off the bottom of the screen and no
  scrollbar to say so. The Index's split also needed an explicit `minmax(0, 1fr)` row: an implicit
  `auto` row grows to whatever its tallest child wants.
- **The cooldown never reached the icon.** The HUD's view is built from events and no event
  carried a cooldown, so the ability bar read the snapshot the fight started from for the whole
  fight: every ability ready, every time, with the number only in the tooltip — and that was the
  ability's authored cooldown, not what was left of it. `turn.started` carries the acting unit's
  cooldowns now, announced after the turn's tick.
- **Ability icons draw the same at every size.** The keyboard chip and the passive tag were 22 px
  whatever the icon was, so on the 56 px icons a page prints beside an ability they swallowed a
  third of the art. Both chips and the cooldown number are fractions of the icon now.
- **What slides in is centred by margin.** The summon's Continue / Summon again / View champion row
  sat off to the right of the gate: it was centred with `left: 50%` + `translateX(-50%)` and
  animated in, and the animation writes its own `transform`, taking the centring half of that pair
  with it. The PWA update banner had the same pair, the same slide and the same half-window offset.
- **The gear rack fits its panel.** Three 128 px slots and their gaps came to 408 px inside a
  398 px column, so the shield and the boots hung through the right edge.
- **A fight is never hostage to its stage, and never plays in slow motion.** The controller holds
  the first turn until a presenter attaches; a WebGL context that hangs rather than fails held it
  for ever, and after twenty seconds the fight now plays through the HUD instead. GSAP's lag
  smoothing treated a frame longer than half a second as a stall and advanced by 33 ms rather than
  by the time that really passed, so a machine that could not hold the frame rate played the fight
  in slow motion instead of dropping frames (a stand took 26.2 s under a 20× CPU throttle with it
  and 19.5 s without, against 11.7 s unthrottled). `CLAUDE.md` §5.6 asks for frames to be dropped.

## [0.3.0] — 2026-09-20 — The owner's third batch

Seven asks: two things drawn wrong in a fight, two the fight was missing, one screen that was
never built, one that had furniture pasted on it, and a gate that arrived too late.

### Added

- **The Chronicle Index** (`docs/tech/UI_DESIGN.md` §5.20). The hub's Index button pushed a Locked
  screen saying the feature "arrives in a later chapter of development" — the last unbuilt thing in
  the game. It is four catalogues now, all of them reads of the content registry, so the Index
  grows by itself every time the content does: every **champion** the game has (found or not,
  dimmed until the chronicle holds one, with its stats, kit, lore and where it comes from), the
  **bestiary** of all twelve settlements (each faction's six and the boss that holds its last
  stand), the fourteen **gear sets**, and every **status** a fight can carry.
- **Mark the enemy every champion attacks** (`docs/design/BATTLE.md` §7.1). A press on an enemy
  marks it: while it stands, it is the target every ally takes — in manual mode as the
  preselection a turn opens with, in auto as the policy's answer. Tab marks from the keyboard, and
  the kill that takes the enemy clears it — as does a press naming an enemy the simulation has
  already buried while the stage was still animating its death. A press that can also spend the turn on that enemy
  attacks and keeps the mark; one that cannot — in auto, or between turns — toggles, so pressing
  the marked enemy hands targeting back to the policy. One line of state
  (`focusId`) read in one place (`pickTarget`), which is why both modes and the preselection are
  the same rule rather than three that drift. It sits above a kit's declared `prefer` — that is
  the champion's opinion, this is the player's — and below only a Provoke.
- **Drag to scroll**, everywhere the wheel scrolls: hold the left button and move. One
  document-level handler finds the nearest scrollable ancestor of whatever the pointer went down
  on, so it covers every scroller the game has and every one it will have. It takes only the
  primary mouse button, starts only past 5 px, and swallows the click that ends a real drag so
  dragging across a card does not open it.

### Changed

- **Gear is equippable from level 1.** The opening stands drop gear and the gate stood at level 3,
  so the first pieces a player saw were a reward they could not use.
- **The bosses left the hub.** Two rectangular cards floated over Emberhold's sky saying a boss
  unlocks at level 10 — web furniture pasted on a painting, which is the one thing `CLAUDE.md`
  §7.1 forbids. What the hub keeps is a counted dot on **Battle** when a boss chest is waiting,
  and the number the panels carried moved to where it is acted on: every Game Modes card now
  reports its own live state under the blurb — `Keys 2/2` on a boss, `Floor 14 · Keys 4/10` on the
  tower, the stand the chronicle is on for the campaign. A card that is still shut reports
  nothing; its button says what opens it.

### Fixed

- **The keyboard number on an ability was being clipped, not hidden.** `overflow: hidden` with
  `border-radius: 50%` on the round button cuts anything near a corner to the circle, and a badge
  at the bottom-left of a 96 px circle is two thirds outside it — so a sliver of the "1" showed and
  read as art bleeding over the number. The art clips itself now and the button clips nothing, so
  the number and the passive tag sit whole on the rim wearing the same dark chip with a gold
  hairline.
- **An ability on cooldown reads as spent**: its art goes grey and dark under the turns remaining,
  in gold at 40 px, instead of a thin scrim the eye slid over. The engine was already sending the
  number; only the drawing changed.
- A gear set printed its own description and then its passives, which said the same sentence twice
  — three times for a set with two passives. The status glossary leaked the `{value}` placeholder
  out of text written for a single cast; it prints `X`, because a glossary has no cast to read.

## [0.2.0] — 2026-09-18 — The Eternal Tower

The first mode that outlasts the campaign. A chronicle that has cleared Intro has run out of first
clears; the tower gives it a hundred floors that keep getting harder, a resource that paces a
sitting rather than a day, and a reason to come back every thirty days. Design:
`docs/design/ETERNAL_TOWER.md`.

### Added

- **The Eternal Tower.** A hundred floors climbed in order, opened by clearing the **whole Intro
  campaign** — a progress gate, not a level gate, which is why the Game Modes card and the Locked
  screen both name the campaign instead of a number. Ordinary floors are one-time clears; every
  tenth floor is a **boss floor** and may be fought again for its shards. The tower resets every
  thirty days: the climb goes back to the foot of the tower, the best floor ever reached does not.
- **Nothing about a floor is authored** (ADR-043). Who holds it (the twelve campaign factions
  cycle), what stands on it, how hard it hits, what it pays and what it may drop are all functions
  of the floor number, so floors 101–200 are one constant away. The fight is pitched at Intro's
  flat multiplier and stage index 0, which leaves `towerScale(floor)` as the only curve acting on a
  tower enemy: floor 1 is 5.0× the archetype base (Intro's last stand is 4.8), floor 50 is 24.0 and
  floor 100 about 120 — four times the campaign's hardest.
- **The Eternal Key**, the 25th wallet currency: one per attempt won or lost, capped at 10, one
  back every fifteen minutes. A grant may carry the count above the cap (16/10 holds, with the
  clock frozen until spending drops it back under) — nothing grants keys yet, so `USER_QUESTIONS.md`
  Q49 asks the owner whether to wire the gem exchange that is already sized in `balance/tower.ts`.
- **What a floor pays.** Gold (`600 × 1.045^(floor−1)`, ×3 on a boss floor), 1–5 energy in steps of
  twenty floors, Universal Brews, an element brew on a boss floor, and champion and chronicle XP.
  Shards are the only rolled part, on the owner's own table: floor 10 pays Ancient at 0.1 % up to
  floor 100's 5 % Ancient and 0.65 % Sacred, and floors above the table's last row keep that row's
  odds. A defeat pays nothing, and the key is already spent.
- **The tower screen** (`docs/tech/UI_DESIGN.md` §5.13a): the season, the reset countdown, the
  climb, the best floor and the keys on the left; a hundred-rung ladder on the right, reversed so
  floor 1 sits at the bottom, opening scrolled to the floor a key may buy. The battle result swaps
  stars and spoils for what the floor paid and whether the climb advanced.
- **Account Power in the header.** Every owned champion's power, summed, under the experience bar
  on every screen (the owner's ask alongside the tower).
- Save **v14**: the `tower` slice and the `key_eternal` wallet row, with the 13 → 14 migration and
  a `v14.json` fixture. The migration deliberately writes `firstAttemptAt: 0` — a season a
  chronicle has not started must not already be running down.

### Changed

- **One regenerating pool, used twice** (ADR-044). `@engine/economy/pool.ts` is now the single
  implementation of "a value that earns a unit on a clock, stops at a cap, accepts grants past it
  and is spent with a typed error"; energy became thin wrappers around it and the tower's keys are
  wrappers of the same shape. Energy's existing tests passed unchanged, which is what says the
  extraction changed no behaviour.
- The Locked screen can state a reason other than a level, so a feature no level opens says what
  actually opens it.
- **CI shards the e2e suite three ways instead of two**, with a 60-minute job cap. At 42 tests a
  half took 42 minutes on a slow runner — past the old 45-minute cap, and long enough for a
  browser session to die of resource pressure. The tutorial's chapter-1 walk also gets the same
  ten-minute budget as every other full-flow spec; it was the only one on six, and it is the
  longest scripted run in the suite (the naming, the binding, four screens, then a manual battle
  played turn by turn to a victory).

## [0.1.2] — 2026-09-17 — The owner's second batch

Three things that were drawn wrong. No system changed; three of them stopped lying about where
they were.

### Fixed

- **The battle log stays inside its panel.** It was growing as tall as the fight and running off
  the bottom of the screen, with the line numbers cut off against the frame. The flex column was
  on the `Panel` rather than on its content box — a `KitSurface`'s own children are the fill, the
  frame and the content, so `flex: 1` on the list never applied and `overflow-y` had no height to
  scroll against. The column moved to `contentClassName`, the list got the `min-height: 0` a flex
  item needs before it will shrink below its content, and the markers got padding wide enough for
  three digits. `battle.spec.ts` now measures the list against the panel.
- **The summoned champion lands in the gate.** The reveal was centred on the window while the ring
  hangs at (900, 470) — deliberately off-centre, in the open space between the shard rail and the
  banner column — so the card sat 60 px right and 40 px below the portal it had just come through.
  The cards are pinned to the ring's own centre now, passed down from `RING` so there is no second
  copy of the number, and being out of the overlay's flow they no longer shift when the results row
  lands. `portal.spec.ts` measures the card against the ring.
- **Five of seven champions faced away from the enemy.** Anuria is the one the owner saw; Darius,
  Maruan, Rattledagger and Thordakk had it too, on the battle stage *and* on every screen that
  draws a champion sprite (Champions, the Tavern, the Path, the banner panel). The asset pipeline
  kept a `MODEL_FACING` table of its own with only Khazgor and Sethlurias in it — everything else
  fell through to a `left` default that was wrong for all five — and the champion files copied the
  same wrong answers by hand.

### Changed

- **Facing belongs to the sheet, not to the champion.** One table
  (`src/content/champions/models.ts`) is now the only place it is written down, read twice: the
  pipeline stamps it into the manifest (for `SpriteView`) and the content DSLs resolve it (for the
  battle stage). Champion files no longer declare `art.facing` and enemies no longer default it.
  `satisfies Record<ModelKey, …>` makes new art fail the typecheck until somebody has looked at it
  and answered, and `content.test.ts` holds the manifest and the table to each other.
- The models step's cache key carries the facing, so changing the table re-emits the atlas instead
  of serving an entry that still holds the old answer.
- `ASSETS.md`'s model table said "Facing (verify in Phase 1)" and was never verified. It is now,
  against the art, and says so.

## [0.1.1] — 2026-09-17 — The owner's first batch

Four changes from the owner's first pass over Early Access 0.1, and the answer to Q45.

### Changed

- **The Chronicler's Path opens at level 1** (`balance/unlocks.ts`), because the missions are what
  guides a new player through everything the game has: waiting until level 6 left the first hour
  with nothing pointing anywhere. Eldric teaches them straight after the first stand, so the Path
  is explained the moment it exists — the tutorial's chapters are walked in order, and leaving *The
  Path* at position five would have left the missions unexplained until level 5. The chapters are
  now `awakening` → `the_path` → `the_hold` → `the_binding` → `routine` → `steel_and_bone`, and the
  files are named for their chapter rather than their number, so moving one never renames a file.
- **A piece of gear lives in exactly one place** (`engine/gear/query.ts`, `GearPickerDialog`,
  `ArmouryScreen`): the racks hold what nobody is wearing, and a worn piece shows on its champion.
  Listing worn gear everywhere read as an armoury twice its real size, and the slot picker offered
  pieces that were on somebody — "more armour for another champion" that was nothing of the kind,
  and that stripped that champion when taken. The steal-and-confirm flow is gone with it; there is
  nothing left to take. The capacity band still counts every piece the chronicle owns.
- **Upgrading a worn piece** starts from the champion wearing it: the Gear tab's *Upgrade* opens
  the Armoury bench on that piece (`GearTab`). Without it, hiding worn gear from the racks would
  have made an equipped piece impossible to level.
- **The racks are read as sets** (`groupBySet`, `VirtualGrid` sections). *Set* is the sort the
  Armoury opens on, and each set's pieces run together under a heading carrying the set's crest,
  its name, `n-piece` and how many are on the racks — so a set being assembled is one block instead
  of a scatter. Every set already wore its own crest on every card; what was missing was the
  separation. Any other sort draws one straight grid.
- **The worn/spare filter chip is gone.** With worn gear off the racks it could only empty them,
  and the view it set is shared with the Forge's benches, where it would have silently hidden
  pieces on a screen with no control to undo it.
- **Q45 answered** (`USER_QUESTIONS.md`): the economy stands as measured — four Ancient Shards in
  the first week is the intended shape, not an overshoot. `tools/sim/economy-script.ts`'s bands now
  guard a signed-off shape rather than a provisional one.

### Fixed

- Four documents still pointed at `src/content/tutorial/chapter_<n>.ts`, which the chapter rename
  had made dead paths (`AGENTS.md`, `CONTENT_AUTHORING.md`, `TUTORIAL.md`, `USER_QUESTIONS.md`).
- `tests/e2e/tutorial.spec.ts` still named the Path's lesson by its old position (`tut.5.1`,
  "Chapter 5"). The game was right and the test was stale — the skip fixture resumes on the Path's
  chapter exactly as it should, migrated ids and all — but it is the one check that proves it, so
  it failed until it was told where the chapter went.

### Technical

- `VirtualGrid` places its rows at measured offsets instead of counting them off a fixed row
  height, which is what lets a windowed grid carry heading rows. A grid given a flat `items` list
  lays out exactly as before — the other three screens that use it are untouched.
- Save `v13`: the tutorial chapters changed position, so completed step ids are remapped
  (`migrations.ts`). Skipped chapters are recorded by slug and needed nothing.

## [0.1.0] — 2026-09-16 — Early Access 0.1

Every feature of the owner's brief is in the game and reachable by a player: twelve settlements
over three difficulties, 23 champions, gear with sets and a forge, a summoning portal with pity, an
idle chest, a daily boss and a weekly one, two quest boards, a ten-chapter mission line, and Eldric
teaching all of it. No accounts, no server, no PvP, no monetisation — a chronicle lives in the
browser it was begun in and leaves as a file when the player says so.

This release adds no features. It is the pass that makes the fifteen phases behind it defensible:
every budget in `CLAUDE.md` §5.6 is now checked by a command, every save the game has ever written
is proven to still open, and the economy is measured rather than estimated.

### Added

- **The migration matrix** (`src/state/migration-matrix.test.ts`): one fixture for every save
  version from 1 to 12, every hop covered by exactly one step that moves one version, and for each
  fixture the chronicle's identity, purse, roster, armoury, stars and counters all intact on the far
  side. Exhaustive by construction — a version bumped without its fixture fails here rather than
  going quietly untested. `pnpm fixtures:version` writes the current version's fixture.
- **`pnpm sim:economy`**: a scripted month, played three ways — one sitting a day, two (the "active"
  player `ECONOMY.md` describes) and four — with every income and spend line derived from the
  content and balance tables through the same functions the game uses. `--strict` holds the ledger
  to bands that guard the design's intent: no activity level may end a day in the red, a casual week
  must still reach an Ancient Shard, and the ceiling may not run away.
- **`pnpm perf:budget`**: the static half of §5.6 against a build — the initial route's gzipped
  JavaScript (277.7 kB of 350), that the screens are still code-split (50 lazy chunks), and every
  texture's dimensions, classified by manifest group so an atlas is held to 2048 while a
  full-screen backdrop, shown one at a time and wider than the viewport on purpose, gets its own
  ceiling.
- **`pnpm perf:lighthouse`**: the production build audited as the desktop page it is.
  Accessibility 100, SEO 100, first contentful paint 0.6 s and largest 1.5 s against §5.6's four
  seconds.
- **The EA-0.1 walkthrough** (`tests/e2e/walkthrough.spec.ts`): one recorded run that imports a
  deep chronicle and then opens and *uses* every system — the campaign fought to a victory, a
  champion's kit and lore read, the armoury and forge worked, a champion summoned, both boss gates
  entered, both boards claimed, the Path read, the chest taken, the chronicle exported. Video is on
  for this spec, so CI leaves behind something to watch instead of nineteen spec files to read. It
  runs in 3.1 minutes.
- **A `robots.txt`**, whose absence was the only thing between the audit and a perfect SEO score.

### Changed

- **`ECONOMY.md` §7–§8 now print measured figures**, with a note saying what they used to claim.
  The old totals were written before the bosses existed; see Balance.
- **An `ErrorBoundary` per screen** (§5.7), keyed by route. There was one at the root, so a screen
  that threw took the hub's chrome down with it; now a crash is contained and leaving and returning
  gives the screen a fresh mount.
- **One apostrophe, not two kinds.** The copy review over all 1,559 shipped strings found prose
  using the typographic apostrophe and proper names using the straight one — "a champion’s level"
  beside "Ranger's Focus". Thirteen names normalised; no key or id moved.
- **CI gained four gates**: `sim:economy --strict`, `perf:budget --strict`, `perf:lighthouse
  --strict`, and the manifest-drift check now guards a pipeline that can re-pack textures.
- `docs/tech/DEPLOYMENT.md` §4.1 records exactly what of the deploy path was verified for this
  release and what needs a real server (see Known limitations).

### Fixed

- **FX sheets up to 8544 px wide would silently not draw.** The GameFX export ships single-row
  strips; WebGL2 only guarantees 2048, so on a GPU below that the upload fails and the effect is
  simply absent. The asset pipeline now lays a long strip out in rows (8544 × 96 → 2016 × 480),
  which the flipbook already knew how to read. The copy is a raw-buffer memcpy rather than a
  composite, because compositing premultiplies and zeroes the colour of fully transparent pixels —
  invisible under nearest filtering, a dark fringe under linear. Verified frame by frame against
  the owner's originals: alpha and colour byte-for-byte identical. Largest atlas side: 2048 px,
  from 8544.
- **The tutorial overlay re-rendered on every battle event**, against §5.6's "0 React commits
  during battle" — the very rule its own measurement loop was written around. It selected the whole
  presented session, which is replaced per event; `battleSignal` is now referentially stable and a
  test pins it.
- **The frame bench had not run since Phase 14.** It creates a throwaway chronicle, and from Phase
  14 Eldric's panel holds the dialog while it speaks, so the click on Begin landed on the overlay.
  It now reads each lesson first. The same fault was in `window.spec.ts`, fixed in `0.0.14`.
- **A fixture that could not do what its chronicle had done.** `path.chronicle` claimed 24 crafts
  and six chapters of the Path in its counters while its purse held gold, gems and three Glyph
  Sigils — no materials, no brews, no tomes — so the Forge could not strike. It now carries what a
  chronicle that deep would. No goal type reads the wallet, so the missions spec that shares it is
  unmoved, and the two are run together to prove it.
- **Playwright had no action timeout**, which is its default: a click on a control that never
  becomes enabled waits until the test's whole budget is gone and then reports a bare timeout. The
  disabled Strike button above cost fifteen minutes and said nothing about why. Capped at 15 s.

### Balance

- **The campaign curve holds.** `pnpm sim:balance --strict --runs 40` — 40 runs per stage, 120
  stages, three difficulties — passes all eight bands: a starting roster clears settlement 1 at
  100 % and stalls at settlement 8 (0 %), a mid Epic roster takes Intro's end at 94 % and Hard's at
  0 %, and an endgame roster clears Hard's end at 100 %. No tuning needed.
- **The economy is about 1.8× as generous as `ECONOMY.md` §7–§8 estimated**, and almost all of the
  gap is one line. An active player earns ~1,430 gems a week against the old ≈ 800, and ~322k gold a
  day against ≈ 250k. `BOSSES.md` §2, written four phases after that estimate, gives Gravemaw's
  Normal tier a 60-gem chest claimable every day — ~420 a week where §7 had guessed 100 for both
  bosses together. Every other line landed within a tenth of its estimate, and the idle chest to
  within 4 %. So the content matches the per-system design documents and it was the one-line sanity
  total that had gone stale. Nothing is nerfed for this release: each system's numbers were signed
  off against its own document in its own phase, and re-cutting them all is the fine-tuning pass
  that follows. `USER_QUESTIONS.md` Q45 records the judgement and names the three levers.

### Known limitations

- **Frame time is not measured in this build environment**, which has no GPU. `pnpm perf:battle
  --software` reports p50 400 ms / p95 583 ms on the stress fight through SwiftShader — the same
  order as Phase 11's 383 / 417 measured the same way, and nothing the 16 ms budget can be judged
  against. That budget stays signed off on the owner's iGPU laptop (Q30).
- **Lighthouse's performance category is not gated**, and cannot meaningfully be. Its score is
  three-quarters Total Blocking Time, which counts main-thread work *after* load — here, the
  ambient canvas §7.1 requires. It measures the frame loop, not a stall. Accessibility, SEO and the
  paint budgets are gated instead; Q46 records it.
- **The deploy path needs one real run.** `nginx -t`, certbot, `deploy.sh` and `vercel --prod` are
  documented commands against infrastructure this container does not have. What *was* verified:
  `dist/` serves correctly from a plain `python3 -m http.server` with no rewrites or fallback, every
  path the nginx site and `vercel.json` name exists in the build, their cache rules agree, and the
  router never calls `pushState`, so the SPA fallback is a safety net rather than a requirement
  (`DEPLOYMENT.md` §4.1).
- **The audio mix was reviewed at the bus level only** — music 0.7 under sfx 0.8, ambience 0.6 under
  both. Whether it *sounds* right is not something a container with no audio device can judge.
- **Tags do not leave this environment.** The session's git proxy refuses tag pushes with HTTP 403,
  so `0.0.0`–`0.1.0` exist only locally. They need pushing from a checkout with normal credentials.

## [0.0.14] — 2026-09-16 — Phase 14: Tutorial & Onboarding

Eldric the Chronicler teaches the game. Six chapters, each waiting for the feature it explains,
from the naming of a chronicle to the Refine bench at level 18 — and 1,500 energy in Chronicler's
Provisions along the way.

### Added

- **The overlay** (`UI_DESIGN.md` §5.18): the screen dimmed to one cut-out, a gold ring and a
  bobbing caret on what the lesson points at, and Eldric in an ornate panel typing his line out.
  A step runs in two beats — while he speaks the screen is held and *Continue* takes focus; once
  the line is read he shrinks to a strip above the bottom bar so the lesson never sits on top of
  what it is teaching. From chapter 2 on, every lesson carries *Skip this lesson* (owner's Q4).
- **The script as data** (`content/tutorial/chapter_1..6.ts`, 35 steps): the six chapters of
  `TUTORIAL.md` exactly — each step's trigger, what it points at, Eldric's line, what stays
  clickable and what finishes it. Chapter files are the script; ids and dialogue keys follow from
  where a step sits.
- **A tutorial that no screen knows about** (ADR-042): a step names a *target*, and one map turns
  that into an existing `data-testid`; a step's trigger and completion are conditions over what the
  save and the router already say. Six screens gained a `data-testid` on a container and nothing
  else. The maps are exhaustive both ways, so a target the script names and the UI cannot find is a
  compile error.
- **The step machine** (`engine/tutorial/script.ts`): which lesson is open is arithmetic over the
  steps already taught, the chronicle and where the player is standing. One thing at a time —
  chapters are walked in order and an unfinished one holds the rest — except Steel and Bone, whose
  eight standalone lessons each wait on their own feature from level 7 to 20.
- **Save v12**: the steps Eldric has taught and the chapters the player waved off, and nothing else
  about the tutorial's position. The migration from v11 does not send an old chronicle back to
  school: chapters whose gate its level has passed count as waved off, Steel and Bone keeps the
  lessons it has not reached, and the grants of the chapters marked off that way are recorded as
  paid so nothing is back-paid.
- **The Chronicler's Provisions**, paid as Eldric names them: 500 energy for the first chapter and
  250 for each of the next four (`ECONOMY.md` §5.1), plus the Ancient Shard he keeps back for the
  Portal. Every grant is once per chronicle, by id — and a chapter waved off still pays what it
  carried, so skipping a lesson never costs energy. `claimGrant` in the store pays any one-time
  grant through the energy pool.
- **The scripted moments**: the first stand is fought on a fixed seed so the turns its lessons wait
  for always happen, and the tutorial's one press on the Ancient Shard always turns up an Epic —
  through a rarity floor in the summon engine that takes the roll anyway, so the stream advances
  exactly as it would have and the pull after is the pull it would have been.
- `tests/e2e/tutorial.spec.ts` and `tools/fixtures/tutorial-chronicle.ts`: the first chapter walked
  end to end in a production build, from the naming to the Provisions, and a chapter waved off
  mid-tutorial with the chronicle whole afterwards — the lesson resuming across a reload on the way.
  Every other suite that starts a chronicle now reads Eldric's first lines through the helpers, and
  the battle suite starts from `fresh.chronicle`: a level-1 chronicle with the onboarding behind it,
  because that suite is about battles.

### Changed

- A lesson that sends the player somewhere only **points** at it — ring, caret and strip, with the
  screen still theirs; the lessons that dim and block are the ones inside a panel or a fight, where
  a wrong press is what confuses a new player (`USER_QUESTIONS.md` Q44).
- A turn lesson names the ability it teaches, because turn order is not always the starter's and a
  Common companion has one ability at level 1: the cooldown lesson waits for a turn that actually
  offers a second one.
- **Eldric waits his turn.** A lesson never opens over a dialog it does not name, so the Welcome
  Back report and a level-up are answered first — a lesson holds the screen while it speaks, and
  two things holding it at once is a player with nothing to press. Every lesson also names *where*
  it is taught, which the validator now requires: one that did not would speak on the title screen.
- A lesson is taught where its pointer can rest, and the name of a chronicle is taught on the
  starter screen as well as at the name field — a chronicle begun over another one would otherwise
  never be taught its first step.
- The auto-repeat lesson waits for the second repeat tier at level 20 rather than the first at 5,
  where chapter 4 already teaches two things (`USER_QUESTIONS.md` Q44).
- `ENERGY_PROVISIONS` ids are typed, and `provisionsClaimed` is the list of *one-time grants* paid
  rather than energy grants only.

### Fixed

- The Chronicler's Hall has been a hotspot on the hub since Phase 0 and never had a screen to open:
  clicking it explained that the Path was locked even when it was not. It opens the Path now, which
  is what chapter 5 teaches.
- The Game Modes cards' *Enter* buttons carry test ids, so the suite can reach them.

## [0.0.13] — 2026-09-16 — Phase 13: The Chronicler's Path

Eldric's mission line: ten chapters of twelve, walked in order from *Clear Thornwood Crossing 1-1*
to *Defeat Nyxara (Nightmare)*, with a chapter chest at every tenth of the way and Eldric himself
at the end of it.

### Added

- **The Path** (`missions` route, `UI_DESIGN.md` §5.15): ten chapter tabs, a rail of mission cards
  that opens on the mission being walked, Eldric beside the chapter with a line for it, and the
  chapter's own track with its chest. Every chapter can be read, not only the one in progress — a
  card still to come says what it will ask for, and a state predicate the chronicle already
  satisfies shows as met behind its lock.
- **120 missions as data** (`content/missions/chapter_01..10.ts`): the design's tables exactly,
  each mission a goal from the shared DSL plus what it pays. A chapter file is goals and rewards;
  the id, the i18n key and the glyph all follow from where a mission sits.
- **Eighteen more goal types** (`engine/quests/goals.ts`), most of them state predicates, because
  that is what a mission line asks about: a stand cleared on one difficulty, a settlement's or a
  difficulty's stars, copies owned by rarity, champions at a level or a rank (or both), a champion
  whose every ability is finished, the strongest party the chronicle could field, pieces worn by
  one champion, a complete set group, pieces at a level in the racks or on one champion, what this
  period's keys put into a boss tier and the best a tier ever took — plus narrowed counters for a
  craft bench, a summon shard, a boss tier and a day on which five daily quests were claimed.
- **The line, derived** (`engine/missions/path.ts`): the chronicle is always on the first mission
  it has not claimed, so the whole Path is a function of one list of claimed ids — no pointer to
  keep in step with the content, and a mission inserted in a later release simply becomes the next
  one walked into. A chapter opens when the chapter before it is finished.
- **Save v11** with that list, the counters the open mission started from, the chests taken and the
  piece Eldric's gift was struck as. The migration from v10 starts every chronicle at the first
  page with today's counters as the baseline: the counter missions ask for play from here on, the
  state missions read as already met, and a deep chronicle walks them a claim at a time.
- **Eldric's own reward**: the last chapter's chest adds him to the roster with the ribbon a summon
  gets, and opens the dialog that names his parting gift — a 6★ Legendary piece in the slot and set
  the chronicle chooses, struck once and seeded by the choice so a reload cannot reroll it. Gear
  now records `mission` as a provenance.
- `tests/e2e/missions.spec.ts` and `tools/fixtures/path-chronicle.ts`: the chronicle the ROADMAP's
  acceptance asks for — six chapters claimed, their chests taken, Intro mastered — opening on
  chapter 7 and carrying on, in a production build and through the v11 save.

### Changed

- Mission 2.5 asks for **a rank-up** rather than the design's *"rank up a champion to 3★"*: a Rare
  starts at 3★ and every starter is a Rare, so the row would have completed itself before it
  opened. Chapter 4.3 keeps *to 4★* as the first rank a Rare has to climb to. `USER_QUESTIONS.md`
  Q43 records it with the switch back.
- `boss.fights.<boss>.<tier>` and `forge.crafts.<tier>` are counted now, because the Path asks for
  a key spent on one tier and a piece struck at one bench.
- `DIFFICULTIES` is the tuple the difficulty type derives from, so a schema can name it without a
  cast.

## [0.0.12] — 2026-09-16 — Phase 12: Daily & Weekly Quests

The Chronicler's Ledger: ten quests a day and eight a week, a points track with a chest at every
threshold, and a board that is derived from the play rather than driven by it.

### Added

- **The goal DSL** (`engine/quests/goals.ts`, `content/quests/types.ts`): seventeen goal types in
  two families. A *counter* goal (`clear_stages`, `summon`, `boss_fights`, …) is measured as a
  delta against the counter's value when the period began, so yesterday's play never finishes
  today's quest. A *state predicate* (`gear_reach_level`) is read live off the save, because it
  asks what the chronicle *is* — levelling a piece to +12 and then to +16 counts once. `any`
  finishes on the closest of several ways ("craft or dismantle"). One test per goal type.
- **One owner for the lifetime counters** (`engine/progression/counters.ts`): every counter the
  game writes is named in `COUNTER_KEYS`, `bumpCounter` refuses anything else, and the content
  validator checks each goal against the list — a quest can no longer name a counter nobody
  writes and sit at zero for ever. Suffixed families (`boss.fights.<bossId>`,
  `summon.pulls.<shardId>`) are declared as prefixes. `battles.won.manual` is new, for the quest
  that asks for a victory the player steered.
- **The boards** (`content/quests/{daily,weekly}.ts`): ten dailies of ten points with chests at
  20 / 40 / 60 / 80 / 100, the hundred paying an Ancient Shard instead of its gems on every third
  full board; eight weeklies worth a hundred between them (20 / 15 / 15 / 15 / 10 / 10 / 10 / 5)
  with chests at 25 / 50 / 75 / 100. A quest whose feature is still locked is hidden and the
  period's replacement quest — *Win 3 battles*, *Win 20 battles* — carries exactly its points, so
  a hundred is reachable the day a board opens and at every unlock state after it (a test walks
  every feature-unlock level).
- **The Chronicler's Ledger** (`quests` route, `UI_DESIGN.md` §5.14): Daily and Weekly behind
  their own tabs, each with its reset countdown, a points track with a chest at every threshold
  (each naming its contents on hover, the daily hundred naming its cadence), a row per quest with
  glyph, line, progress, points and reward, *Claim* per row and *Claim all* for the lot. The hub's
  Quests button opens it and wears a badge counting what both boards owe; the Welcome Back panel
  says when a board turned over while the game was closed.
- **Save v10**: a record per period holding the period's key, the counters it began with, what has
  been claimed and whether its day has been counted. The migration from v9 baselines both boards
  against the counters already earned, so a hundred hours of play does not hand over a finished
  board (`tests/fixtures/saves/v9.json`).
- `tests/e2e/quests.spec.ts`: the ledger in a production build — the day's ten rows, a claim that
  pays and cannot pay twice, the Idle Chest opened at the docks finishing the quest that asks for
  it, the 20-point chest taken, and all of it still there after a reload.

### Changed

- Claiming is the only thing that writes. The board itself — which quests are shown, how far along
  each is, the points, the chests — is derived on every read from the save and the clock, the same
  discipline the period bosses use (ADR-033, applied to quests in ADR-040): a record whose stored
  key is older than now *is* a fresh board, so there is no midnight job, nothing to run twice, and
  a rollover that happened while the game was closed lands exactly once.
- A reward list that names energy pays into the pool rather than into the wallet, in one place
  (`state/payout.ts`), and a "Claim all" that takes five quests pays one pile of gold rather than
  five.

## [0.0.11] — 2026-09-16 — Phase 11: Weekly Boss

Nyxara, Mother of Shadows: three keys a week against a fight that changes gear twice, with two
Choristers standing in the way of every hit meant for her.

### Added

- **Nyxara and her chorus** (`content/bosses/nyxara.ts`): three tiers (5M / 40M / 250M pools,
  levels 30 / 50 / 60), six chests each from a sliver of the pool to the kill, 800 / 1,600 / 3,200
  chronicle XP a key, and a kit that opens as the fight goes on — Shadow Verse and Dirge (which
  takes the party's buffs and wears them) from the start, the Eclipse Hymn in phase II, Mother's
  Embrace in phase III, and the passive *Un-light* that dims every heal the party pays for once she
  is in her last gear. Her two Choristers sing beside her: while one stands it takes half of every
  hit meant for her, and they come back at every phase change and every twelve of her own turns.
- **Five engine mechanics, all data-driven** (`engine/battle`, `boss-phases.test.ts`): `phases` —
  descending HP fractions read at the boss's own turn, so a threshold a hit crosses lands on the
  beat after it; `minPhase` on an ability, which the rotation passes over until the fight gets
  there; `adds`, an escort that stands in the boss's own wave, takes its share through the same
  redirect Ally Protection uses (the buff wins when both apply) and is revived where it stands;
  `steal_buff`, which takes buffs newest first with their turns and value and leaves a shield where
  it is; and an `enemy_heal_reduction` passive that can ask for a phase (`selfPhaseAtLeast`).
- **The weekly gate**: the hub's Weekly Boss card carries the keys left and a dot when a chest is
  waiting, Game Modes' Weekly card opens the gate, and the gate's Weekly tab is Nyxara's — three
  tiers, six chests each, the week's countdown and her records.
- **The fight, on screen**: the pool bar gains a violet **Phase N/M** chip that pops on every gear
  change and a **Guarded X %** chip while any of her chorus still stands; the stage answers a phase
  with a midnight burst, a shake and the gate's own closing note, and the log records it. The
  escort stands on marks of its own (`ENEMY_ESCORT_SLOTS`) so a ×2.4 boss cannot swallow it.
- **The mechanics sheet** now prints how a fight changes (one line per phase band) and what stands
  with the boss — how many, the share they take, and how they come back.
- `tests/e2e/weekly-boss.spec.ts` and `tools/fixtures/weekly-chronicle.ts`: a level-30 chronicle
  with four 6★ champions in full Legendary gear — the roster the fight is written for — spends a
  key, meets the chorus, banks the first chest's worth of damage and takes it, in a production
  build. `period-weekly.test.ts` holds the Monday 00:00 boundary: one key all week, the stroke that
  changes it, and a week whose numbers are all back to zero on the other side while the records
  survive.

### Changed

- **Nyxara's phases are 90 % / 75 %, not the 70 % / 35 % the design first printed**, and each
  Chorister holds 2 % of the pool. Both numbers come from measuring the fight rather than drafting
  it. A key spent by the roster she is written for — four 6★ champions in full Legendary gear —
  took an eighth of the pool at the drafted thresholds, with the chorus taking half of every hit
  meant for her: her last two gears would never have fired. A chorus a tenth of this size dies on
  the turn it appears (six split hits in a whole race, against forty at 2 %), which is no choice at
  all. `USER_QUESTIONS.md` Q41 records the measurements and the switch back, ADR-039 the rule.
- The auto policy's last-resort ability now respects `minPhase` as well as cooldowns, so a boss in
  phase 1 can never open with a phase-3 ability when everything else is spent.
- `damageToBoss` already counted only the boss's own definition id, so an escort's health never
  feeds the week's pool — now with a boss that has one, and a test to say so.

### Fixed

- **A retreat mid-fight could throw once a frame until the numbers finished falling.** A damage
  number lives about a second after the hit that made it, and the presenter's batch can be longer
  than that — but a retreat tears the stage down at once. GSAP knew nothing about it and kept
  writing `y` into a destroyed `Text`, which CI caught as twelve `Cannot set properties of null` on
  the daily boss's race. Both layers now keep what they have in the air and kill it before anything
  is destroyed: `NumberLayer` its number timelines, the stage its event batches.

### Performance

- The bench fights the heaviest stage the game draws now: `pnpm perf:battle --weekly` runs Nyxara's
  Normal race — a ×2.4 washed sprite, its escort beside it, seven units and the phase beats —
  beside the stress fight and the daily boss's.
- `pnpm perf:battle --software` in this GPU-less build environment (SwiftShader, 1920 × 1080, ×4,
  auto, four maxed legendaries and no gear — which is why the weekly race ends in a defeat):

  | scenario | p50 | p95 | max | frames | fight |
  | --- | --- | --- | --- | --- | --- |
  | Stress Bench, 4 v 4 × 2 waves | 383.4 ms | 416.7 ms | 416.7 ms | 59 | 31.4 s, victory |
  | Gravemaw Easy, 4 v 1 race | 366.7 ms | 416.7 ms | 433.3 ms | 55 | 30.5 s, victory |
  | Nyxara Normal, 4 v 3 race | 400.0 ms | 433.4 ms | 450.0 ms | 70 | 37.6 s, defeat |

  Software WebGL renders the stage at two or three frames a second, so these runs only prove the
  bench pipeline and that the weekly fight costs about 4 % more than the stress fight it is
  measured against — three more sprites and a phase burst, no new render path. The 16 ms p95 budget
  is still signed off on the owner's iGPU laptop (`USER_QUESTIONS.md` Q30). No console problems in
  any of the three fights.

## [0.0.10] — 2026-09-15 — Phase 10: Daily Boss

Gravemaw, the Bone Tyrant: a damage race in four tiers, two keys a day, and damage that adds up
across them. Losing costs nothing but the key — whatever the party did to him still counts.

### Added

- **The boss gate** (`bosses` route, `UI_DESIGN.md` §5.13): records on the left (best damage per
  tier with the team that set it), Gravemaw on his own stage under the dungeon gate, a card per
  tier with the period's damage against the pool, the chest ladder (5 / 15 / 30 / 60 / 100 % of the
  pool, locked / claimable / claimed, contents on hover) and the personal best. The bottom bar says
  what a key opens; the reset and the keys left tick in the header.
- **Gravemaw's kit, authored as data** (`content/bosses/gravemaw.ts`): Bone Crush, Grave Quake,
  Devour and the passive *Tyrant's Hide*, on the fixed rotation `A1 A1 A2 A1 A3`, with the four
  tiers' printed stats (250k → 60M pools, levels 20–60) and per-tier chests. Four engine effects
  grew to carry it: a status with a target cap, a heal that counts the curses on its target, a
  damage reduction that only answers crits, and the distinct-debuff counter that breaks it.
- **Keys, pools, chests and records** (`engine/bosses/period.ts`, save v9): the period a boss's
  numbers belong to is stored, so keys, damage and claims are all fresh again the moment the day
  turns — nothing runs at midnight, and a clock that moved cannot desynchronise it. Unclaimed
  chests are not lost at a reset: the next visit pays them as tribute in the Welcome Back panel.
- **A boss HUD in the fight**: the pool bar carries *Unshakeable* (with the immunity list),
  the enrage as a countdown in the boss's own turns and then "Enraged ×N · +X % ATK", and a chip
  for every counting passive the party breaks — the stage shouts it, the battle log records it.
- **A boss result screen**: no stars, no spoils — the damage this key did, the pool after it, a
  personal-best line, the chests it just earned, and *Back to the gate*.
- **The mechanics sheet** (*How it fights*): the kit in rotation order described from its own data,
  what never lands on him, and four tips — including the enrage's real numbers.
- `tests/e2e/boss.spec.ts` and `tools/fixtures/boss-chronicle.ts`: two keys into one pool, a chest
  taken once, and the period surviving a reload, in a production build. `period-dst.test.ts` asks
  the reset question in a time zone that shifts — on the 23-hour night the period is still one day
  and the countdown is 22 hours, not 24 — and the content tests replay a race twice on one seed to
  hold the rotation to `A1 A1 A2 A1 A3` with Devour starting on cooldown.

### Changed

- **A boss's enrage is its own cadence, and it fires** (ADR-036). One global constant (+10 % ATK
  every 8 own turns) suited a campaign stage boss; measured with `tools/sim`, a race lasts Gravemaw
  6–16 own turns, so the design's "enrage turn 20" would never once have landed. The cadence now
  belongs to the boss block, Gravemaw enrages from his 12th own turn every 2 (about +60 % ATK by
  the turn limit), campaign enemies keep the numbers Phase 3 was balanced against, and the content
  validator rejects a threshold that could not fire inside a race.
- **Placeholder art can read pale** (`art.desaturate`, `ASSETS.md` §3, ADR-037): a multiply tint
  can only darken, so the Bone Tyrant was a green lizard with a bone-coloured name. Both renderers
  now take the model's light and shade and paint the tint over it — `mix-blend-mode: color` on the
  DOM sprite's tint layer, a greyscale copy of the atlas baked once at load on the Pixi stage — so
  he is bone at the gate and in the arena, and the stage's render path stays filter-free (the
  frame budget is why: CLAUDE.md §5.6).

### Fixed

- Each model atlas loads into its own Pixi cache namespace, so entering a battle no longer warns
  about the `idle_0…idle_8` frame keys every model shares.
- Leaving a boss fight no longer warns about texture sources destroyed under a live shader: the
  wash that caused it is baked at load rather than filtered per frame, so the renderer holds no
  filter bind groups to tear down (ADR-037).
- The result screen's hints are true again: "your champions are under-levelled" only appears when
  one of them actually is, and it no longer points at the Tavern as something still to come. A boss
  result reads its own advice instead of the campaign's.
- **Leaving a boss result through *Emberhold* poisoned the next campaign run.** The race session
  stayed standing, and the battle screen asks the race first, so the next stand's damage was banked
  into Gravemaw's pool and the run's own stars, drops and clear were never recorded. Each launch
  now clears the other kind's session, on both sides, and a test holds that line.

- A Game Modes card that is not open yet goes to the locked screen again. Giving the Daily Boss
  card a route made it push that route even while the feature was still shut, which skipped the
  screen that says when it opens; the card now hands its unlocked state to the press.
- The e2e suite runs one browser at a time everywhere, not only on CI (`playwright.config.ts`).
  Playwright's default puts two software-WebGL stages side by side, and they starve each other:
  a boss race that takes 35 seconds alone ran past a seven-minute budget next to the Portal's
  rituals. Wall-clock is the cheaper thing to spend — and CI now spends it in two shards on two
  runners (`ci.yml`), because one serial job with a 50-turn boss race in it ran out its budget.

### Fixed

- **A retreat mid-fight could throw once a frame until the numbers finished falling.** A damage
  number lives about a second after the hit that made it, and the presenter's batch can be longer
  than that — but a retreat tears the stage down at once. GSAP knew nothing about it and kept
  writing `y` into a destroyed `Text`, which CI caught as twelve `Cannot set properties of null` on
  the daily boss's race. Both layers now keep what they have in the air and kill it before anything
  is destroyed: `NumberLayer` its number timelines, the stage its event batches.

### Performance

- The perf bench (`/?screen=perf`) fights either scenario now, and `pnpm perf:battle --boss` drives
  the new one: the boss race is what the phase added to the render path (one 2× washed sprite, the
  pool bar and its chips, a fight that runs to the turn limit).
- `pnpm perf:battle --software` in this GPU-less build environment (SwiftShader, 1920 × 1080, ×4,
  auto, four maxed legendaries):

  | scenario | p50 | p95 | max | frames | fight |
  | --- | --- | --- | --- | --- | --- |
  | Stress Bench, 4 v 4 × 2 waves | 400.0 ms | 466.7 ms | 516.7 ms | 60 | 31.9 s, victory |
  | Gravemaw Easy, 4 v 1 race | 366.7 ms | 433.3 ms | 466.5 ms | 55 | 31.3 s, victory |

  Software WebGL renders the stage at two or three frames a second, so these runs only prove the
  bench pipeline and that the boss fight is no heavier than the stress fight; the 16 ms p95 budget
  is still signed off on the owner's iGPU laptop (`USER_QUESTIONS.md` Q30).

## [0.0.9.1] — 2026-09-15 — Chest pass

Owner's check-in after Phase 9: the chest was paying too much, in too many kinds — "this chest
should be a nice little bonus only. Do not add too many rewards."

### Changed

- **The chest is priced against a single campaign run** at the tier it farms (ADR-035). Gold is
  `120 × tier` an hour — one run's worth — where it was `250 × tier^1.25`: a twelve-hour chest at
  tier 12 pays 17.3k instead of 67k, and a full day at tier 36 pays 104k instead of 529k. Chronicle
  XP is a quarter of what it was (`5 × tier` an hour), and the band materials are trimmed to
  1 / 0.4 / 0.18 an hour.
- **Brews are luck, not an hourly line, and only ever the farm settlement's own element.** One
  potion is 1,500 champion XP, so paying them by the hour made the chest out-earn the campaign's
  own 12 %-per-run brew drop several times over — 18 brews across three elements in a single
  twelve-hour fill. Now a 6 % chance an hour, at most two per fill: a chest has one brew more often
  than not, and never a third.
- **Two rewards are gone rather than reduced**: Arcane Dust (every campaign run drops some, and the
  chest was paying thirteen runs' worth a fill) and the gear roll (armour comes from the campaign
  and the Forge — and a piece the racks were too full to hold was a reward that vanished). Gems and
  the Faded Shard are trimmed a little (8 % and 5 % an hour, gems capped twice per fill).
- The preview is four lines now — gold, the band's material, energy and chronicle XP — with the
  luck still unlisted, because finding it is the point of opening it.

### Fixed

- **The chest paid every band's material, not its band's.** `IDLE_MATERIALS` was read as a
  cumulative list, so a tier-30 chest paid Scrap Iron *and* Ember Alloy *and* Starsteel — three
  lines where the design says one, and the thing that was supposed to keep the three Forge tiers on
  three different farms. A tier now pays its own band and nothing beneath it.

### Answered

- **Q40**: a chronicle that predates the chest is paid for the time it was away. The migration
  starts the chest at the chronicle's last save, and the capacity cap means that is at most one
  full chest — a welcome back rather than a windfall.

## [0.0.9] — 2026-09-15 — Phase 9: Idle Chest

### Added

- **The chest at the docks** (`ECONOMY.md` §6). It fills whether the game is open or closed, up to
  a capacity that grows with the chronicle's level (3 h at level 1, 24 h from 60), and pays the
  farm tier's hourly yield when it is opened. Everything past capacity is lost, which is the "come
  back in time" tension the brief asks for.
- **One stored number.** The save keeps only when the chest was last emptied; how full it is and
  what is inside are derived from that instant and the clock (ADR-033). Nothing accrues in the
  save, so a reload, an import or a clock that jumped cannot desynchronise the chest from the time
  the player actually waited — and a clock moved backwards waits rather than paying out.
- **The farm tier** 1–36: the highest settlement whose boss has fallen, counted across the three
  difficulties end to end, taking the best of the three (ADR-034) so a chronicle that has just
  unlocked Normal keeps the tier it earned on Intro. Gold per hour is `250 × tier^1.25` (250 at
  tier 1, 5.6k at 12, 22k at 36); brews, Arcane Dust, the band's own Forge material, energy and
  chronicle XP follow the table in `balance/idle.ts`.
- **Luck, once an hour, capped per fill**: 10 % for 5 gems (three times at most), 6 % for a Faded
  Shard (twice), 1 % for an Ancient Shard (2 % from tier 25, once), 8 % for a piece of gear
  (twice). The rolls are seeded from the fill's own start instant, so reading the chest a dozen
  times before opening it changes nothing inside — and a gear piece rolls from the settlement the
  chest farms, exactly as a run there would drop it.
- **The chest wears its state where the player already looks**: a gold ring and a countdown on the
  building at the docks, the same chest framed like a currency pill in the top bar (reachable from
  every screen), and a dot on both once it has stopped counting.
- **The claim dialog**: how full, how long until it stops paying, which settlement it farms, and
  the guaranteed contents. The luck is left unlisted because it is the point of opening it. Under
  the tier sits the band line — what the chest holds now and what the next chronicle level band
  holds — which is the one place the game says out loud that levelling widens the chest. Opening it
  replaces the preview with a line for each stroke of luck, the pieces it minted, and a word about
  the armoury when one could not be kept. Energy lands in the pool rather than the purse, and
  chronicle XP is paid last so a level-up's refill lands on the new cap.
- **Save v8** with the chest's timestamp. Migration 7→8 sets it to the chronicle's last save, so a
  player returning to a game that predates the chest is paid for the time they were away instead
  of finding it empty; `tests/fixtures/saves/v7.json` is frozen as the case.

### Fixed

- **A summon could spend its shards and show nothing.** The reveal waited for the gate's ritual to
  finish, and GSAP stretches a timeline's wall-clock when frames are scarce — so on a machine busy
  enough (a software renderer, a laptop under load) the ceremony crawled and the cards never
  landed, shards already gone. The gate now lands itself at its end after six seconds and the
  reveal has its own backstop for a ritual that never answers at all: a press that shows nothing is
  the one outcome a summon may never have.
- **The notification dot was a square.** It had been rendering as an orange rectangle on hub
  hotspots since Phase 0 — a dot is one of the round shapes the design language allows, and the
  counted variant is now a bevelled badge rather than a pill.
- The fill ring is an SVG arc rather than a masked conic gradient: exact at any size, and it
  cannot be defeated by a renderer that ignores the mask, which is what happened here — the masked
  ring read as a solid disc in a production build.

### Open question

- **Q40**: a chronicle that predates the chest is paid for the time it was away — the migration
  sets the chest's start to the last save rather than to the upgrade (`USER_QUESTIONS.md`).

### Balance

- Idle income at tier 12 with a six-hour chest is ≈ 33.5k gold, 9 brews, 20 dust, 9 iron and 24
  energy per fill; at tier 36 with a 24-hour chest, ≈ 529k gold, 83 brews and 60 energy. The
  30-day economy simulation in Phase 15 checks this against the gold and gem budgets
  (`ECONOMY.md` §7–§8).

## [0.0.8] — 2026-09-14 — Phase 8: Summoning Portal

### Added

- **The gacha, as data** (`SUMMONING.md` §1). Four shards with the rate rows the doc names
  (Faded 60/30/10, Ancient 91/8/1, Sacred 92/8, Primordial 40/55/5), their mercy rules and their
  Exchange prices all live in `src/content/balance/summon.ts`. The validator refuses a row that
  does not sum to 100, a rarity with nobody summonable behind it, and a rotation that features a
  champion who is not in the pool at the rarity it claims — a silent rate change is the one bug a
  gacha must not have.
- **A pull is two seeded rolls.** The rarity comes from the shard's row, the champion from
  everyone summonable of it, with a featured champion weighted twice inside its own rarity.
  100 000 pulls per shard land within half a percentage point of the authored row
  (measured: Faded 60.03/29.94/10.04; Ancient 89.11 Rare / 9.41 Epic / 1.48 Legendary with mercy
  running; Sacred 88.81/11.19; Primordial 39.12 Epic / 54.98 Legendary / 5.90 Mythic).
- **Mercy that quotes what it rolls with** (`SUMMONING.md` §2). A hard guarantee replaces the
  rarity outright; a soft climb bends the row and is taken out of the commonest rarity, so the
  table still sums to 100 and a shard can never quietly out-give its own doc. The guarantee
  replaces the *result*, not the roll: the rarity roll is still drawn, so a saved chronicle
  replays its summons exactly. Epic within 20 Ancient pulls, Legendary within 15 Sacred, Mythic
  within 50 Primordial — all three are tested, as is the worst gap over ten thousand pulls.
- **The featured rotation, with no server** (`SUMMONING.md` §3). Fourteen days per turn from a
  fixed UTC epoch, so the same instant gives the same rotation in every time zone and after every
  reload; a test walks four zones. Every fourth turn is a Primordial Rotation: Varkos is featured
  and his mercy climbs sooner. The cycle repeats when it runs out of authored rotations, so a
  chronicle played far past the last row still sees a coherent banner.
- **The reveal ritual** (`SUMMONING.md` §5). A Pixi scene on the violet gate: the chosen shard
  hangs in the ring, drops when the press comes, twelve runes light in sequence, cracks spread and
  leak light in the rarity's colour, and the burst opens the gate. A Legendary adds the gold pillar
  and the screen flash; a Mythic adds the rose pillar, a shockwave and a beat of slow-motion.
  Skipping cuts the running timeline to its end at any point — the result is the same, the waiting
  is not.
- **Seven synthesised sounds for it** (owner's answer Q24): a charging swell with four rune taps,
  the cracking, and one reveal per tier, the Mythic's chime unique to it.
- **The Portal screen** (`UI_DESIGN.md` §5.12): shards on the left with what the purse holds, the
  gate in the middle, the banner on the right with its rotation timer, chances, mercy and the
  Exchange, and **Summon ×1** / **Summon ×10** along the bottom. Rates and the last two hundred
  summons are one tap away.
- **Ten cards, rarest last.** A ×10 reveals in a 5×2 grid in sequence with the best saved for the
  end and marked; every card says whether it is a first copy or rank-up material. Duplicates are
  ordinary roster copies and are never auto-converted into anything (owner's answer Q8).
- **The Intro milestone's Epic** (`CAMPAIGN.md` §7, carried from Phase 3). The picker offers every
  summonable Epic, owned ones included. Which choices are *owed* is derived from the campaign's
  stars and only the taking is stored, so a chronicle that mastered Intro before the Portal existed
  is owed its Epic the moment it opens the Portal — and can never take a second.
- **A new-champion badge.** A copy the Portal delivers wears a "NEW" ribbon in the Champions index
  until the player opens it, and Emberhold puts a dot on the buildings that owe something: the
  Champions hall while ribbons are outstanding, the Portal while a choice is unclaimed.
- **Save v7** with the Portal's slice: mercy counters per shard type, a pull history bounded at
  200 records, the copies not yet looked at, and the choices taken. Migration 6→7 opens a clean
  Portal on any chronicle, with `tests/fixtures/saves/v6.json` frozen as the case.

### Changed

- The Exchange is the gem sink EA-0.1 ships instead of a Market (owner's answer Q5): Faded for
  gold, Ancient and Sacred for gems, Primordial never sold.
- A new chronicle starts the Portal on the Standard Gate and the Faded Shard, and a reset returns
  it there.

### Fixed

- The ritual waits for its own scene. A press that lands before the (async) Pixi scene has
  finished initialising now waits for it instead of skipping the ceremony — on a slow machine that
  was the difference between a ritual and a card appearing out of nowhere.

### Open question

- **Q39**: a ×10 plays one ritual, lit by the best pull in it, rather than ten rituals in a row
  (`USER_QUESTIONS.md`). Switchable in `RevealOverlay` if the owner wants the longer ceremony.

## [0.0.7] — 2026-09-14 — Phase 7: The Forge

### Added

- **Crafting, three tiers deep** (`GEAR.md` §6). Scrap, Ember and Star each name their own
  materials, gold, rarity band, star band and set pool; a craft goes through the *same* generator
  a drop does, so a struck piece is exactly as good as a fallen one of its rarity and star. Ten
  thousand crafts per tier are checked against the table, and the tier tables live in
  `src/content/balance/forge.ts` where a balance pass can find them.
- **A Glyph Sigil names the set.** With one spent, the craft comes out as the set the recipe
  asked for; without one the tier's pool is rolled. A Sigil naming a set the tier does not carry
  is refused rather than quietly spent.
- **Dismantling, by the selection.** A press breaks what is chosen, returns the materials its
  rarities list and a fifth of the gold its levels cost, and refuses the whole selection when one
  piece is worn or locked — a partial break is worse than none, because the player cannot see
  which half went. Quick picks take the Common and Uncommon, the never-levelled, or the 1–2★.
- **Refining, one star at a time** (`GEAR.md` §4). A twin of the same slot and star is consumed,
  Refining Cores and gold are paid, and the piece keeps its rarity, its level and every substat
  value; only the main stat is re-based onto the new star's row — which is the point of it, and
  what makes a refined piece a little weaker than a native drop of that star.
- **The Forge screen** (`UI_DESIGN.md` §5.11): three benches around one anvil. The hammer falls
  on a stone block over the hearth's light and the struck piece is revealed on it; the dismantle
  bench prices a selection before it breaks it; the refine bench shows the stars and the main
  stat either side of the climb. Below player level 18 the refine tab names the level it opens at
  rather than hiding.
- **Both screens are one press apart.** The Armoury keeps its own route (owner's answer Q36) and
  the Forge links to it, and back. The hub's forge hotspot finally opens something.
- **Glyph Sigils have a source.** Their designed homes are the weekly boss and the quests
  (Phases 9–13), so until then the 20-star chest of each difficulty carries them — Intro 1,
  Normal 2, Hard 3 (`USER_QUESTIONS.md` Q38).

### Changed

- Gear carries its own provenance vocabulary (`GEAR_SOURCES`: a drop or a craft) rather than
  borrowing the champions' `OBTAIN_SOURCES`: a champion is never struck at the Forge and a piece
  is never summoned. Every value an existing save holds stays valid, so no migration is needed.
- The lock finally protects something: dismantle and refine both refuse a locked piece.
- The development-only panel can stock a material chest, so the Forge can be played without a
  campaign grind first.

### Fixed

- **CI runs the e2e suite one browser at a time.** Playwright's default worker count (half the
  CPUs) put two WebGL battle stages on one two-core runner, and they starved each other until a
  click on a visible, enabled button timed out and a browser session crashed — the run then spent
  its retries on the same starvation and hit the job's 30-minute cap. CI is pinned to one worker
  and the job budget raised to 45 minutes; wall-clock is the cheaper thing to spend.

## [0.0.6] — 2026-09-14 — Phase 6: Gear

### Added

- **Gear, rolled from the doc's own tables.** One generator serves every source (`GEAR.md`
  §1–§3): the slot decides whether the main stat is fixed or weighted, the rarity decides how
  many substats a piece starts with and how large its rolls are, and the star band decides the
  numbers. A piece never duplicates its main stat or one of its own substats, and ten thousand
  generated pieces are checked against the tables in a test.
- **Levels to +16, priced before they are bought.** `cost(star, level) = LEVEL_COST_BASE[star] ×
  (1 + 0.35 × level)`, bought one level or four at a time with the running total on the button.
  The rolls land at +4, +8, +12 and +16 — a fourth substat while the piece has fewer than four,
  otherwise a bigger roll on one it already carries.
- **The fourteen sets fight.** Set bonuses are passives written in the same DSL champions use
  (`src/content/sets/*.ts`), so the battle engine learned only what the sets introduced:
  lifesteal on a hit and a chance to counterattack. Two-piece groups stack — six slots can carry
  three — and a doubled group grants two copies of its passive, each with its own id. Tests hold
  the doc's promises: Ember Guard adds its 15 % HP, Retaliation counters about three hits in ten,
  Lifedrinker heals a share of what it deals, Bulwark shields when a wave opens.
- **Save v6 and the armoury.** `inventory` holds every piece the chronicle owns and
  `counters.gear` mints their ids; a chronicle from Phase 5 migrates to an empty armoury, with a
  frozen `v5.json` fixture guarding the step. Equipping is a swap — a slot holds one piece, a
  piece has one wearer — and every action is all-or-nothing.
- **Campaign drops are real pieces.** A run mints its drops from the seed the rest of the run
  used, from the settlement's own sets (`CAMPAIGN.md` §7) or the wider catalogue, in the star
  band the settlement allows. The result screen names what dropped, and says when the racks were
  too full to hold it.
- **The Armoury** (`UI_DESIGN.md` §5.11, the Inventory tab the Forge grows around in Phase 7):
  racks with filters for slot, rarity, set, stars, worn and locked, five sorts, a capacity band
  that warns at 90 % of 400, and one piece on the bench with its main stat, its substats and the
  rolls behind them, its set, its wearer, the +1/+4 buttons and the lock.
- **The champion Gear tab** (`UI_DESIGN.md` §5.4): six slots showing what is worn, the set
  bonuses the build has earned and how many pieces the next group needs, and a picker per slot
  that answers before it acts — every stat before and after, the power either side, the sets the
  swap makes or breaks, and a confirmation when the piece is on somebody else.
- **The Armoury is on the hub's bottom bar**, gated at player level 3 like the rest of the gear
  feature, and the Chronicle Debug panel can stock the racks with twelve pieces.

### Changed

- **Power includes gear everywhere it is shown** — the Champions index, the Tavern rail, the
  battle setup and the compare panel all read `totalPower`, which is base stats plus what the
  pieces carry plus what their complete sets add.
- The Champion Info tab's second stat column is no longer a placeholder `+0`: it carries what
  the gear and its sets add on top of the base.
- Battle units are built from `gearedStats`, deliberately *without* set bonuses: the battle
  applies those through the passive engine like any other `stat_mod`, so baking them in would
  count them twice.
- Every gear set carries its own crest (`icon`), so a piece can be recognised on a card without
  reading its name.

## [0.0.5] — 2026-09-14 — Phase 5: The Tavern

### Added

- **The Tavern, with its three tracks.** Upgrade Level pours brews and retires companions into
  one champion's XP bar; Upgrade Rank spends `n` copies of `n★` and the gold from the table to
  light one more star; Upgrade Skills spends one tome of the champion's rarity per step. The
  rules are pure functions in `@engine/progression/tavern-*`, so the preview, the press and the
  tests all read the same numbers (`ECONOMY.md` §3).
- **Every safety rule lives in the engine.** A locked or favourite champion is never eligible, a
  champion can never eat itself, rank-up food must be the exact star tier and the exact count, a
  rarity's star ceiling holds, and an ability stops at its last step. A refusal spends nothing:
  the wallet is checked before anything is written, so a half-paid upgrade cannot exist.
- **The food finder.** Auto-fill seats the companions the chronicle loses least by — lowest
  rarity, then lowest level, then longest held — and the Tavern asks before retiring anyone Rare
  or better, or anyone who has been levelled.
- **The Tavern screen** (`UI_DESIGN.md` §5.5): the roster rail picks who is drinking, six seats
  flank the champion (the rank track shows exactly as many as it needs), a brew row pours by the
  glass, and the right column runs the three tracks with a live cost pill. The level preview
  names the level the offering reaches and warns when XP would spill past the star tier's cap.
  Levelling flashes with its stinger; a new star bursts gold.
- **Skill upgrades reach the battlefield.** The steps were already folded into abilities by
  `effectiveAbility` (Phase 1) and read by the battle engine (Phase 2); the Tavern is what buys
  them, so a sharpened ability changes its description text and its damage in the same press.

### Changed

- The Champions screen's Tavern button opens the Tavern with that champion already on the stool,
  instead of the "not yet written" gate.
- Champions eaten at the Tavern leave every team preset and "last used" they stood on, and the
  session stops pointing at them.
- `USER_QUESTIONS.md` §1 is empty: Q28–Q35 were answered "as recommended", so the eight defaults
  that were already shipping are now decisions.

### Fixed

- **Reduced motion now stops Framer's animations too.** A token rule has stopped CSS keyframes
  since 0.0.3, but Framer Motion animates in JavaScript and never saw the setting; the app is
  wrapped in a `MotionConfig` that follows the chronicle's setting (and the OS preference before a
  chronicle exists), so screen transitions, the level-up numeral and the Tavern's flares hold
  still when they are asked to.

## [0.0.4] — 2026-09-14 — Phase 4: Player Level & Profile

### Added

- **The level-up moment.** Every level a chronicle crosses pays `level × 200` gold, 50 gems on
  every fifth level, an Ancient Shard on every tenth and a Sacred Shard at 20/40/60/80/100, and
  tops the energy up by the **new** cap on top of whatever was left — the overflow is deliberate
  (owner's answer Q15). The numbers live in `src/content/balance/levels.ts`; `levelUpRewards`
  merges a whole run of levels into one payout, so a batch that crosses five levels pays and
  celebrates once.
- **The level-up dialog.** An ember burst behind the level reached ("Level 1 → 7" after a batch),
  what it paid, every feature it opened with a one-line hint, and any title it earned; spring-in
  numeral and `stinger.levelup`. It never interrupts a fight: levels gained mid-battle queue in
  `ui.levelUp` and celebrate on the screen that follows (`UI_DESIGN.md` §5.17a).
- **Titles.** Eleven titles in `src/content/titles/`, from *Chronicler* at level 1 to *Loremaster*
  at 100, with *Warden of Veyrath* for three stars on every stand of Hard. Which ones are earned
  is **derived** from level, campaign progress and roster size on every read (CLAUDE.md §5.5), so
  they can never disagree with the play; the only stored part is the single title the chronicle
  wears. The picker lists every title — earned in gold, locked dimmed with what they ask for.
- **The profile, filled in.** Identity header (avatar, name, worn title, level and XP bar) over a
  scrolling body: the standing grid (energy cap, stands cleared, champions owned, strongest
  champion, battles, victories, chronicle begun, time played), stars per difficulty, titles
  earned, and the next three level gates with what each opens. The top-bar chip carries the worn
  title and flares on a level-up (skipped under `prefers-reduced-motion`).
- **All-3★ milestone chests** (`CAMPAIGN.md` §7, carried from Phase 3): Normal pays 300 Gems and
  2 Sacred Shards, Hard pays 1,000 Gems, a Primordial Shard and the title *Warden of Veyrath*.
  The chest pays once, on the run that puts the last third star on the difficulty. Intro's chest
  (an Epic champion of the player's choice) waits for the Summoning Portal's picker in Phase 8,
  so `MILESTONE_CHESTS.intro` is `null`.
- **`actions.grantPlayerXp`** — the one door chronicle XP comes through. Campaign runs already
  used it; bosses, quests and missions will hand their XP to the same function, which fills the
  bar, pays every level crossed, queues the celebration and reports the titles it earned.

### Changed

- **Save v5.** `profile.titles` (a stored list) becomes `profile.title` (the one worn, or none);
  earned titles are derived. Migration 4→5 drops the list, and `tests/fixtures/saves/v4.json`
  freezes a Phase 3 chronicle — roster, campaign stars, best turns, wallet and all — as the
  regression fixture for it.
- **The result screen no longer plays the level-up stinger for the chronicle** — the dialog that
  follows it does. A champion levelling still gets its cue there.
- The avatar and title pickers return to the profile dialog they were opened from instead of
  dropping the player back to the game.

### Fixed

- **The asset build is reproducible again.** libvorbis stamps every stream with a random serial
  number, so encoding the same synthesised PCM twice produced different bytes — which changed 110
  audio entries' content hashes, and with them `MANIFEST_VERSION`, on *every* build. CI's
  `git diff --exit-code` on the typed manifest had failed on `main` since 0.0.2 because of it.
  `normaliseOgg` now rewrites each page with a fixed serial and the CRC that follows from it, so
  two forced builds of the same sources agree byte for byte.
- **The e2e console gate ignores Chromium's preload advisories.** With the manifest check fixed,
  the suite ran on CI for the first time in three phases and tripped on two browser hints about
  the first-paint preloads (`vite.config.ts` `preloadBootImages`): once the service worker controls
  the page it serves those images itself, and a slow runner boots past the "used within a few
  seconds" window. The hint still warms the cache on a first visit, so the warnings join the
  WebGL driver chatter in `tests/e2e/helpers.ts`.

### Balance

- `LEVEL_ENERGY_REFILL` (on) documents and controls the refill: with it, an auto-repeat batch that
  levels the chronicle keeps running well past the energy it started with — intended, and recorded
  as Q35 with the one-line switch if it should stop instead.

## [0.0.3] — 2026-09-13 — Phase 3: Campaign

### Added

- **Twelve faction rosters (84 enemies).** Every settlement fields its own faction: six
  rank-and-file units re-skinning the shared archetype kits (`ab.arch.<archetype>.<key>`, so a
  faction file is names, element and tint — never a copy of a kit) plus one named stage boss with
  its own kit, rotation, immunities and enrage (`CAMPAIGN.md` §5–§6).
- **Twelve settlements, 120 stages.** Each settlement is authored once — faction, dominant element,
  backdrop, colour grade, surface, gear-set pool and ten wave lines — and `defineSettlement`
  derives the wave shape from the design table (`CAMPAIGN.md` §4), leading the boss stage's last
  wave with the faction's boss. Stage ids are `stage.<settlement>.<stage>`.
- **Campaign balance tunables** in `src/content/balance/campaign.ts`: energy per band and
  difficulty, star and defeat turn limits, star-chest thresholds, plate levels, gold/XP/drop/shard
  /brew rates, material ranges, first-clear and star-chest bundles, auto-repeat tiers
  (`CAMPAIGN.md` §2, §3, §7, §9).
- **Stage encounters are derived, not stored.** `stageEncounter(settlement, stage, difficulty)`
  builds the encounter for any of the 360 stage/difficulty pairs — scaling index, plate level,
  limits, backdrop and music included — and the registry resolves and memoises them by id
  (`encounter.stage.<nn>.<nn>.<difficulty>`), so a save only remembers a stage and a difficulty.
- **Campaign content validation.** Settlements, stages and factions are Zod-validated with their
  cross-references: ids carry their index, stage waves may only field their own faction, the boss
  leads only the boss stage's last wave, every faction fields all six archetypes and every
  authored enemy is fightable somewhere.
- **`pnpm sim:balance`** — the campaign's difficulty-curve report. It runs every stage on every
  difficulty with the reference teams in `tools/sim/teams.ts` (the roster a new chronicle is given
  at level 10 and at its star caps, a mid-Epic roster, and an endgame roster whose rank-up and gear
  are modelled until Phases 5–6 ship them), prints win and three-star rates per settlement, and
  checks the bands declared beside those teams. `--strict` fails CI when a band breaks; `--scan`
  prints the enemy scale each team can take, which is the table a tuning pass fits the constants
  to. CI now runs the band check.
- **The campaign engine** (`src/engine/campaign/`): energy per run and per band, the unlock chain
  (stage → settlement → difficulty, and ×3/×4 battle speed), star evaluation, seeded reward rolls
  and the run itself. Progress stores only what was played — stars and best turns per stage and
  difficulty — and everything else is derived from it, so a save can never disagree with its own
  progress: which stage is open, which chest was granted, where the player is next.
- **`ai.prefer` on abilities**: an ability can name who it goes for (`lowest_hp`,
  `lowest_hp_percent`, `highest_atk`, `lowest_def`) instead of taking its side's default. The
  Marksman archetype uses it to pick off the champion closest to death.
- **Save v4** carries campaign progress (stars and best turns per stage and difficulty, the stage
  the screens reopen on, and the auto-repeat count) with a migration from v3 and a frozen `v3.json`
  fixture. Runs go through the store: `startCampaignRun` charges the energy *before* the battle, so
  a reload mid-fight cannot yield a free run, and `finishCampaignRun` records the stars and pays
  the gold, materials, shards, brews, gems, energy and XP in one write.
- **Champions and the player now level from battle XP** (`ECONOMY.md` §3.1, §4): a win's XP fills
  the bar and levels while it can, stopping at the star tier's cap and reporting the overflow. The
  level-up moment — the energy refill, the rewards and the celebration — is still Phase 4's.
- `UnitReport.died` records that a champion went down even if it was revived, which is what the
  campaign's second star asks about.
- **The campaign is playable end to end.** The Game Modes card carries the stand you are on and
  opens the **campaign map** — twelve settlement banners with their stars, the difficulty
  selector and its gate, and the star-chest track. A settlement's screen lists its ten stands with
  stars, best turns, enemy chips, the star and defeat limits and a **Battle · ⚡cost** button, over
  a panel of what the place drops. Battle setup shows the stand's three-star conditions, the
  auto-repeat selector with how many runs the energy pays for, and what the run costs; the result
  screen shows the stars, a "New record" badge, every coin and material the run paid, first-clear
  and star-chest lines, the level-ups, and a **Next stand** button that walks straight into the
  stand the clear unlocked.
- **Auto-repeat** runs a stand up to fifty times in a row: a compact HUD counts the runs and the
  gold so far with a Stop button, and the batch ends on a defeat, on Stop, or when the energy runs
  out — the result screen then summarises the whole batch.
- The Chronicle Debug panel can set the chronicle level and clear a whole difficulty, which is how
  the unlock chain and the ×3/×4 speed gates are verified.

### Changed
- **Enemy scaling retuned (`BATTLE.md` §4.5, `CAMPAIGN.md` §5).** The old ladder was unwinnable:
  the linear `1 + 0.055 × g` term reached ×7.5 by the last stage and ×49 with Hard's multiplier,
  while a Phase-3 roster can only grow about ×3, so the campaign was lost from settlement 1
  stage 4 onwards at every champion level. The stage term is now quadratic —
  `1 + (STAGE_GROWTH_TOP − 1) × (g / 119)²`, ×1.00 → ×4.80 — which is nearly flat across the first
  settlements (where only levelling is available) and steep at the end; the difficulty step is now
  what the same stage costs per difficulty (×1 / ×2.5 / ×6); and the archetype and boss bases are
  65 % of their Phase 2 values. Measured result: a new save's roster at level 10 clears Intro
  settlements 1–4, grinds 5–6 and stalls at 7–8; a mid-Epic roster clears Intro and stalls in
  Normal's second half; the modelled endgame roster clears Hard, with three stars on its last
  settlement a real fight.
- The perf bench fights at ×5 enemy stats (was ×1.5) so it still runs 35–45 turns after the
  retune. On this GPU-less build environment it reports p50 216.6 ms / p95 233.4 ms over 97 frames
  of a 25.9 s fight — SwiftShader numbers, which say nothing about the 16 ms budget either way
  (USER_QUESTIONS.md Q30 still awaits a run on the owner's laptop).
- Battle speed is capped by campaign progress everywhere it can be chosen (the in-battle cycle
  button, the settings dropdown and every launch), so ×3 appears with Normal complete and ×4 with
  Hard instead of being hard-capped at ×2.
- `CONTENT_AUTHORING.md` §3–§4 now describe factions, derived stage encounters and settlements as
  they are actually authored, and its balance table names `campaign.ts` (the file the phase added)
  instead of the `drops.ts`/`enemies.ts` the plan had guessed at.

### Fixed
- `prefers-reduced-motion` now also stops CSS keyframes (entry rises, shimmers), not just
  transitions; the battle itself is Pixi and keeps its animation.

### Not yet
- The all-3★ **milestone chest** of `CAMPAIGN.md` §7 is not granted: Intro's reward is an Epic
  champion of the player's choice (which needs the Summoning Portal's picker, Phase 8) and
  Normal's and Hard's carry a title (Phase 4). Both are noted in those phases' scope in
  `ROADMAP.md`; everything else in the reward table pays out.

### Removed
- The three Training Grounds encounters and the seven Remnant enemies they fielded: the campaign
  replaces them, and the battle tests now fight Thornwood Crossing on Intro.
- The settlement-1 onboarding multiplier: with the retuned bases the opening stages need no
  special case.

## [0.0.2.1] — 2026-09-13 — UI pass

### Fixed
- **Panel textures now reach their frames.** Every kit surface drew the frame as the element's own
  `border-image` and the fill as a positioned child: a child always paints above its parent's
  border, so the fill could never reach under the ring and each panel, dialog, slot, pill, tooltip
  and toast showed a ring of backdrop between frame and texture (worst on the arch panel, whose
  top band is a real arch with a part-transparent ring). Frame and fill are now sibling layers
  (`KitSurface`), the fill bleeds under the ring up to each frame's measured transparent corner
  (`KIT_CORNER`, from an alpha scan of the textures), and the frame hides its edge.
- **Bars read as carved tracks again.** The groove was inset inside the track's own border, so at
  16–24 px it collapsed to a 4 px hairline: unit-plate HP, the profile XP chip and the locked-gate
  progress bar looked empty and their labels were unreadable. The groove is now the track's padding
  box, the stone and ember tracks are used at 40 px and up (where their carved rim fits) with a
  hairline frame in the same materials below that, labels and values are dropped below 20 px, and
  numbers are tabular gold on a hard shadow.
- **The gear tab.** A scrollbar thumb the full height of the panel (a few px of rounding counted as
  overflow) read as a bare orange line; the thumb now needs real overflow, is capped so it always
  reads as a handle, and sits in a carved channel with grip ridges. The six slots are labelled and
  the locked notice is a framed note.
- **Unit plates no longer collide.** Fixed 250 px plates overlapped at the 130–170 px enemy slot
  spacing and truncated each other's names; plates shrink to their content and the acting or
  targeted plate layers on top.
- The Training Grounds list dropped the Warlord drill when it was filtered to `kind: 'training'`
  (that encounter is boss-kind); it lists everything but the perf bench, with a content test.

### Changed
- Settings sliders are the kit's carved stone channel with an ember level, a glass highlight and a
  gold orb knob in the round kit frame, driven by a transparent range input so keyboard and drag
  stay native. The toggle track gained the gold hairline and its knob a grip.
- Screen sections that were flat scrims (the champions rail, the battle-setup team, enemy and
  roster columns, the battle ability bar) are one shared textured slab in the kit's materials
  (`surfaceStone`), so they read as carved chrome rather than web boxes.
- Pixel dividers are drawn as two mirrored halves: the art is a half ornament (lines running off
  one edge, the motif at the other), which rendered as a lopsided line with a stray tick.
- The "art pending" mark only appears on cards 128 px and up; on team slots and pickers it was
  clipped to a fragment ("…inding") and the placeholder tint already carries the meaning.
- The starter screen's bind button names the champion in full ("Bind Ser Corvin", not "Bind Ser").
- Gear and team slots are layered surfaces too: their recess texture reached only the ring's inner
  edge, so the panel behind showed through each frame's ornate corners. The locked marker is a
  badge inside the recess instead of a scribble across the frame's bracket, and the gear tab's
  slots and notice sit centred in the panel rather than above a long empty tail.
- Pixel dividers draw the ornament half first and the mirror second; reversed, the two motifs sat
  at the ends and the bare lines met in the middle, which read as a plain rectangle.
- `Panel` and `KitFrame` take `contentClassName` (layout for the content box) and a numeric
  `padding` measured from inside the frame's ring.

## [0.0.2] — 2026-09-13 — Phase 2: Battle System

### Added
- **Deterministic battle engine** (`src/engine/battle`). `createBattle` / `step` / `runAuto` /
  `replay` / `snapshot` / `retreat`: a whole fight is a pure function of the encounter, the party,
  the seed and the player's decisions (only manual decisions are logged; AI choices re-derive).
  Turn meter with closed-form ticks and seeded tie-breaks, element wheel, crit, mitigation with
  the per-level constant, ±5 % variance, all 26 statuses (stacks, refresh, immunity, block,
  cleanse/strip/steal, shields as % of caster HP, ally protection, counterattack, provoke, fear,
  freeze, sleep, stun, revive-on-death, DoTs and regen ticking at turn start), the full effect DSL
  (`damage`, `heal`, `apply_status`, `remove_status`, `tm`, `revive`, `extra_turn`, `detonate`,
  `leech`, conditionals), passives and auras, boss rotations and enrage, wave transitions, turn
  limits, timeout/retreat outcomes and a per-battle report (damage dealt/taken, healing, kills).
  The auto policy follows `docs/design/BATTLE.md` §7 (heal-skip above 90 % team HP, revive only
  with dead allies, TM rules, wave-start buff bonus, threat-weighted enemy targeting).
  71 engine tests cover every formula, effect and status; the same seed and decisions replay to an
  identical event log, and 1,000 random auto battles run headless in well under 10 s.
- **Enemy archetypes and the Training Grounds.** `defineEnemy` (the enemy twin of
  `defineChampion`) with seven Remnant archetypes (raider, marksman, brute, warden, hexer, mender
  and the Warlord boss), encounter definitions with waves, scaling, turn limits, backdrop, music
  and footstep surface, status metadata (`src/content/statuses`), Zod schemas and cross-reference
  validation (ids, i18n, backdrops, party sizes per kind). Three encounters on Game Modes →
  *Training Grounds* until the Campaign replaces them in Phase 3: two 3-champion fights and a
  4-champion Warlord fight with the boss bar.
- **Battle controller and presented view** (`src/state/battle`). Owns the live simulation, drives
  `step` with back-pressure from the presenter, holds the fight until the stage presenter attaches
  (`awaitPresenter`) so no turn resolves off-screen, folds every played event into the HUD's view
  (`applyEventToView`, a 400-event log for the Info panel), handles manual ↔ auto switches, pause,
  speed and retreat, and hands the outcome to the game store (`recordBattle`).
- **Pixi battle stage** (`src/render/battle`). 1920 × 1080 stage shared with the React HUD,
  ¾-perspective slots for four allies and four enemies, backdrop grading, ambient embers, idle
  model loops with placeholder tints, synthesised choreography (anticipation, lunge with speed
  lines, cast raise, projectile flight, hit-stop, shake, flash, dissolve, revive, wave slide-in,
  camera push), the FX library (`fx/registry.ts`: element casts, projectiles and hits, physical
  slashes with sparks, crits, heals, buffs, debuffs, shields, cleanses, DoT ticks, death smoke,
  turn-meter rune rings, ultimate bursts), floating numbers (damage, crit, heal, shield, status)
  and A4 cut-ins.
- **Generated VFX** (`tools/vfx`). Procedural flipbooks painted deterministically by recipes and
  rendered at build time through the asset pipeline as `fx.gen.*` strips with the same manifest
  shape as the owner's packs: slash arc, sparks, rune ring, smoke, speed lines. Tested for
  determinism and coverage.
- **Battle screens.** Training Grounds (encounter cards with waves, elements, clears), Battle
  setup (team slots with leader and aura, team power, three presets per mode with save/load,
  waves preview, control switch, free start), Battle HUD (unit plates with HP/shield/TM and status
  rows, target reticle, wave/turn/time counters, boss bar with statuses, turn banner, ability bar
  with cooldown pips and passive tag, Info panel with the battle log, Auto and ×1/×2 speed
  buttons, pause menu with resume/settings/retreat), Battle result (victory/defeat/time's up/
  retreat, turns, waves, per-champion report, hints, seed, Replay/Team/Emberhold). Hotkeys:
  1–4 abilities, Tab target, Space/Enter confirm, A auto, +/− speed, I info, Esc pause.
- **Team presets, save v3.** `teams.campaign` / `teams.boss` with three presets and the last team
  per party size; migration 2→3 and the frozen Phase 1 save `tests/fixtures/saves/v2.json`.
  Settings gained `battleSpeed` and `autoBattle`.
- **Battle audio.** Sound keys for battle start, melee/ranged attacks, light/heavy/crit hits,
  blocks, element casts, heal, buff, debuff, death, revive, wave, ultimate, victory and defeat,
  mapped to the owner's packs plus generated victory/defeat stingers; the music state switches
  to `battle` / `boss`.
- **Perf bench.** `/?screen=perf` (code-split, never linked from the game, like the DevKit)
  fights the Stress Bench encounter (4 v 4, two waves, ×4, four maxed legendaries) on the real
  battle screen and reports p50/p95/max frame times; `pnpm perf:battle` drives it headlessly
  (`--strict` fails over the 16 ms budget, `--software` forces SwiftShader).
- **E2E.** `tests/e2e/battle.spec.ts`: manual battle with mouse and keyboard, Info log, pause,
  speed and auto to a victory; auto beats Training Grounds 1 and 2 with the starting roster;
  retreat; presets.

### Changed
- `Bar` draws a hairline stone frame below 24 px so plate and chip bars keep a visible fill.
- The game window and stage use `overflow: clip`: a focus or scroll-into-view on a partly hidden
  element can no longer scroll the whole game out of place.
- Game Modes lists four cards (Training Grounds first); the navigation e2e counts four.
- The engine's `wave.started` event carries the spawned units' views so the HUD and the stage can
  add them without reaching into the simulation.

### Fixed
- Auto battles started before the stage had mounted resolved instantly through the instant
  presenter; the screen then opened on a finished fight. The controller now waits for the stage.
- Enemies of the second and later waves were missing from the HUD and the stage.
- Unit plates and the profile XP bar rendered empty at 16 px (the stone track's frame swallowed
  the fill).
- Heals for 0 HP no longer produce events ("heals X for 0").

### Balance
- Training Grounds enemies fight at 85 % of the archetype base (`statMult`). Headless win rates
  at level 1 on auto over 30 seeds, per starting roster (starter + Wenna + Gil, plus Bran in the
  Warlord fight): Sparring Ground 28–30/30, Remnant Ambush 29–30/30, The Warlord's Pit 30/30 for
  Ser Corvin and Reva, 19/30 for Sister Maelis.
- `src/content/balance/battle.ts` gained the turn-meter, mitigation, variance, status value,
  DoT, counter, revive, freeze, fear, turn-limit, difficulty, stage-growth, boss and AI
  constants of `docs/design/BATTLE.md` §11.

### Fixed

- **A retreat mid-fight could throw once a frame until the numbers finished falling.** A damage
  number lives about a second after the hit that made it, and the presenter's batch can be longer
  than that — but a retreat tears the stage down at once. GSAP knew nothing about it and kept
  writing `y` into a destroyed `Text`, which CI caught as twelve `Cannot set properties of null` on
  the daily boss's race. Both layers now keep what they have in the air and kill it before anything
  is destroyed: `NumberLayer` its number timelines, the stage its event batches.

### Performance
- `pnpm perf:battle --software` in the GPU-less build environment (SwiftShader, 1920 × 1080,
  Stress Bench 4 v 4 × 2 waves at ×4, four maxed legendaries, 31.7 s fight, victory):

  | p50 | p95 | max | frames | budget (p95) |
  | --- | --- | --- | --- | --- |
  | 350.0 ms | 366.7 ms | 366.8 ms | 72 | over 16 ms (software renderer) |

  Software WebGL renders the stage at roughly three frames per second, so this run only proves the
  bench pipeline; the 16 ms p95 budget is signed off on the owner's iGPU laptop with
  `pnpm build && pnpm preview` then `pnpm perf:battle` (`USER_QUESTIONS.md` Q30).
- The stage records unclamped frame times (`ticker.elapsedMS`); React commits nothing per frame
  during a fight — the HUD updates only when the presenter lands an event.
- `tests/e2e`: 28 specs (Phase 0–2); the battle fights get a 480 s budget and the auto fights
  run at ×2 because CI runners render with software WebGL.

## [0.0.1] — 2026-09-12 — Phase 1: Champions & Collection

### Added
- **The roster as content.** All 23 EA-0.1 champions (`docs/design/CHAMPIONS.md` §4) live in
  `src/content/champions/<id>.ts`, authored with the effect DSL builders (`hit`, `status`,
  `heal`, `cleanse`, `strip`, `tm`, `revive`, `extraTurn`, `leech`, `when`, `up.*`) and typed by
  `defineChampion`: stats at 6★/60, art keys, obtain sources, abilities with cooldowns, upgrade
  ladders and AI hints, passives, auras and lore. Seven champions use their finished models; the
  other sixteen borrow the lizard model with a per-champion multiply tint and an "art pending"
  mark on every card and portrait (`CLAUDE.md` §2.7). English names, lore and ability text in
  `src/i18n/en/champions.ts`.
- **Content validation for champions.** Zod schemas for champions, abilities and every effect;
  `pnpm content:validate` (and the content test) now also checks ability counts per rarity, slot
  order, A1 cooldown 0, upgrade limits, passive/aura presence, starter obtain sources, asset and
  i18n references, description placeholders and stat deviation from the role template (warning;
  Varkos' HP is the one documented outlier).
- **Champion engine** (`src/engine/champions`). `statAt`/`baseStats`/`power` (star multiplier ×
  level factor, `docs/design/CHAMPIONS.md` §2), level caps and XP curve, champion instance model
  with stable `<def>-<n>` ids, roster reducers (add, lock, favourite, seed the starting roster,
  generate a seeded roster), live ability numbers (`abilityNumbers`, `passiveNumbers`,
  `effectiveAbility` fold skill-tome upgrades into damage, chance, duration, shield, turn meter
  and cooldown), and pure roster sorting/filtering (`sortAndFilter`: rank, level, power, element,
  recent, name; favourites first) with a 240-instance perf test.
- **Save schema v2.** `roster`, `counters.instances` and `profile.avatarChampionId`; migration
  1→2 drops the Phase 0 `avatarKey`; the frozen Phase 0 save `tests/fixtures/saves/v1.json`
  migrates without data loss (unit test) and `tests/fixtures/saves/roster-204.chronicle`
  (generated by `tools/fixtures/roster-chronicle.ts`) round-trips a 204-champion roster through
  import.
- **Starter choice.** New Chronicle now opens the binding screen: the three Rares (Sister Maelis,
  Ser Corvin, Reva Ashblade) with stats, kit text and passive; binding one plays the new-chronicle
  stinger, seeds the roster with the starter plus Bran, Wenna and Gil, sets the profile avatar
  and opens Emberhold. Continue/import go straight to the hub once a roster exists.
- **Champions index** (hub hotspot and bottom button). Virtualised 4-column card grid with the
  stone scrollbar (200+ champions render ~40 cards), sort dropdown with direction toggle, element,
  role, rarity, locked and favourite filter chips, live "shown of total" count, empty state.
- **Champion detail.** Rarity-framed portrait with the idle sprite loop, nameplate with element,
  role, rarity, stars and level; Info tab (power, XP bar, eight base stats with the gear-bonus
  column reserved for Phase 6), Abilities tab (icons, cooldowns, descriptions with live numbers,
  upgrade pips, passive and aura), Lore tab (obtain sources, copies owned, acquisition date), Gear
  tab (six locked slots until Phase 6); Lock, Favourite and Tavern (locked) actions.
- **Profile avatar.** Any owned champion (or the Chronicler) can be chosen from the profile
  dialog; the top-bar chip follows.
- **Chronicle Debug** (development builds only, `Ctrl+Shift+D`): grant any champion, generate 200
  seeded random champions, add gold/gems/energy. Excluded from production bundles.
- **Components.** `VirtualGrid`, `ChampionCard` tint/placeholder/compact modes, `Tabs` test ids,
  `DecoFrame` `line` variant; DevKit gallery shows the deco set at 1:1 and the card frames at 2:1.

### Changed
- `content/champions/index.ts` lists champions explicitly (no glob), so content loads identically
  in Vite, Vitest and `tools/`.
- The asset pipeline packs the bare outline deco frames as `deco.NN.line` (cache version 4).

### Fixed
- `DecoFrame` emitted `border-image-width` without a unit, which CSS reads as a multiple of the
  border width; frames were drawn as 12–16× slabs and only looked right by accident at card size.
- `AbilityIcon` drew the lit ember frame (an opaque disc) over the icon art; it is now the glow
  behind the art with the transparent ring on top.
- Passive and aura descriptions are interpolated with `passiveNumbers`, so a passive that quotes
  a duration no longer shows a raw `{turns}` token.
- The title screen's first-click fullscreen offer spent the click's user activation, so "Import
  Save" as the very first click went fullscreen and never opened the file picker; the Import
  button now keeps its activation and the offer waits for the next click.

### Balance
- Champion stats, star multipliers (`STAR_MULT`), level factor, rarity budgets, role templates,
  power weights and the champion XP curve are in `src/content/balance/stats.ts` and `xp.ts`;
  element relations in `element.ts`.

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

