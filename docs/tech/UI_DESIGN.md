# UI / UX Specification

Related: `CLAUDE.md` §7 (rules), `ASSETS.md` (kit inventory), `ARCHITECTURE.md` §5–6,
`/game/design_examples/*` (references). This document is the contract for every screen.

## 1. Principles

1. **Clone the reference structure, re-skin with our kits.** Each screen below names its reference
   image and the layout regions it copies. Density and hierarchy match the references; visuals are
   ours: dark stone and ember, gold hairlines, pixel deco frames, painted icons.
2. **Nothing flat, nothing generic.** Every surface is a kit panel or a textured gradient; every
   list item is a framed card; every number has a typographic role.
3. **Motion is feedback.** Hover, press, open, close, gain, loss, unlock — all animated, all short.
4. **Readable at ×4.** Battle information (HP, TM, statuses, numbers) is legible at full speed.
5. **One-hand mouse, full keyboard.** Every flow works with mouse only; hotkeys accelerate.

## 2. Viewport and grid

- Virtual canvas **1920 × 1080**, scaled uniformly (`scale = min(w/1920, h/1080)`), centred;
  the letterbox area is painted with the current backdrop extended (blurred edge copy), never black.
- Base spacing unit 8 px. Regions (virtual px):

| Region | Size | Used by |
| --- | --- | --- |
| Top bar | 1920 × 88 | screen title (left), currencies (centre-right), close/settings (right) |
| Left rail | 440 wide | rosters, lists, filters |
| Right column | 480 wide | actions, detail panels, stat blocks |
| Bottom bar | 1920 × 120 | primary actions (hub nav, Battle/Start) |
| Content area | remainder | scene, map, cards |

Windows narrower than 16:9 pillarbox; wider than 16:9 letterbox — no responsive reflow. Minimum
window 1280 × 720 (scale 0.667); UI text minimum 14 virtual px (≈ 9.3 real px at min scale, so
labels use ≥ 16 virtual px).

### 2.1 Game window, not browser tab (owner: "it should feel like a real game")

| Rule | Implementation |
| --- | --- |
| Installable app | Web manifest (`display: standalone`, dark `theme_color`, logo icons) + service worker precache (versioned; shows an in-game "Update available — restart" banner, never silently mixes versions). Installing from Chrome/Edge removes all browser chrome. |
| Fullscreen offered, never forced | Setting "Launch in fullscreen" (default on): the first click on the title screen requests fullscreen once; if the player declines or leaves fullscreen, the setting flips off and the game never asks again; everything is fully playable windowed; `F11`/`Alt+Enter` toggle, `Esc` always leaves fullscreen; the title and settings screens carry a fullscreen button. Exiting fullscreen never breaks layout (letterbox fills). |
| Custom cursor | Kit-styled cursor set (pointer, hand, grab, disabled, target reticle in battle) as `cursor: url()` SVGs at 32 px; system cursor never shows inside the viewport. |
| No page behaviour | `user-select: none` (except text inputs), context menu suppressed, image drag disabled, `overscroll-behavior: none`, no native scrollbars anywhere, pinch/ctrl-zoom and `Ctrl +/−/0` intercepted (the viewport scales itself), `Backspace`/`Alt+←` never navigate. |
| Identity | `<title>` ChronicleIdle, favicon and app icons from the logo mark, splash/loading screen on cold start, no visible URLs or links except the credits panel. |
| Later | The Electron/Steam build reuses all of this; only the window frame changes. |

## 3. Design tokens (`src/ui/styles/tokens.css`)

### Colours

| Token | Value | Use |
| --- | --- | --- |
| `--bg-0` | #0b0a0d | deepest background |
| `--bg-1` | #15131a | panels fill (behind kit textures) |
| `--bg-2` | #1f1c25 | raised surfaces |
| `--stone-1/2/3` | #2a2831 / #3a3742 / #4b4754 | stone chrome tints |
| `--ember-1/2/3` | #5a1a12 / #8f2a1c / #d8552f | ember buttons, alerts, boss HP |
| `--gold-1/2/3` | #8a6b2a / #c9a24a / #f0d57a | hairlines, titles, primary accents |
| `--text-1/2/3` | #f3ecdc / #c8bfae / #8d8577 | primary / secondary / muted text |
| `--ok` / `--warn` / `--danger` | #63c96a / #e0b341 / #e04a3a | states |
| `--hp` / `--tm` / `--shield` | #63c96a / #e2c04b / #6fc3e6 | bars |
| Rarity `--r-common … --r-mythic` | #9a9a9a, #4fc267, #3f8fe6, #a35de3, #f2a93b, #ff4d6d | frames, names, particles |
| Element `--el-justice/valor/faith/eclipse` | #e8c15a, #d7433f, #4aa3df, #9b5de5 | sigils, tints |
| Buff / Debuff | #63c96a / #e04a3a | status icon tint |

### Typography

| Token | Font / size / weight | Use |
| --- | --- | --- |
| `--font-display` | Alegreya Sans SC 800, 44 / 32 / 24 px | screen titles, section headers, buttons |
| `--font-body` | Nunito Sans 400/600/700, 18 / 16 px | descriptions, labels |
| `--font-num` | Rajdhani 700, tabular, 20–36 px | stats, currencies, timers, damage numbers |

Letter-spacing +0.02 em on display; never serif; never lighter than 400.

### Motion

| Token | Value |
| --- | --- |
| `--t-fast / --t-base / --t-slow` | 120 ms / 220 ms / 350 ms |
| `--ease-out` | cubic-bezier(.2,.8,.2,1) |
| `--ease-snap` | cubic-bezier(.34,1.56,.64,1) (press/pop) |

## 4. Component library (kit mapping)

**How a framed surface is built.** A kit frame is hollow: its ring is artwork with transparent
parts, and on some frames (the stone arch) the ring's inner edge moves along the edge. A fill can
therefore not be a child of the framed element — a positioned child always paints above its
parent's `border-image`, so the fill stops at the ring's inner edge and the backdrop shows through
the ring. Every framed surface is instead three layers (`ui/components/Frame/KitSurface.tsx`):
the fill, the frame, then the content. The fill starts at the frame's measured transparent-corner
inset (`KIT_CORNER` in `ui/styles/kit.ts`, from an alpha scan of the texture) so it bleeds under
the ring without poking past the artwork's silhouette, and the content box is padded by the ring's
thickness plus the surface's own padding. Bars are the exception: their tracks are carved grooves
whose middles are opaque, so the progress fill lives *inside* the track's padding box, and the
carved tracks are only used at 40 px and up, where the rim fits (see `Bar` below).

| Component | Built from | Notes |
| --- | --- | --- |
| `Frame` | `deco-frames/deco-frame-NN[-{solid,soft,scrim}]` 9-slice (32 px inset, drawn at 2:1 = 16 px or 1:1 = 32 px), tinted by rarity/element | 32 pixel frames × 4 variants (`line` outline, `solid` inner band for cards, `soft`, `scrim`); screens choose 2–3 to keep identity |
| `Panel` | `stone-vine/panel-stone` (+ `panel-stone-fill`), `panel-arch` for hero panels, `dark-ember/panel-wide-ornate`, `panel-tall-ornate` | 9-slice with measured insets |
| `Button.primary` | `dark-ember/btn-ember-wide` (+ `-on` pressed) | gold display text; hover raises 2 px + glow |
| `Button.secondary` | `stone-vine/btn-stone-wide` / `btn-stone-med` / `btn-stone-long` | |
| `Button.icon` | `stone-vine/btn-icon-back` / `btn-icon-close` / `btn-icon-settings`, `dark-ember/btn-ember-round` | 64 px |
| `Button.square` | `dark-ember/btn-ember-square` (+ `-on`/`-off`) | toggles (Auto, speed) |
| `Tab` | `dark-ember/banner-plain` / `banner-dark` (active = ember, inactive = dark) | |
| `CurrencyPill` | `dark-ember/frame-wide-alt` + icon + `--font-num` + "+" button | top bar |
| `Bar` | `stone-vine/bar-track-stone-*` + `bar-fill-health` / `bar-fill-mana` / `bar-fill-stamina`; `dark-ember/bar-track-ember` + `bar-fill-ember` for boss HP | fills are masked and animated; the carved track is used from 40 px (its rim is 30–40 source px), shorter bars get a hairline frame in the same materials; labels and values only above 20 px |
| `Slot` | `stone-vine/slot-stone-sm/md/lg/long` (+ `-fill`) | team slots, gear slots, brew slots |
| `Slider` | `stone-vine/bar-track-stone` channel + `dark-ember/bar-fill-ember` level + gold orb in `frame-round-sm` | a transparent range input on top keeps native keyboard and drag |
| `ChampionCard` | `Frame` (rarity) + avatar 256 + star row + level badge (`frame-round-sm`) + element sigil (glyph) + role glyph + lock/favourite marks | sizes: 96 / 128 / 192 / 256 |
| `ChampionPortrait` | avatar 512/1024 in `panel-arch` with parallax tilt on hover | detail screens |
| `SpriteView` | Pixi-less DOM sprite: atlas frame stepping via CSS `steps()` animation | idle loops in menus; cheap |
| `GearCard` | `Frame` (rarity) + the piece's own painting (`gear.<set>.<slot>`) + star row + `+N` badge + main stat + the set's emblem on a stone plate, bottom-left | 96 / 128; the painting shows the slot, so the corner that held a slot glyph names the set |
| `SetEmblem` | a set's emblem (`emblem.<set>`), bare on a panel or on a square dark-stone plate with a gold hairline | on a painting it always takes the plate — a bare red emblem vanishes into Ember Guard's own lava |
| `PieceThumb` | a piece's painting at list size in a hairline of its rarity (or gold), optionally with the emblem plate | drop chips, the Index's six pieces |
| `AbilityIcon` | `dark-ember/frame-round-sm` (+ `-lit` when ready) + spell icon + cooldown overlay + "P" tag | 96 px in battle, 64 px in menus |
| `StatusIcon` | line-glyph (mask) tinted buff/debuff + duration digit | 28 px |
| `StarRow` | `stone-vine/icon-star` tinted (gold earned, grey empty) | |
| `Tooltip` | `dark-ember/frame-sm-thin` + `bg-tile-sm` | 200 ms delay, follows pointer |
| `Dialog` | `dark-ember/frame-wide` over dimmed backdrop; title banner | Esc closes |
| `Divider` | `stone-vine/divider-vine`, `deco-frames/deco-divider-NN` | |
| `RewardBurst` | item cards flying to the wallet with count-up | used everywhere |
| `NotificationDot` | ember dot with pulse | on hub buildings/buttons |
| `Timer` | `--font-num`, hourglass glyph | resets, chest |
| `Scrollbar` | custom stone channel (14 px, gold hairline) + ember thumb with grip ridges | never native; shown only past 8 px of real overflow and capped so it always reads as a handle |
| `Dropdown`, `Toggle`, `Slider` | stone frames + ember indicators | settings, filters; a dropdown option may carry an icon before its label (a set's emblem in the set choosers) |
| `TopBar`, `BottomBar` | `dark-ember/bg-wide` strips with gold hairline | |

Every component has states: default, hover, active, disabled, focus-visible, and a `motion` prop
(`none` under reduced motion).

## 5. Screens

Format: **Reference** → **Layout** → **Elements** → **Interactions** → **Motion & sound**.

### 5.1 Title
- Reference: none (own). Backdrop `bg9` slow zoom + violet fog. Music: hub track. Entering "New
  Chronicle" fades to the tutorial.
- **Two columns**, like a launcher: the wordmark (`chronicle_idle.svg`, ember glint sweep) over the
  menu on the left — *Continue* (if a save exists), *New Chronicle*, *Import Save*, *Settings* —
  and the **Chronicle of Changes** on the right, a frame the height of the screen (§5.21). The
  grid runs between the top edge and the corner controls and stretches, so the chronicle's frame
  is exactly as tall as the space it is given. Save notices sit under the menu in the same column.
- Corner controls bottom-right: fullscreen, credits, the version tag.

### 5.2 Hub — Emberhold
- Reference: `main_hub_screen.png` (structure), `main_hub_screen_alternative_2.png` (mood).
- The bosses are **not** on the hub: two cards floating over the artwork were web furniture pasted
  on a painting (§7.1 of `CLAUDE.md`). Everything they said lives on Game Modes, keys included
  (§5.19). What the hub keeps is a counted dot on **Battle** when a boss chest is waiting.
- Layout: full-bleed `bg8` (night harbour town) with hotspots placed on real buildings; top bar
  (profile chip left: avatar `frame-round-sm`, name, level, XP bar and, under the bar, the
  **Account Power** row — every owned champion's power summed, gold numerals, ticking up when the
  roster gains a level, a rank or a piece of gear; currencies centre-right:
  Energy, Gold, Gems, +; the Idle Chest as a framed pill with its countdown, once it is unlocked;
  the Bag as a square slot; settings right); left edge: Idle Chest at the docks — the hourglass
  hotspot wearing a gold `FillRing` (an SVG arc, exact at any size) with its countdown under the
  banner and a dot once it is full.
- **The bottom bar is three weights, not seven buttons.** Far left, the **Rewards** plate: its own
  gold-framed stone, because it is the one thing down here that *gives* rather than leads, and it
  wears the calendar's dot. Centre, one **rail** holding five destinations — Champions, Armoury,
  Missions, Quests, Index — each an icon **above** its word, tinted its own colour, with the frame
  belonging to the rail and a tile drawing its own edge only on hover. Far right, the primary
  **BATTLE** (opens Game Modes, wears the boss-chest dot), whose red ember frame is its alone.

  It read as seven identical silver slabs before `0.9.1`, which is a bar you have to *read* rather
  than see: five tiles that differ in hue and silhouette are told apart at a glance, and separating
  the giving button from the going buttons from the fighting button gives the eye somewhere to land.
  The Bag left the bar entirely for the header (§5.26).
- Hotspots (label banner `banner-plain` + glow ring + dot): Tavern, Forge, Portal (statue replaced
  with a violet gate overlay), Chronicler's Hall (missions), Campaign gate (world map), Champions
  barracks, Boss gate.
- Motion: lantern flicker sprites, fog drift, fireflies, water shimmer, hotspot bob on hover,
  camera parallax on mouse (±12 px), notification dots pulse; ambient hub SFX loop + music.

#### The Idle Chest dialog (`ECONOMY.md` §6)
- Opened from the hotspot at the docks or the top-bar pill, on any screen. Head: the chest, an
  ember `Bar` of the fill ("4h 20m of 6h 00m"), the countdown or the word *Full*, and the
  settlement and tier it farms — or a line saying to fell a settlement boss first — and, quietly
  under it, the band line: what the chest holds now and what the next chronicle level band holds
  ("Holds 12h 00m · 16h 00m from chronicle level 30"), which is where the game teaches that
  levelling widens the chest.
- Body: **Waiting inside** lists the four owed rewards; the luck is unlisted ("gems, brews and
  shards turn up on their own"). Opening it swaps the list for **The chest gives up**, adds *A
  stroke of luck* for each chance that fired, and says when the hours past capacity were lost.
- The button is *Open the chest* / *Still filling* (disabled while nothing has accrued), then
  *Continue*. Sound: `chest.open` on the claim, the reward toast with the hours it paid.

### 5.3 Champions (Index)
- Reference: left rail of `champions_gearing_info_screen.png`, `_alternative_3.png`.
- Layout: left rail grid of `ChampionCard` (4 columns, virtualised), sort (rank, level, power,
  element, recent) + filters (rarity, element, role, locked, favourite); content: selected champion
  large portrait on a settlement backdrop with idle sprite at the feet; right column: stats block
  (base + green gear bonus), power, rarity ribbon, element/role sigils, buttons *Gear*,
  *Abilities*, *Lore*, *Tavern*, *Lock/Favourite*.
- Vault (backlog): none in EA-0.1; instead "Food" filter.

### 5.4 Champion detail tabs
- Reference: `champions_gearing_info_screen_alternative_2.png` (right attribute list + gear column),
  `champions_gearing_info_screen.png` (gear grid + total stats).
- **Info**: as 5.3, with a second stat column carrying what the gear and its complete sets add.
  **Gear**: the power with everything worn, then a 3×2 slot grid of the small stone `Slot` on
  `minmax(0, 1fr)` tracks, so a cell can never push the row wider than the panel — each slot shows
  the piece's painting filling the recess under a ring in its **rarity's colour**, its set's emblem
  on a plate in the corner, its `+level` badge, its main stat,
  the rarity named under it in that same colour and its stars, with *Take off* and *Upgrade* below
  as dark chips with a gold hairline rather than as underlined small print — then
  the set-bonus rows, each led by the set's emblem (a complete group shows how many copies it
  grants, an incomplete one how many pieces it still needs), then *Open the Armoury*. A slot opens the **gear picker**
  (`dialog-gear-picker`): the racks filtered to that slot on the left, and a compare panel on the
  right that answers before anything is spent — every stat before → after (coloured by the
  delta), the power either side, and the set groups the swap would make or break. A piece worn by
  another champion turns the button into *Take from <name>*, and the press asks once before it
  strips them.
  **Abilities**: A1–A4 rows (`AbilityIcon`, the slot as a chip beside the name, then the name,
  description with live numbers, cooldown, upgrade dots), passive, aura — the row's own text says
  which slot and what kind, so the icon carries no chip; *Upgrade* jumps to Tavern skills with
  this champion selected.

### 5.5 Tavern
- Reference: `tavern_champion_upgrade_screen.png` (its fourth tab, *Ascend*, is not ours: Q9 keeps
  ascension in the backlog).
- Layout: left rail roster (the Champions screen's filter bar and virtual grid, reused) picks who
  is drinking; centre: `bg5` interior with the champion's portrait, name, stars, level and XP bar,
  flanked by the offering seats — six on the Level track, exactly as many as the rank-up asks for
  on the Rank track — with the brew row beneath; right column: vertical tabs *Upgrade Level*,
  *Upgrade Rank*, *Upgrade Skills* over the track's own panel, and a cost pill + **Upgrade**
  primary at its foot.
- Level track: each seat opens the food picker (locked, favourite and already-seated champions
  never appear; the picker prices each companion in XP), the brew row pours by the glass with the
  champion's own element listed first, and the panel names the level the offering reaches, the XP
  it carries and what would spill past the star tier's cap. *Auto-fill* seats the cheapest
  companions; *Clear the table* empties it.
- Rank track: the requirement line (`n × n★`), how many seats are filled, and the gold. *Auto-fill*
  runs the food finder.
- Skills track: one row per ability — icon, name, the next step in plain English, a dot per step
  taken, and an **Upgrade** press that spends one tome of the champion's rarity. Rarities without
  upgrades say so instead of showing dead buttons.
- Before anyone Rare-or-better, or anyone levelled, is retired, a confirmation names them one by
  one (`tavern-confirm`); a Common at level 1 goes without a question.
- Motion and sound: seats spring in as they fill, the level flashes with `stinger.levelup`, a new
  star bursts gold; the table clears itself the moment a press lands.

### 5.6 Campaign map
- Reference: `campaign_settlement_screen.png` (RSL map), `_alternative_2.png` (banners).
- Layout: painted map ground (`bg2`) under twelve settlement banners on a 6 × 2 grid, each a
  `DecoFrame` over the settlement's own backdrop and colour grade with its index, element sigil,
  name, star row and star count; the settlement the player stands in is ringed in gold and says
  so. Locked banners are desaturated and carry "Beat the boss of …" instead of a button.
  Difficulty dropdown bottom-left with the gate line under it, star-chest track bottom-centre
  (10/20/30), *Emberhold* bottom-right.
- Motion: banners rise in on open and lift on hover; cleared settlements take the ornate gold
  frame.

### 5.7 Settlement stages
- Reference: `campaign_stages_screen.png`.
- Layout: left panel: settlement name and lore, star count, faction element, drop preview
  (set pool, material ranges, shard and brew chances for the chosen difficulty); content: ten
  scrolling stand rows — stage number, stars, best turns, enemy count and plate level, enemy chips
  with their element sigils, the star and defeat turn limits, and a **Battle · ⚡cost** button. The
  boss stand uses the ember frame and is labelled; a locked stand names the stand it waits on.
- The difficulty is the one chosen on the map; auto-repeat lives on the Battle setup screen.

### 5.8 Battle setup
- Reference: `battle_setup_screen.png`, `_alternative_2.png`.
- Layout: title "Stage 3-7 · Normal · Thornwood Crossing"; left half: team slots — 3 in campaign,
  4 in boss fights — (leader slot marked, aura text), team power, presets, and the stand's
  three-star conditions with its defeat limit; right half: enemy waves preview (tabs Wave 1/2/3)
  with element sigils, levels and scaled HP, the *Auto-repeat ×N* selector with how many runs the
  energy pays for, the manual/auto switch and **Start battle · ⚡cost**; bottom: roster strip
  (virtualised).
- Click-to-place; a locked repeat tier says which level opens it; too little energy disables the
  start button and says what the stand costs (the gem refill arrives with the player-level phase).

### 5.9 Battle
- Reference: `in_battle_non_boss_screen*.png`, `in_battle_boss_screen*.png`.
- Layout: Pixi stage full-bleed (allies left, enemies right, ¾ perspective floor plane); above
  each unit: level badge, HP bar, TM bar, status row (up to 10 icons); top-left: pause, wave
  "2/3", turn counter, timer; top-centre (boss): boss HP bar with phase pips and boss status row;
  bottom-left: *Info*, *Auto*, *×N speed*; bottom-right: ability bar (A1–A4 `AbilityIcon`,
  passive tag), current champion mini-portrait; target reticle on hover.
- *Info* opens the **battle log**: a 460 × 640 ember panel of events, newest pinned to the bottom,
  capped at the last 120 lines, with the hotkey legend under it. The list scrolls inside the frame
  — the flex column belongs to the panel's *content box*, and the list needs `min-height: 0` to
  shrink below its content, or it grows as tall as the fight and spills off the screen. A soft
  mask at the top edge fades the row the scroll cuts in half.
- **A line is a sentence's parts, not a sentence.** `battle-log.ts` turns each event into a
  template key plus a value per slot, each saying what it is — a unit, an amount, a status — and
  the panel draws each one as what it is. The English stays one translatable string
  (`templateParts` in `@i18n`), and the whole line is on the row as its `aria-label`, so a screen
  reader and a test read the plain sentence. A row is scanned before it is read: a glyph opens it
  (sword, potion, skull), its kind sits on `data-kind`, and the kind's accent rail runs down its
  left edge — gold for a turn, ember for a crit, green for a heal, red for a fall.
- **What is highlighted.** Ally names take their champion's **rarity** colour and enemy names
  their **element** colour (a boss takes the ember and a glow); damage, heals and absorbed shields
  are bold tabular numerals in ember, green and justice-blue, a crit's number wearing an ember
  glow; a status is its own glyph, tinted green or red, riding the baseline beside its name.
- The row classes are **camel case**, and so is every other class this screen asks for by name:
  the bundler exposes CSS module locals that way only (`localsConvention: 'camelCaseOnly'` in
  `vite.config.ts`), so a rule written `.log_turn` reaches the DOM as nothing at all and the rails
  and tints silently vanish. A unit test holds `InfoPanel.tsx` and its stylesheet to that, and the
  e2e battle walk checks a rendered row really carries its rail.
- **Who, then what** (`BATTLE.md` §8): a press on a plate picks that unit and spends nothing, and
  the ability is what takes the turn. An enemy plate takes the pointer at all times, not only
  while a turn is open, because marking one is something a player does between turns and in auto
  mode; the marked plate wears a gold frame and a ◆ beside its name, and pressing it again lifts
  the mark (`BATTLE.md` §7.1).
- Ability icons: the round button clips nothing (the art clips itself) and **never shrinks** — it
  is sized in px, and a flex row short of width would otherwise take it out of the icon and leave
  an egg with the art stretched inside. One chip sits on the rim, dark with a gold hairline, and
  only the fight's bar asks for one: the key that casts it, `P` on a passive. A list leaves it
  off and labels its rows in text (§5.4, §5.20), because a two-character chip on a 56 px circle
  covers the art it is meant to badge. The chip and the cooldown number are fractions of the
  icon's own size. An ability on cooldown greys and darkens under the turns remaining, in gold —
  the count arrives with the turn being played (`turn.started` carries it), not from the ability's
  authored cooldown.
- Motion: per `ARCHITECTURE.md` §3.4; ultimates cut-in; kill slow-mo; wave transition slide.

### 5.10 Battle result
- Victory: the stand's stars and a "New record" badge on the stats panel, stage name and
  settlement, turns and waves, the spoils list (gold, materials, shards, brews, gems, energy,
  champion and chronicle XP) with first-clear, star-chest and level-up lines and the drops — each
  piece a chip of its painting with its set's emblem, named in its rarity's colour, two to a row
  and a dozen at most (a longer batch counts the rest, as the dungeons do) — the
  per-champion report, and buttons *Emberhold*, *Campaign*, *Team*, *Replay*, **Next stand**.
  An auto-repeat batch shows the merged spoils and how the batch ended (done, stopped, defeated,
  out of energy). The two panels stop above the buttons and the spoils scroll inside theirs, so a
  long batch never runs underneath them. Defeat: red vignette, enemy HP left, tips, *Team*, *Emberhold* — and the energy
  stays spent.

### 5.11 Forge & Armoury
- Reference: `tavern` layout language + right column pattern.
- **Two screens, by the owner's decision** (Q36): the Armoury keeps its own route and the Forge is
  *Craft* / *Dismantle* / *Refine*. Each links to the other, so a full rack is two clicks from the
  hammer either way.
- Forge (`screen-forge`, off the hub's forge hotspot, gated at player level 8): backdrop `bg5`
  with the hearth's own glows; horizontal tabs and the bench's one-line hint at the top, *Open the
  Armoury* on the right, and one stone panel holding the bench.
  - *Craft*: the six slots as `Slot` buttons, three tier cards (name, set pool, one line of what
    the tier is for, and its material lines — red when the chest is short), and a set chooser
    whose rows are the tier's pool, each led by the set's emblem, with the Sigils held beside it. Right: the anvil — a stone
    block over the hearth's light with the hammer falling on every strike, sparks on impact, and
    the struck piece revealed under it in its rarity colour; below, **Strike** and the recipe's
    running cost.
  - *Dismantle*: the quick picks of `GEAR.md` §6 (*Common & Uncommon*, *Never levelled*, *1–2★*),
    a *Clear the selection* link and the count; a `GearCard` grid of everything free to break
    (worn and locked pieces are never listed); right, *Returns* with the merged yield, the level
    refund line, and **Dismantle n** pinned to the bottom.
  - *Refine*: two racks — the pieces that can climb, then the twins that may feed the chosen one
    (same slot, same star, unworn, unlocked) — and a panel with the piece's name, its stars
    `n★ → n+1★`, the main stat either side, the note that rarity, level and substats survive, the
    cores and gold, and **Light the star**. Below player level 18 the tab shows that level
    instead.
- **The Armoury** (`screen-armoury`, reached from the hub's bottom bar, the champion Gear tab and
  the Forge): the racks and the bench. Backdrop `bg5` — the armory interior. Left: the
  filter bar (sort + direction, set — each option led by its emblem — and minimum-star dropdowns,
  one-tap chips for slot, rarity and
  locked, a clear link and a "shown of total" count) over a virtualised `GearCard` grid that on the
  default *Set* sort is cut into one run per set, each opening with a heading row — the set's
  emblem, its name, `n-piece` and how many are on the racks — with the capacity band pinned to the
  bottom (`held / 400`, amber warning at
  90 %, a red band and the overflow note when it is full). Right: the bench — the piece's
  painting in a rarity-lit frame with the emblem plate in its corner, its name, slot, rarity,
  `+level` and stars, its power, its main stat, its substats with the roll count behind each, its
  set under its emblem and what the set gives, who wears it (a
  link to that champion's Gear tab) and when it was found; beneath, **+1** and **+4** with the
  gold each would cost, then *Lock* and *Take it off*.

### 5.12 Summoning Portal
- Reference: `summoning_screen.png` (rail of shards + centre ritual + right tabs),
  `summoning_screen_alternative_2.png` (chances panel). Shipped in `0.0.8`.
- Layout: left rail: four shard cards with counts, blurb and selection frame; centre: the Pixi
  ritual layer over `bg9` (full-stage, so the ring is a circle at every size) with the chosen shard
  hanging in the ring; right column: *Standard* / *Featured* tabs over a stone panel with the
  banner's name, the rotation (number, countdown, three featured champions as idle sprites, and the
  Primordial Rotation marked), the selected shard's **Chances**, its **Mercy** lines, *Rates* and
  *The last summons*, and the **Exchange** (Gold→Faded, Gems→Ancient/Sacred, Primordial never
  sold); bottom bar: the shard and count, **Summon ×1** / **Summon ×10**, and *Claim your Epic*
  while the campaign owes a champion choice.
- Reveal: the press dims the scene, the ritual plays in the gate, then the cards land — one at
  192 px, ten in a 5×2 grid in sequence with the rarest last and marked *Best of the ten*. Each
  card carries the champion's name and either a "NEW" ribbon or "Duplicate — rank-up material".
  The cards land **on the ring's own centre** (`RING` in `ritualScene.ts`, passed to the overlay as
  CSS variables), not in the middle of the window: the champion steps *through* the gate, and the
  gate hangs off to one side of it. Out of the overlay's flow, the card also stays put when the
  results row lands instead of shifting up. *Skip* is offered throughout; the results row
  (*Continue* / *Summon again* / *View champion*) sits clear of the bottom bar.
- Dialogs: *Rates* (all four shards: the rarity rows, the pool size behind each and the mercy
  owed), *The last summons* (the save's bounded history, newest first, each row opening the
  champion it became) and the champion picker (every summonable champion of the owed rarity).
- Badges: a copy the Portal delivered wears a "NEW" ribbon on its roster card until it is opened;
  Emberhold shows a notification dot on the Champions hall while ribbons are outstanding and on the
  Portal while a champion choice is unclaimed.

### 5.13 Bosses — the menu and the gate

**The menu.** Behind **Battle → Bosses**, because one card on Game Modes cannot carry two gates
that open on different clocks.
- Backdrop `bg3` under a dark violet grade; the same row of
  tall cards Game Modes uses (the shared `ModeCard`), so the second menu reads as the same
  furniture one level down rather than as a different screen.
- One card per period boss, and each card is the boss's own: its **name** as the headline, its own
  lore as the blurb, its arena art behind it, a glyph apiece (a flaming skull for the Gargoyle, a
  cursed eye for the Titan), the cadence under the blurb (*Two keys every day* / *Three keys every
  week*) and, in gold numerals, the keys waiting at it with the reset countdown.
- **Each gate keeps its own lock.** The Gargoyle opens at chronicle level 10 and the Titan at 15,
  so the menu can hold one open card and one shut one; a shut card wears the broken shackle, says
  the level it waits for, and reports no keys — a number nobody can spend is not worth printing.
- Nothing here says "daily boss" or "weekly boss": the cadence is a line on the card, and the name
  is the headline.

**The gate**, which a card opens.
- Reference: `daily_weekly_boss_screen.png`. Backdrop: the boss's own (`bg3` for Gargoyle) with
  the interior ambient preset and two lantern glows on the gate.
- Layout per `docs/design/BOSSES.md` §4. Left rail (340 px): a tab per boss, carrying its **name**
  rather than its period, over
  the **Records** panel — best damage per tier with the team's avatars and the date, and a footer
  saying how many keys a period holds and that every key feeds the same pool. Centre: the boss's
  nameplate, its sprite on the scene (placeholder art washed to its tint, `ASSETS.md` §3), and a
  strip carrying the reset countdown, the keys left and *How it fights*. Right column (536 px): a
  scrolling `TierCard` per tier — name, enemy level, chronicle XP a key, an ember `Bar` of the
  period's damage against the pool ("54,838 of 250,000"), the chest ladder as five buttons
  (locked / claimable / claimed, each with its contents on hover) and the personal best. Bottom
  bar: what a key opens (or why it cannot) and the primary **Battle**.
- The mechanics sheet (*How it fights*) prints the kit in rotation order from the boss's own data,
  what never lands on it, and the four tips — including the enrage's real numbers. A phased boss
  adds two sections of its own: **How the fight changes** (one line per phase band, read off
  `boss.phases`, plus the note that the gear turns on its own next turn) and **What stands with
  it** (the escort's count, the share of a hit it takes, and how it comes back).
- Motion: the selected tier card lifts to the ember frame; a claimed chest swaps its glyph for a
  trophy; the reward toast names the chest.

#### The boss HUD in the fight (`BOSSES.md` §4)
- The pool bar keeps the boss's own name and statuses, and carries a row of chips under it:
  **Phase N/M** in legendary violet for a boss that changes gear (it re-enters with a pop on every
  change), **Guarded X %** while any of its escort still stands, **Unshakeable** (the immunity list
  on hover), the enrage — "Enrages in N of its turns" until the first step, then
  "Enraged ×N · +X % ATK" with a pulsing ember frame — and one chip per counting passive the party
  has broken, which enters with a flash. The stage shouts the same beats ("PHASE 2", "ENRAGED",
  "ARMOUR BROKEN"), a midnight burst and a shake land on the gear change with the gate's own
  closing note, and every one of them reaches the battle log.
- A boss's escort stands on its own marks (`ENEMY_ESCORT_SLOTS`, `render/battle/layout.ts`):
  downstage of its master, one to each side, so a ×2.4 sprite cannot swallow it and the sprites
  sort in front of the thing they are shielding.
- The result screen replaces stars and spoils with what the key bought: the damage this fight did,
  the period's pool after it, a personal-best line, the chests the damage has just earned, and
  *Back to the gate* as the primary press.

### 5.13a The Eternal Tower (`docs/design/ETERNAL_TOWER.md`)
- Reference: `different_content_battles_screen.png` for the card that leads here, the boss gate
  (§5.13) for the shape — a standing panel on the left, the content itself on the right. Backdrop
  `bg.bg1` graded to near-black with the interior ambient preset, because the tower is somewhere
  the campaign's own factions are stacked up inside.
- Left rail (440 px, `ember-tall`): **The Climb**. A blurb saying what the tower is, then four
  hairline rows — *Season* (`No. 1`, or *Not begun*), *Resets in*, *Climbed* (`7 of 100`) and
  *Best ever*. The keys sit at the foot of the panel, pushed there by `margin-top: auto` so the
  panel reads top-down whatever the numbers are: the shackle glyph, `9 / 10` in gold (**ember when
  the count is over the cap**, because 16/10 is a state worth seeing), *Next in 14m 35s* on the
  right, a stamina `Bar` clamped to the cap under them, and the primary **Climb floor N** —
  disabled, with the reason, when no key is held. When every floor is behind the player the button
  is replaced by the line that says the tower begins again when the season turns.
- Right (a stone surface, 488 px to the right edge): **the ladder**. One hundred rungs in a
  `ScrollArea`, *reversed* so floor 1 sits at the bottom and the climb runs upward like the tower
  does. Six columns hold the whole ladder in line: the floor number, the boss glyph (a flaming
  skull, ember) or a gap, who holds the floor (its faction's settlement), the shard odds on a boss
  floor, the floor's state, and the **Fight** button on the two states that take a key.
- Rung states carry their own weight: the one open floor wears a gold frame and an ember gradient,
  a boss floor a blood-red one, cleared floors sit at 55 % opacity and sealed floors at 38 % — so
  the eye lands on the next fight without reading a word. The screen opens scrolled to that floor
  (or to the floor the route named, which is how the result screen sends the player back).
- The floor's fight is an ordinary battle: it goes through battle setup, so a team may be rebuilt
  between floors. The key is charged when the fight starts (`ETERNAL_TOWER.md` §6).
- The result screen (§5.10) swaps the campaign's stars and spoils for a **tower panel**: the floor
  and whether it was the keeper's, whether the climb advanced (and whether it is the highest the
  chronicle has ever stood), the currencies the floor paid as a spoils list, and the keeper's
  shards on their own line. *Back to the tower* is the only press; a defeat says the floor held and
  the key is spent, and does not offer a retry the player may not be able to afford.

### 5.14 Quests — The Chronicler's Ledger (`QUESTS_MISSIONS.md` §2–§3)
- Reference: the RSL missions/quests layout (`progress_missions_screen.png` for the track).
  Backdrop `bg.bg3` (the runed gate, where the chronicler stands with their ledger) with the
  interior ambience and two candle glows.
- Header: **Daily** / **Weekly** tabs, each wearing a badge with what that board owes (quests
  finished plus chests earned); on the right, the period's countdown (*Resets in 10h 31m*) and the
  primary **Claim all (N)**, which reads *Nothing to claim yet* and is disabled when the board owes
  nothing.
- **Points track** (`PointsTrack`): one `ember-wide` panel with *40 / 100 points* and a gold rail
  from zero to the board's hundred, a chest standing at every threshold (20 / 40 / 60 / 80 / 100
  daily, 25 / 50 / 75 / 100 weekly). A chest is dim while the points are short, wears the gold
  pulse when it can be taken (no pulse under `prefers-reduced-motion`), and swaps its scroll for a
  trophy and the word *Taken* once it has been. Hovering one prints its contents; the daily hundred
  also prints its cadence (*Every 3 claims this pays Ancient Shard ×1 instead.*).
- **Quest rows** (`QuestRow`, a `thin` panel each, in a `ScrollArea`): the quest's glyph, its line
  (*Clear 5 campaign stages*), a gold progress bar carrying `progress / target`, the points it
  pays, its reward as a `RewardList` strip, and **Claim**. A finished row wears a gold glow and a
  gold name until it is claimed; a claimed one steps back to *Claimed* with a trophy and mutes its
  bar. Nothing on the board is ever a dead row: a quest whose feature is still locked is not shown
  at all, and the period's replacement quest carries its points.
- A board the chronicle cannot open yet (the weekly one before level 12) replaces the track and the
  list with one panel: a broken shackle and *The ledger opens at chronicle level 12.*
- Motion and sound: `reward.small` on one claim, `reward.medium` on a Claim all, `reward.large` on a
  chest, `ui.tab` on the tabs, `ui.error` on a press the board refuses; every claim raises a reward
  toast naming the points and the currencies, and the top bar ticks up.
- The hub's bottom-bar **Quests** button opens the ledger and carries the same badge; the Welcome
  Back panel says when a new day's or week's quests are waiting.

### 5.15 The Chronicler's Path (`QUESTS_MISSIONS.md` §4)
- Reference: `progress_missions_screen.png`. Backdrop `bg.bg6` with the interior ambience and two
  lamp glows over the chronicler's table.
- Header: ten **Chapter N** tabs (the names are prose and do not fit ten across, so the chapter's
  own name sits with Eldric instead) and the Path's total — *72 / 120 missions*. A tab wears a
  badge when that chapter's chest is waiting. Every tab is readable, including chapters still to
  come: the Path is a promise as much as a task list.
- **Mission cards** (`MissionCard`, a rail of fixed-height cards with an arrow either side that
  steps one card): the mission's glyph on a framed crest, the line it asks for, a gold progress bar
  carrying `progress / target`, its reward as a `RewardList`, and the press. Four states — the one
  being walked wears the ember frame and a gold name (*In progress*, or **Claim** once it is
  finished), a claimed one steps back to *Claimed* with a trophy and a muted bar, and one still to
  come wears a broken shackle and the word *Locked*. A locked card's counter goals read zero (it
  has not started); its state predicates read the truth, so a chronicle deep enough sees what it
  already satisfies. The rail opens on the mission being walked, not at the start of its chapter.
- **Eldric** sits under the rail in a `thin` panel: the chapter's name, his own, and his line for
  that chapter (the Path's own line once every mission is claimed). His portrait is the placeholder
  model, tinted, until he has one of his own (`ASSETS.md` §3).
- **The chapter track** (`ChapterTrack`): *Chapter chest*, the chapter's `claimed / 12` on a gold
  rail, and the chest node at the end — dim while the chapter is unfinished (*Finish the chapter*),
  gold and pulsing when it can be taken, a trophy and *Taken* afterwards, with its contents on
  hover. The tenth chapter's node wears Eldric's own glyph and names what it is holding.
- **Eldric's parting gift** (`MissionGiftDialog`): the last chest owes a 6★ Legendary piece, so the
  dialog offers the six slots and the set list, strikes it on *Strike it*, and shows the card it
  made before it closes. Once — the piece's id is kept in the save.
- Motion and sound: `reward.medium` on a mission, `reward.large` on a chest or the gift,
  `ui.tab` on the tabs and the arrows, `ui.error` on a press the Path refuses; every claim raises a
  reward toast with what it paid, and Eldric's arrival gets its own.
- The hub's bottom-bar **Missions** button opens the Path and carries a badge for the mission or
  the chest it owes.

### 5.16 Idle chest
- See §5.2: the chest lives on the hub (the hotspot at the docks and the top-bar pill) and its
  dialog is specified there.

### 5.17 Profile & Settings
- Reference: `player_profile.png` (chip). The chip carries the avatar ring with the level badge,
  the name, the worn title and the XP bar; the ring flares and the badge pops on a level-up
  (skipped under `prefers-reduced-motion`).
- Profile dialog: identity header (avatar, name + *Rename*, worn title + *Choose*, level and XP
  bar, *Choose avatar*) over a scrolling body — standing grid (energy cap, stands cleared,
  champions owned, strongest champion, battles, victories, chronicle begun, time played), stars
  per difficulty, titles earned, and the next three level gates with what each opens. The avatar
  and title pickers open in place of the profile and return to it when they close.
- Title picker: two-column list of every title, earned ones in gold with a trophy glyph and
  selectable, locked ones dimmed with a shackle glyph and a "Locked" tag; *No title* is always
  available.
- Settings: music/sfx sliders, default speed, auto, reduced motion, fullscreen, language (en),
  *Export save*, *Import save*, *Reset chronicle* (typed confirmation), credits.

### 5.17a Level-up
- The moment (`ECONOMY.md` §4) is a dialog, never an overlay on a fight: levels earned during a
  battle queue in `ui.levelUp` and celebrate on the screen that follows it.
- Layout: ember burst behind a large numeral for the level reached ("Level 4 → 7" when a batch
  crossed several), then *Paid out* (gold, gems, shards, the energy refill and the new cap),
  *Now open to you* (one row per feature the levels unlocked, with its one-line hint) and *Title
  earned* when a level brought one. The body scrolls; **Continue** clears the queue.
- Motion and sound: spring-in numeral, burst flare, `stinger.levelup` on open.

### 5.18 Tutorial overlay
Eldric's onboarding (`docs/design/TUTORIAL.md`, ADR-042). Two shapes, one per beat of a step:

- **While he speaks.** One scrim dims the whole screen (nothing is clickable) and the ornate kit
  panel sits above the bottom bar: his portrait at 188 px, his name, the chapter and lesson count,
  the line typed out at ~16 ms a character with a blinking block, *Continue* (armed a beat late so
  a press held over from the last lesson cannot answer this one) and, from chapter 2 on, *Skip this
  lesson*. Clicking the panel reveals the rest of the line at once; `prefers-reduced-motion` starts
  there. Continue takes focus, so the whole beat is one key.
- **While the player acts.** The panel shrinks to a strip — his face at 56 px, the line, the skip —
  above the bottom bar, so the lesson never sits on top of what it is teaching. The scrim gains one
  cut-out per allowed target (`clip-path: path(evenodd, …)`, which decides what is drawn *and* what
  is hit, so the dim and the block cannot disagree), a gold ring pulses on the spotlight with a
  bobbing caret, and everything else eats the click.

Rules the overlay holds to:

- A step that only points (`allow: 'all'`) dims nothing: ring, caret, strip, and the screen stays
  the player's own. The navigation lessons all read this way; the in-panel ones cage.
- A target that is nowhere on screen dims nothing and blocks nothing — Eldric still speaks.
- A lesson waits while a dialog it does not name is open (the Welcome Back report, a level-up):
  one thing holds the screen at a time.
- Targets are measured in stage space on a frame loop and only re-rendered when something moved, so
  a lesson over the battle screen costs no commits per frame (CLAUDE.md §5.6).
- Layer `--z-tutorial` (300): above the dialogs it dims, below the loading screen.

### 5.19 Game Modes
- Reference: `different_content_battles_screen.png`. Horizontal cards, each reporting its own live
  state in gold numerals under the blurb: Campaign (the stand the chronicle is on), **Dungeons**
  (how many keeps are open and the deepest any of them has been taken — `4 keeps · deepest Normal
  14`, §5.24), Bosses (the keys left at each gate, named — `Gargoyle 2/2 · Titan 3/3`, the number
  the hub's panels used to carry, §5.2),
  **The Eternal Tower** (`Floor n · Keys k/c`, the floor a key would open and the ring held). The
  Dungeons card sits between Campaign and Bosses, where the owner asked for it. A
  card that is still shut reports nothing live; its button says what opens it — a chronicle level
  for most, and *Clear the Intro campaign* for the tower, which is gated on progress rather than
  on a level (`ETERNAL_TOWER.md` §1). Backlog cards (Events) do not exist in EA-0.1.

### 5.20 The Chronicle Index

- Reached from the hub's bottom bar (**Index**), open from level 1 — it is a reference, not a
  reward. Backdrop `bg.bg5` with the interior ambience, like every other reading room.
- Four tabs across the head, a one-line blurb, and — on the champions tab only — the tally
  (`12 of 23 champions found`) in gold on the right. Both halves are bounded by the screen and
  scroll on their own: the split is a grid with an explicit `minmax(0, 1fr)` row, or the page
  beside the list grows to whatever it holds and runs off the bottom with the lore unreachable.
- **Champions**: the whole roster of definitions, found or not, in **sections**: a heading per
  element in the element's colour, and inside it a small caption per role, which are the two axes
  a player sorts a roster by. Compact `ChampionCard`s (no level badge, no stars on the card) wrap
  along each role's row, **dimmed when unfound**, wearing `×N` when the chronicle holds more than
  one. Rarity / element / role dropdowns and a *Found only* switch narrow what the sections hold. The page beside it:
  portrait framed in the rarity's colour, base→max stars, rarity · element · role, whether it is
  in the chronicle, the authored stats (6★ level 60, before gear), every ability with its cooldown
  and live numbers, the passive, the aura, the lore and where it comes from.
- **Bestiary**: the twelve settlements as numbered tabs, each page its faction's six rank-and-file
  and the boss that holds the last stand (wearing a **BOSS** tag). Cards are the enemy's own sprite
  over its name; the page beside them prints archetype · element · role, the settlement-1 base
  stats the encounter scales, and the kit.
- **Gear Sets**: the fourteen sets, each led by its **emblem** on a stone plate — the mark that
  names the set on every piece it makes (`GEAR.md` §5.1) — then its name, piece count and what a
  complete group gives; under that the set's **six pieces**, weapon to boots, as paintings with the
  piece's name on hover; and the settlements that favour it. The set's own description *is* its
  bonus text — printing the passives beside it said the same sentence twice.
- **Statuses**: buffs then debuffs, each with its tinted chip and what it does. A status's text is
  written for one cast ("by {value} %"), and a glossary has no cast, so the amount stands as `X`.
- Everything here is a read of the content registry, so the Index grows by itself every time the
  content does. Nothing on this screen spends anything.

## 6. Animation language

### Menus
- Screen enter: backdrop cross-fade 350 ms + panels slide 24 px with `--ease-out`, staggered 30 ms.
- Hover: lift 2 px, gold hairline glow; press: scale 0.97 with `--ease-snap`.
- Currency change: number tick-up/down 400 ms; gain also spawns a small icon burst.
- Card reveal: flip (rotateY) with rarity flash; Legendary+ adds shimmer sweep loop (3 s).
- Lists: item enter stagger 20 ms, max 12 items animated (rest instant).

### Battle choreography (synthesised from idle-only sprites)
1. Caster: 80 ms anticipation squash → 140 ms lunge toward target (melee) or 120 ms raise +
   flash (ranged/cast) → recover 200 ms. Scaled by speed multiplier.
2. Projectile/beam FX by element (Justice: gold arc, Valor: ember slash, Faith: azure bolt,
   Eclipse: violet rift) from the FX library; ability icon can override with a specific FX key.
3. Impact: hit-stop 60 ms, target 6 px shake + white flash 80 ms, element particles, damage number
   (Rajdhani, crit = gold and 1.4×, heal = green, shield = azure), screen shake for AoE/ultimates.
4. Statuses: icon pops on the row with a 200 ms scale; DoT ticks show small numbers.
5. Death: desaturate + dissolve upward + ash; revive: gold column.
6. Ultimate cut-in (A4): 500 ms (×1) diagonal panel with avatar and name, speed lines, bass hit.
7. Camera: subtle push-in on single-target ultimates; wave transitions pan.
8. At ×4: hit-stops removed, durations ÷4, cut-ins ÷2 (still shown), numbers persist 600 ms.

### 6.3 VFX library (flipbooks from the owner's packs + generated)

Element FX are picked from the two provided packs; the presenter tints and scales them. Missing
shapes (slashes, rune rings, smoke, speed lines) are generated procedurally by `tools/vfx` into
the same atlas format. All keys live in `src/render/battle/fx/registry.ts`.

| Use | Sheets (Free Pixel Effects Pack = FPEP, 100 px grids; GameFX = 64/96/133 px strips) |
| --- | --- |
| Justice (gold / holy) casts and hits | GameFX `LightCast_96`, `HolyExplosion_96x96`, FPEP `16_sunburn`, `9_brightfire` |
| Valor (crimson / fire) casts, projectiles, hits | GameFX `FireCast_96x96`, `FireBall_64x64`, `FireBall_2_64x64`, `FireBall_3_64x64`, `FireBurst_64x64`, FPEP `11_fire`, `6_flamelash`, `7_firespin` |
| Faith (azure / frost) casts, projectiles, hits | GameFX `IceCast_96x96`, `IcePick_64x64`, `IceShatter_96x96`, `IceShatter_2_96x96`, FPEP `3_bluefire`, `19_freezing` |
| Eclipse (violet / void) casts and hits | FPEP `18_midnight`, `14_phantom`, `13_vortex`, `17_felspell`, `2_magic8`, `12_nebula` |
| Poison / DoT ticks | GameFX `PoisonCast_96x96`, `PoisonClaw_96x96`; Burn uses `11_fire` small; Bleed uses generated droplets |
| Physical hits (A1s, counters) | generated `fx.gen.slash_arc` + `fx.gen.sparks`; crits FPEP `5_magickahit` + sparks |
| Generated (`tools/vfx`, keys `fx.gen.*`) | `slash_arc` (physical hits), `sparks` (physical hits, crits), `rune_ring` (turn-meter gains, extra turns), `smoke` (deaths), `speed_lines` (melee lunges) |
| Buffs / shields / block | FPEP `8_protectioncircle`, GameFX `MagicBarrier_64x64`; ATK/DEF/SPD Up use tinted `4_casting` |
| Heal / revive | FPEP `20_magicbubbles`, `1_magicspell` (green), GameFX `SmallStar_64x64`, `MediumStar_64x64` |
| Explosions (ultimates, boss abilities) | GameFX `Explosion_96x96`, `Explosion_2_64x64`, `Explosion_3_133x133` |
| Wind / TM effects | GameFX `TornadoLoop_96x96`, `TornadoMoving_96x96`, `TornadoStatic_96x96` |
| Loading / portal ambience | FPEP `15_loading` (ring), `13_vortex` (summon ring), Pixi particle embers |
| Generated (`tools/vfx`) | slash arcs, impact sparks, rune rings, smoke puffs, speed lines, ash dissolve, gold pillar, rarity bursts |

## 7. Sound map (keys)

`ui.hover`, `ui.confirm`, `ui.cancel`, `ui.tab`, `ui.error`, `reward.small/medium/large`,
`levelup.champion`, `levelup.player`, `rankup`, `gear.equip`, `gear.upgrade`, `forge.hammer`,
`forge.reveal`, `summon.charge`, `summon.crack`, `summon.reveal.{common,rare,epic,legendary,mythic}`, `battle.start`,
`battle.hit.{light,heavy,crit}`, `battle.cast.{element}`, `battle.heal`, `battle.buff`,
`battle.debuff`, `battle.death`, `battle.victory`, `battle.defeat`, `chest.open`, `quest.claim`.
Sources: the owner's SFX packs under `/game/assets/music_and_sounds/sfx` (44.1 kHz stereo WAV,
transcoded by the pipeline) and in-house generated sounds (`tools/audio`, deterministic synth
recipes). Variants are chosen round-robin with slight pitch jitter.

| Key group | Source |
| --- | --- |
| `ui.*` | generated (short synthesised ticks/clicks in the ember palette) |
| `reward.*`, `levelup.*`, `rankup`, `battle.victory/defeat` | generated stingers, layered with `Spells/Firebuff 1–2`, `Spells/Spell Impact 1–3`, `Spells/Wave Attack 1–2` (mythic) |
| `chest.open` / `chest.close` | `Doors Gates and Chests/Chest Open 1–2`, `Chest Close 1–2` |
| `quest.claim` | `Doors Gates and Chests/Lock Unlock` + generated chime |
| `battle.start` | `Doors Gates and Chests/Gate Open`, `Portcullis Gate` |
| `battle.attack.melee` / `.ranged` | `Attacks/Sword Attack 1–3` / `Attacks/Bow Attack 1–2` |
| `battle.hit.light` / `.heavy` / `.crit` | `Attacks/Sword Impact Hit 1–3` / `Torch/Torch Impact 1–2` / impact + `Spells/Spell Impact` |
| `battle.block` (shield absorb) | `Attacks/Sword Blocked 1–3`, `Bow Blocked 1–3` |
| `battle.cast.valor` | `Spells/Fireball 1–3`, `Firespray 1–2` |
| `battle.cast.faith` | `Spells/Ice Throw 1–2`, `Ice Barrage 1–2`, `Waterspray 1–2` |
| `battle.cast.justice` | `Spells/Firebuff 1–2` (bright layer) + generated holy chime |
| `battle.cast.eclipse` | `Spells/Ice Freeze 1–2` pitched down + generated void layer |
| `battle.cast.earth` (bosses, Sethlurias) | `Spells/Rock Meteor Throw 1–2`, `Rock Meteor Swarm 1–2`, `Rock Wall 1–2` |
| `battle.heal` / `battle.buff` / `battle.debuff` | `Spells/Waterspray` / `Spells/Firebuff` / `Spells/Ice Freeze` |
| `battle.death` | `Torch/Torch Impact` + generated dissolve |
| `battle.step.{dirt,stone,water,wood}` | `Footsteps/*` (lunge steps, surface per settlement) |
| `forge.hammer` / `gear.upgrade` | `Chopping and Mining/mine 1–5` |
| `gear.equip` | `Attacks/Sword Unsheath 1–2` |
| `summon.charge` / `summon.crack` | generated: a rising filtered swell with four rune taps / dry splinters over a low strain |
| `summon.reveal.*` | generated, one per tier: a two-note chime (Common/Uncommon), a bright triad (Rare), a violet swell with bells (Epic), a bass hit with brass and falling bells (Legendary), and a detonation with a shockwave and a crystalline sequence nothing else plays (Mythic) |
| `torch.*` (hub lanterns) | `Torch/Light Torch 1–2`, `Torch Loop` |

Ambience (`AmbienceDirector`, per screen, cross-faded): hub → `Town ambience` + `Night ambience`;
Tavern/Forge → `Interior Night` / `Interior Day`; forest settlements → `Forest Day` / `Forest
Night`; Greyhaven Harbor → `Sea` / `Beach`; Barrowdeep, the Gargoyle → `Cave` / `Dungeon ambience`;
Old Kingsroad → `River Loop` / `Waterfall Loop`; Ironcrag Citadel → `Torch Loop`; rain/storm
variants are used for Duskmere Marsh and Frostvein Pass.

## 8. Input & accessibility

- Mouse + keyboard; hotkeys listed in `docs/design/BATTLE.md` §8 and on the pause menu.
- Focus rings: gold hairline; tab order follows visual order; dialogs trap focus.
- `prefers-reduced-motion` or the setting: menu animations become fades; battle unchanged.
- Colour is never the only carrier: rarity also shown by star count and label; buff/debuff icons
  differ in shape and have a small +/− mark.

### 5.21 The Chronicle of Changes
- What the game tells the player about itself: every release, newest first, read as news rather
  than as a commit log. It is a **frame on the title screen** (§5.1), always visible — never a
  window that has to be opened — and the same view opens from *Settings → About → Chronicle of
  Changes* while a chronicle is being played.
- A release prints its version in a gold plate, its name in the display face, a **LATEST** badge on
  the newest one, and the day it shipped. Under it, one line per change: the kind's glyph, the
  kind's name in its colour (**New** gold, **Content** epic violet, **Improved** justice blue,
  **Balance** ember, **Fixed** buff green), then the sentence. A line marked as a highlight takes
  the kind's colour as a left rail and a wash, and reads a point larger.
- Above the list, a chip per kind with the number of lines it holds — the everything chip first —
  and under them an order toggle that flips newest/oldest. A chip with no lines is disabled. The
  content is authored newest first and printed as authored, so "oldest" is a reversal and the
  panel never compares two version strings.
- The view takes its height from its container (`100%` inside the title frame, a number inside the
  dialog); the chips sit above and the list takes what is left and scrolls.
- Content: `src/content/changelog/` with its strings in `src/i18n/en/changelog.ts`
  (`CONTENT_AUTHORING.md` §13). Every shipped version writes a release there — that rule is
  `CLAUDE.md` §9.3, and it is the owner's standing instruction.

### 5.22 The Glorious Palace (`docs/design/GLORIOUS_PALACE.md`)
- A mandala, not a list. The field fills the screen under the top bar: the **Heart** at the centre
  and four petals growing along the compass — Justice north, Valor east, Eclipse south, Faith west
  (`PALACE_BRANCH_DIRECTIONS`). Backdrop `bg4` (the domed palace) under a heavy violet grade and a
  radial scrim, so a lattice of dim orbs has something dimmer behind it.
- **Geometry is computed, not authored** (`ui/screens/palace/palace-view.ts`). Content says which
  ring and slot a node sits on; the screen turns that into polar coordinates. Each branch owns the
  90° lane around its axis and a ring is pushed outward until its nodes fit that lane with a gap to
  spare — so the inner rings open to the edge of their lane and the outer ones narrow back towards
  the axis, which is what gives a branch the shape of a petal and makes the capstones read as its
  tip. A test asserts no two nodes' rims come within 10 px of each other, and that the whole tree
  fits the field at a zoom above two thirds.
- **A node is an orb** — the one shape the kit draws round (`CLAUDE.md` §7.1): the kit's
  `frame_round_sm` ring over a disc that carries the state. Unreachable is dimmed and is not a tab
  stop (there are 133 of them); *ready* wears a breathing gold halo; *too short* wears a thin gold
  rim and no pulse; *bought* takes its element's colour, with the link behind it lit to match. A
  capstone is drawn larger, and the layout gives it the room. Buying one flares a ring outward and
  plays `torch.light` (`reward.medium` for a capstone).
- **Links** are one SVG line per node: dark for a path not walked, a travelling gold dash for the
  one node that can be bought next, the element's colour once both ends are bought. No filters —
  132 drop-shadows is not a frame budget (`CLAUDE.md` §5.6).
- **Hover** opens the node's whole story: its name, what it costs in points, every stat it grants
  with its value, who it applies to ("Every Eclipse champion you own"), and why it can or cannot be
  bought. Cost numerals sit on the rim and only appear past a zoom of 0.85 — unreadable from far
  out, and noise besides.
- **Pan and zoom.** The field is an ordinary scroll container, so dragging it is the game's own
  drag-to-scroll (`app/dragScroll.ts`) with nothing of its own. The wheel zooms instead of
  scrolling and keeps whatever is under the cursor under the cursor; the three buttons at the
  bottom right are further out, whole Palace, closer. The screen opens on the whole mandala.
- **The ledger floats over the field** on the left, 400 px wide: the points to spend in epic violet
  (ticking up when they change), what is spent of the 237, a bar per branch, **what the Palace
  gives** right now — the Heart's percentage and one line of summed stats per element that has any
  — where points come from, how many of the 133 nodes are lit, and *Reclaim all points*, which is
  disabled until something is spent and asks once before it darkens the tree.
- **The purple line.** On a champion's stats (§5.4) a fourth column prints what the Palace adds in
  epic violet beside gear's green, with a tooltip naming the branch that paid for it — the owner's
  brief, and the only place the two sources are seen side by side.
- **Earning one is told where it happens.** The battle result screen (§5.10) carries a violet plate
  when a clear paid skill points; pressing it goes to the Palace.

### 5.23 The Brewery (`docs/design/BREWERY.md`)
- **Two columns, and the number that governs the mode over both.** A 420 px rail on the left holds
  the day's runs — a 40 px numeral over a stamina bar, the sentence that bar is too slim to carry
  ("20 of 20 runs left today", in warn amber when there are none), the reset countdown and the line
  that says every hall draws on the same twenty. Then the four hall tabs, then **Your brews**: the
  four elemental brews with what the player holds, which is the whole basis of choosing a hall
  today. The right panel is the chosen hall.
- **A hall wears its own place.** The backdrop is the settlement its deepest cellar is cut under,
  under a grade in the hall's element (amber, ember, ice, violet), so walking from the Ember Vats
  to the Waning Cellar is walking somewhere else. The hall's name takes its element's colour; the
  tabs take it as a left rail and a wash when selected.
- **The doors.** A badge at the head of the panel reads *Open today* in `--ok` or *Closed today* in
  `--warn`, with the hall's days under its name ("Open Wed, Sat, Sun", ordered from the game's own
  week start rather than `getDay`'s Sunday). A barred hall adds one amber banner saying when it
  opens and how long that is, and every Brew button in it is disabled — a closed door never costs a
  run.
- **A stage row says the four things a player decides on**: its number, what it is pitched at
  ("Mid game"), what it fields ("4 guards · level 34", or the captain on stage 5) and who holds it
  ("Held by the Ashen Legion"). What it pays sits in its own column at 30 px — a cask in the brew's
  tint and `×3` in gold — big enough to compare five rows at a glance, because the brews are the
  point. Rows stagger in on open (Framer Motion, skipped under reduced motion); `data-state` styles
  them: *cleared* keeps its element's rail, *next* takes a gold rail and an element wash, *locked*
  drops to 55 % and shows a shackle where its button would be.
- **The planning line** under the ladder: "Your deepest cellar here is stage 3 — all 20 runs on it
  would pour 60 brews", or, before anything is cleared, that stage 1 is open and pays one a run.
  Twenty runs are a choice; this is what this hall pays for them.
- **What a run says.** The battle result (§5.10) carries a Brewery panel beside the boss's and the
  tower's: the hall and stage, one cask per brew filling in sequence, the first clear that opened
  the next stage, and the runs left today. Its primary button goes back to the hall the run was
  spent in.

### 5.24 The Dungeons (`docs/design/DUNGEONS.md`)
- **The overview is a row of keeps, not a list.** Five `ModeCard`s (§5.19) across the screen,
  easiest first, each on its keep's own backdrop: the keep's name, its blurb, the **sets it holds**
  spelled out — the one thing a player chooses on — and, as the card's live note, the deepest rung
  they have taken in it. The sealed Gilded Veil keeps its place
  at the end of the row, desaturated and wearing the broken shackle, with its reason on the card
  rather than only on its button: *"Sealed until there are necklaces, rings and trinkets to find."*
  A mode you cannot enter yet still has to say what it **is**, which is why `ModeCard` renders its
  children shut as well as open.
- **A keep is the tower's shape, because it is the same kind of climb.** Left rail (460 px): the
  keep's name in gold, its story, the keeper under a *Keeper* label, the sets it holds as chips
  (each led by the set's emblem), and the deepest rung at the foot. Right: the Normal/Hard tabs, the repeat selector, and the
  **ladder of twenty rungs**. It opens scrolled to the deepest rung the player may enter, so a keep
  twelve stages in does not start at stage 1.
- **A rung says the four things a run is decided on**, in four columns: its number and the level it
  fields, the **stars** it drops with the rarities under them in small text, its **energy** with
  the chance of a second piece under it, and the way in. `data-next` gives the rung the player is
  on a gold border and a warm wash and its button the primary variant; `data-open='false'` drops a
  rung still shut to 50 %, where it says what opens it in quiet grey rather than wearing a mark it
  has not earned. A rung already taken carries a jade *Cleared* under its button, so the ladder
  shows the climb at a glance. Too little energy for a rung disables its button and the button says
  so, rather than letting a press fail.
- **Hard is a tab, not a screen.** Before that keep's Normal 20 falls the tab is still pressable
  and shows one line saying what opens it — the gate is explained where it is met, and a player can
  read what they are climbing towards.
- **What a run says.** The battle result (§5.10) carries a Dungeons panel beside the boss's, the
  tower's and the Brewery's: the pieces themselves in their rarity frames, landing in turn (at most
  twelve drawn — a ×50 batch is a number, not a wall of cards), the count under them, then the gold
  and champion XP the evening was worth, the rung the first clear opened, whether Hard fell, and
  how many runs of the batch were completed. Its primary button goes back into the keep, on the tab
  the run was spent on.

### 5.25 The Market (`docs/design/MARKET.md` §1–§2)
- **Two tabs, and the difference is the first thing a player meets.** `Tabs` at the head of the
  scene, *Gold Market* and *Gem Market*, on the tavern-interior backdrop with the interior ambience.
  Under the tabs one line of blurb, and — on the gold tab only — **the countdown to the turn of the
  hour** in gold at the right. The gem tab has no clock at all, which is exactly the point of it: a
  shelf that never changes should not be wearing a timer.
- **The stall is six rows you skim, not six posters.** Each slot is a `thin` frame laid out in three
  columns: the currency's tinted icon at 52 px, its name over *"N left"*, and the price with the
  buy button. Six have to fit without scrolling, so a row is 52 px of icon and nothing taller. A
  second **"× N"** button appears beside *Buy* whenever more than one is affordable — buying the
  rest of a slot in one press is the difference between a shop and a chore. A sold-out slot says
  *Sold out*; one the purse cannot reach says *Not enough*, so a disabled button always says
  which reason it is.
- **The shelf is a grid of cards you read properly.** Singles on the `stone` slab; the four bundles
  on `ember-tall`, so a pack is visibly a pack before the price is read, and each wears a *once per
  chronicle* tag. A single draws the item's own icon tinted to its rarity, with the name in that
  rarity's colour. A bundle draws its **contents as a list plus a `RewardList` of any currencies**,
  because a bundle whose parts are not shown is a price that means nothing. A bundle already taken
  greys out and its button reads *Already taken*.
- **A purchase never leaves the screen.** No confirmation dialog, no result panel: the wallet in the
  header ticks down, the stall's stock ticks down, and the reward sound plays. Buying is the small
  action here; using is the large one, and that happens in the Bag.

### 5.26 The Bag and the champion picker (`docs/design/MARKET.md` §3, §5)
- **Every row says what using it would do, in full.** A consumable is bought once and used weeks
  later, so a name alone would make a player guess. Icon in a rarity-coloured square with its count
  in the corner, then the name in that rarity's colour over its whole description, then the button.
  Rows are in shelf order so the Bag reads the way the Market does. An empty Bag says so in one
  line rather than showing an empty frame.
- **The two that act on a champion say so and hand off.** Their button reads *Use on…* and opens the
  picker rather than acting on whoever is first.
- **The picker greys rather than hides.** The whole roster is drawn in a `VirtualGrid` of 96 px
  cards; champions the item would do nothing for — one already at their level cap for a Chicken, one
  already wearing every star for a Cheatmeal — are drawn **dimmed and dead to the touch**. Showing
  them is the point: a player looking for someone who is *not* on the list learns the rule from the
  list itself.
- **What happened is said, not announced.** After a use, one line under the list: the item's name in
  bold and the outcome after it — the boost and its new remaining time, *"twenty runs, from the
  top"*, the level or the stars reached. A refusal prints the engine's own reason in the same place,
  in the error colour.
- **The header sockets.** Three slots beside the profile chip, on every screen, one per boost —
  **always all three**, lit when running and dark when not (the owner's instruction). A lit socket
  wears its boost's tint and counts down; a dark one is a recessed empty well with a grey glyph and
  no clock, because "0h 0m" would read as a bug. Both states carry a tooltip, so a dark socket says
  what it would be and where to get one rather than sitting there as an unexplained dead icon.
  The countdown ticks off `useNow` rather than a timer of its own, because the expiry is an instant
  in the save.

  The first cut drew only the running ones, which was wrong in the way that matters: an icon you see
  only once a boost is already on can never tell you that one is *off*, and off is the state a
  player can do something about.
- **The Bag lives in the header**, beside the purse and the chest — a square slot with the sack icon
  and the count in its corner. It belongs there because it is a thing the chronicle *owns*, like
  gold and energy, not a fifth place to go; and it makes an item usable from any screen rather than
  only from the hub, which matters for something whose whole point is being spent at the moment you
  decide to.

### 5.27 Daily Rewards (`docs/design/LOGIN.md`)
- **A board, not a list.** Thirty tiles in a scrolling grid, each framed in its tier's colour —
  borrowed from gear's rarities, which a player already reads fluently. A tile carries *Day N*, its
  rewards as a `RewardList` (plus the item's name in words when it pays one, because an icon alone
  would be a guess), and its state: *Claimed* on the days behind, a primary **Claim** button on
  today's, nothing on the days ahead. The three finale tiles carry a faint gold wash, so the end of the board
  reads as the end of the board — every round, not only the first.
- **The line under the title is the whole design in a sentence.** *A day is a day you came* — so
  missing one costs nothing. Saying it on the board matters: a player who has met a login calendar
  before will assume there is a streak to protect and will feel punished by a day they missed that
  in fact cost them nothing. Beside it, which round of the board this is.
- **The foot says what is left**: the time until the next day once today's is taken, the finale's
  invitation while it is still there, and — right after a claim — which day was just taken.
- **It is reached, never pushed.** A *Rewards* plate at the far left of the hub's bottom bar wearing a notification
  dot the moment a day is owed. It does not open itself over the hub at launch: that would be the
  one dialog a player meets before they have decided to do anything, and with no streak to lose
  there is nothing urgent enough to justify taking the first press of the session.
