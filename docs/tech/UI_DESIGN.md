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
| `Tab` | `dark-ember/banner-plain` / `banner-dark` (active = ember, inactive = dark) | an optional line glyph before the word — the Tavern's three tracks, the Forge's three benches — or a painted icon (the Market's coin and gem) |
| `CurrencyPill` | the currency's icon cut round inside `dark-ember/frame-round-sm-lit` — the kit's own round frame — at the head of a slim dark bar with the gold hairline, the animated amount in `--font-num`, and `dark-ember/btn-ember-square-on` for "+" | top bar; the Bag and the idle chest are built from the same socket and bar, so the header's right side reads as one row of instruments |
| `Bar` | `stone-vine/bar-track-stone-*` + `bar-fill-health` / `bar-fill-mana` / `bar-fill-stamina`; `dark-ember/bar-track-ember` + `bar-fill-ember` for boss HP | fills are masked and animated; the carved track is used from 40 px (its rim is 30–40 source px), shorter bars get a hairline frame in the same materials; labels and values only above 20 px |
| `Slot` | `stone-vine/slot-stone-sm/md/lg/long` (+ `-fill`) | team slots, gear slots, brew slots |
| `Slider` | `stone-vine/bar-track-stone` channel + `dark-ember/bar-fill-ember` level + gold orb in `frame-round-sm` | a transparent range input on top keeps native keyboard and drag |
| `ChampionCard` | `Frame` (rarity) + avatar 256 + star row + level badge (`frame-round-sm`) + element sigil (glyph) + role glyph + lock/favourite marks | sizes: 96 / 128 / 192 / 256 |
| `ChampionPortrait` | avatar 512/1024 in `panel-arch` with parallax tilt on hover | detail screens |
| `SpriteView` | Pixi-less DOM sprite: atlas frame stepping via CSS `steps()` animation | idle loops in menus; cheap |
| `GearCard` | `Frame` (rarity) + the piece's own painting (`gear.<set>.<slot>`) + star row + `+N` badge + main stat + the set's emblem on a stone plate, bottom-left | 96 / 128; the painting shows the slot, so the corner that held a slot glyph names the set |
| `SetEmblem` | a set's emblem (`emblem.<set>`), bare on a panel or on a square dark-stone plate with a gold hairline | on a painting it always takes the plate — a bare red emblem vanishes into Ember Guard's own lava |
| `PieceThumb` | a piece's painting at list size in a hairline of its rarity (or gold), optionally with the emblem plate | drop chips, the Index's six pieces |
| `AbilityIcon` | `dark-ember/frame-round-sm` (+ `-lit` when ready) + spell icon + cooldown overlay + "P" tag | 96 px in battle, 64 px in menus; `inspect` makes it pressable whatever it is, a passive included — pressing reads it rather than casts it (the champion's kit strip) |
| `StatusIcon` | line-glyph (mask) tinted buff/debuff + duration digit | 28 px |
| `StarRow` | `stone-vine/icon-star` tinted (gold earned, grey empty) | |
| `Tooltip` | `dark-ember/frame-sm-thin` + `bg-tile-sm` | 200 ms delay, follows pointer; placed again once measured, before paint, so a tall one near the stage's foot opens above the pointer instead of past the edge; `prefer="above"` opens it over the pointer first, where what sits under the trigger is the thing being read (a hub building's name), flipping below when there is no room |
| `GearTooltip` | a `Tooltip` holding a piece's sheet: painting and emblem, name in its rarity, slot · rarity · +level, stars, power, main stat, every substat with its rolls, the set's emblem, name, piece count and bonus, and who wears it | on every gear card (racks, picker, Forge benches, dungeon haul, mission gift) and on a champion's worn slots |
| `Chip` / `SetChip` / `CurrencyChip` | dark stone with the gold hairline, square-cornered: the thing's mark (a set's emblem, a currency's icon), its name, and a count, range or chance in gold | wherever something important is *named*: what a settlement drops, what a keep holds, a tower boss's shards (`sm` 28 px / `md` 34 px) |
| `CurrencyLabel` | a currency's icon before its name, optionally with an amount in front | every row that lists what was won, spent or paid: a result's rewards, a dismantle's yield, a level-up, Forge and Tavern costs, a boss chest's contents |
| `RewardSlots` | bevelled dark-stone squares (`sm` 50 / `md` 64 / `lg` 78 px) with a hairline in gold or the thing's rarity: the icon large, the count in the corner, the name on hover and for a screen reader | what something *will* pay — a mission, a quest, a chest, a calendar day; a Bag item is drawn in its own art and edged in its rarity (`grants`), never named in words alone; `muted` for what is taken or still far off |
| `GoButton` (`ui/places`) | a secondary kit button with the place's own hub glyph: *Go to the Tavern*, or a compact **Go** where the card already names the place | the way to where a thing is done — a mission, a quest, an empty Bag; the Wallet draws the same ways as whole press-rows. It hides for a place the chronicle cannot enter yet: a button onto a locked door would be a promise the game then refuses. Where each goal of the shared DSL is played is `goalDestination` (§5.14, §5.15) |
| `Dialog` | `dark-ember/frame-wide` over dimmed backdrop; title banner | Esc closes |
| `Divider` | `stone-vine/divider-vine`, `deco-frames/deco-divider-NN` | |
| `RewardBurst` | item cards flying to the wallet with count-up | used everywhere |
| `NotificationDot` | ember dot with pulse | on hub buildings/buttons |
| `FxSprite` | a flipbook from the FX library (`fx.*`, §6.3) stepped on one DOM element by a single rAF loop — no React render per frame — and screen-blended over what is behind it | loops (the Forge's hearth flames, the Portal's rune ring on the hub) or plays once per `playKey` (the anvil's burst, the Idle Chest bursting open); under reduced motion a loop holds its middle frame and a one-shot is not drawn |
| `FillRing` | an SVG arc over a carved groove, exact at any size | the Idle Chest's fill on the hub and in its vault; an empty ring shows only its groove (a round cap would leave a dot) |
| `Timer` | `--font-num`, hourglass glyph | resets, chest |
| `Scrollbar` | custom stone channel (14 px, gold hairline) + ember thumb with grip ridges | never native; shown only past 8 px of real overflow and capped so it always reads as a handle; a `ScrollArea` with `fade` fades its content out at an edge it runs on past (the gem shelf), and only there |
| `Dropdown`, `Toggle`, `Slider` | stone frames + ember indicators | settings, filters; a dropdown option may carry an icon before its label (a set's emblem in the set choosers); a list opens upward when the stage has no room for it below its control — measured before paint, in stage pixels — so a control at a screen's foot (the campaign's difficulty) never opens a list the stage clips |
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
  medallion wearing a `FillRing` in its own green, with the time to full under its name and a dot
  once it is full.
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
- **The buildings** (`HubHotspot`, placed on the painting in `hotspots.ts`): the Campaign gate
  (opens Game Modes), the Portal on the statue, the Tavern, the Forge, the Champions barracks, the
  Glorious Palace, the Chronicler's Hall (the Path), the Market, the Idle Chest at the docks and,
  since `0.10.0`, **the Mine** at the old fountain in the middle of the square, where the Deepvein's
  shaft goes down — its medallion wears the in-house pick-over-a-gem glyph, its ring fills with
  the store in the crystal colour `--mine`, and its plate reads *Gems waiting: 9*, *Next gem in
  2h 10m* or, full, *Store full · 17 gems* with the dot and the ripple (§5.29).
  Each is a **medallion** — the kit's metal ring (`frame-round-lg`) around a dark disc lit from
  inside in the building's own colour, a soft halo breathing behind it; the Portal also wears a
  slow-turning rune ring (`FxSprite`) — over its **name on a patch of ink** with a hairline and a
  diamond in that colour, so the town shows through. Until `0.9.5` they were nine red banner boxes
  over the painting, which covered the town the hub exists to show.
- Under each name, **one live line** (`hub-status.ts`, every word derived from the save): the
  campaign's next stage, a champion to choose or the shards held, the brews on the shelf, new
  arrivals or the roster's size, Palace points to spend, missions to claim, the market's restock,
  the chest's fill and the Mine's store. When something is owed inside, the line turns to the building's colour,
  the medallion wears a count (or a dot) and a ring of its light keeps rolling outward from it —
  the town tells you where to go before you read a word. Hovering a building opens a card that
  says what it is for and repeats its line — above the building, or below the Portal, whose name
  sits over it, so the card never covers the name it repeats; a locked one says what opens it.
- Motion: lantern flicker sprites, fog drift, fireflies, water shimmer, the medallions bob out of
  step and swell and brighten on hover, camera parallax on mouse (±12 px), notification dots
  pulse; ambient hub SFX loop + music.

#### The Idle Chest dialog (`ECONOMY.md` §6)
- Opened from the hotspot at the docks or the top-bar pill, on any screen. Two columns.
- **The vault**, left: the chest in a round vault with its fill drawn round it (`FillRing`, green
  while it fills, gold when full) and the percentage under it. Full, the vault warms, slow rays
  turn behind the chest, glints catch on it and it rocks; before the first boss falls the vault is
  cold and the chest sits in shadow. Under it: the countdown or *Full*, the held time ("4h 20m of
  6h 00m"), the **capacity road** — every band's hours on a notch with the chronicle level that
  opens it, the passed ones lit and the held one bright — and the band line ("Holds 12h 00m ·
  16h 00m from chronicle level 30"), which is where the game teaches that levelling widens the
  chest.
- **The contents**, right: the farm — its settlement in the element's colour, with a `tier N`
  chip — then **Waiting inside** as cards, each with its icon, its name, the pace it fills at
  ("1,440 an hour") and the amount; then **Now and then**, each luck roll with its chance an hour
  (the brew named by the one the farm turns up) and one line on how often an opening pays each.
  Everything fits without a scrollbar.
- Opening it bursts the chest in gold and swaps the list for **The chest gives up**, the cards
  arriving one after another; *A stroke of luck* lights each roll that fired, and a note says
  when the hours past capacity were lost.
- Before the first settlement boss falls, the contents column is **the quiet docks**: why nothing
  gathers, that the hours held until then are kept and paid at the first farm's rate, what the
  first farm pays an hour, and *To the Campaign* (which only closes the dialog when the Campaign
  is already the screen underneath). A full chest there says it pays out once the boss falls,
  rather than urging an opening the button refuses.
- The button is *Open the chest* / *Still filling* (disabled while nothing has accrued, and before
  a farm), then *Continue*. Sound: `chest.open` on the claim, the reward toast with the hours it
  paid.

### 5.3 Champions (Index)
- Reference: left rail of `champions_gearing_info_screen.png`, `_alternative_3.png`.
- Layout: left rail grid of `ChampionCard` (4 columns, virtualised), sort (rank, level, power,
  element, recent) + filters (rarity, element, role, locked, favourite); right column: the tabs
  (§5.4) over their stone panel, and *Lock*, *Favourite* and *Tavern* beneath.
- **The centre column** (`ChampionHero`) is the champion, composed rather than listed (0.9.4):
  - The **portrait** (600 × 780, the rarity's deco frame) sits to the left of the column on a
    slowly breathing glow of the rarity's colour. The rarity is named on a kit banner at the
    painting's head; the **title is set into the painting's foot** — the name (42 px, a size
    smaller from eighteen letters so the longest name fits), element and role as chips (the mark in
    its socket, then the word, the element in its own colour), then the stars and *Level n / cap*.
  - The **idle sprite** (×4) stands at the frame's lower-right corner, half in front of it, facing
    the portrait, on a ground glow of the element's colour — anchored by its feet (every model's
    cell carries 12–18 px of air under them), not by its cell. The title leaves that corner clear.
  - The **kit strip** under the portrait: A1–A4, a rule, then the passive and the aura, each a
    64 px `AbilityIcon` in `inspect` mode with its slot named beneath. Hover says what it does —
    the name, cooldown and description with live numbers, upgrades counted; a press opens the
    *Abilities* tab.
- Vault (backlog): none in EA-0.1; instead "Food" filter.

### 5.4 Champion detail tabs
- Reference: `champions_gearing_info_screen_alternative_2.png` (right attribute list + gear column),
  `champions_gearing_info_screen.png` (gear grid + total stats).
- **Info**: the power on a plate of its own (crossed swords in the lit round frame — the account
  power's mark), the XP bar, then the stat table: each stat led by its mark (`STAT_GLYPH` — the
  Glorious Palace's marks for the nodes that grant it, held together by a test), the base, what
  gear and its complete sets add (green) and what the Palace adds (purple, hoverable). The three
  columns are named once above the table in their own colours, where a hint line used to explain
  them. Under the table, **Worn gear**: the six slots in order as 58 px paintings with the set's
  emblem and `+level` (an empty slot shows its mark in a stone recess), each piece's full sheet on
  hover, any slot opening the *Gear* tab — and the sets the build completes as emblem chips.
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
  is drinking; centre: `bg5` interior with the champion **framed in their rarity** — portrait,
  rarity plate, element, name (stepping down a size or four until it fits the frame, measured
  before paint, so the longest name reads whole), stars and `level / cap` — between the offering
  seats, three a side
  on the Level track and exactly as many as the rank-up asks for on the Rank track, with the
  track's own strip beneath; right column: the three tracks as tabs with their glyphs (*Upgrade
  Level*, *Upgrade Rank*, *Upgrade Skills*) over the track's panel, and at its foot the cost (each
  amount with its currency's icon, `CurrencyLabel`), the currency it is short of when it is, and
  **Upgrade**.
- **Level track.** Under the champion, the **road to the level cap**: a notch per level up to the
  star tier's cap, the level held in bronze, the level the table reaches running ahead in gold
  under a flag, the XP to the next level, and what would spill past the cap. Under that, the
  **brew shelf**: five bottle cards, the champion's own element first and tagged *Own element*,
  each with its XP per bottle (×1.5 for the own element), how many are left and a − n + stepper;
  pressing a bottle pours one. Each seat opens the food picker (locked, favourite and
  already-seated champions never appear; the picker prices each companion in XP), and a seated
  guest shows the XP it brings. The panel names the jump (`Level 1 → 9 / 30`), a ledger of what is
  on the table — brews and companions, each with its count and XP, and the total — and **After the
  upgrade**: HP, ATK and DEF and the champion's power, before → after. Two helpers sit at its
  foot: *Pour to the cap* sets the brews that reach the cap with the least spilled, the own element
  first; *Fill the seats* seats the cheapest companions — never a Rare or better, never anyone
  levelled — and stops once the cap has no more room. At the cap the table closes, the road says
  so, and a callout points to the Rank track.
- **Rank track.** The requirement (`n × n★`) with a pip per seat filled, the free copies of the
  right star as a larder of cards that seat themselves on a press, the level cap the rank raises
  (`30 → 40`), the stats after it, and *Auto-fill*, which runs the food finder. At six stars the
  track says so.
- **Skills track.** The tomes held for the champion's rarity; one row per ability — icon, name
  with a dot per step taken beside it, what it does, and a line of the next step in plain English
  with **Upgrade** (the tome's icon on it). Rarities without upgrades say so instead of showing dead
  buttons.
- Before anyone Rare-or-better, or anyone levelled, is retired, a confirmation names them one by
  one (`tavern-confirm`); a Common at level 1 goes without a question.
- Motion and sound: seats spring in as they fill, the road's preview runs ahead in gold, the level
  flashes with `stinger.levelup`, a new star bursts gold; the table clears itself the moment a
  press lands.

### 5.6 Campaign map
- Reference: `campaign_settlement_screen.png` (RSL map), `_alternative_2.png` (banners).
- Layout: painted map ground (`bg2`) under twelve settlement banners on a 6 × 2 grid, each a
  `DecoFrame` over the settlement's own backdrop and colour grade with its index, element sigil,
  name, star row and star count; the settlement the player stands in is ringed in gold and says
  so. Locked banners are desaturated and carry "Beat the boss of …" instead of a button.
  Difficulty dropdown bottom-left with the gate line under it — its list opens upward, since the
  stage has no room below it (`Dropdown`, §4) — star-chest track bottom-centre (10/20/30),
  *Emberhold* bottom-right.
- Motion: banners rise in on open and lift on hover; cleared settlements take the ornate gold
  frame.

### 5.7 Settlement stages
- Reference: `campaign_stages_screen.png`.
- Layout: left panel: settlement name and lore, star count, faction element, and **Drops here** —
  everything by its mark, in three captioned rows of chips (`SetChip`, `CurrencyChip`): the set
  pool by emblem, the difficulty's materials with their ranges (*every victory*), and the Faded
  Shard and the settlement's brew with their chances (*now and then*); content: ten
  scrolling stand rows — stage number, stars, best turns, enemy count and plate level, enemy chips
  with their element sigils, the star and defeat turn limits, and a **Battle · ⚡cost** button. The
  boss stand uses the ember frame and is labelled; a locked stand names the stand it waits on.
- From level 11 a stand with all three stars wears the **Instant** tag beside them — the quill on a
  gold hairline — because it can be cleared without a fight (`CAMPAIGN.md` §10); the press itself
  is on the battle setup.
- The difficulty is the one chosen on the map; auto-repeat lives on the Battle setup screen.

### 5.8 Battle setup
- Reference: `battle_setup_screen.png`, `_alternative_2.png` — a **face-off**: the team on the
  left, the enemy on the right, the VS mark and what the fight is for between them, the roster
  underneath and the launch column beside it, so the matchup is read before a button is.
- **Title** names the fight itself: *Stage 3-7 · Normal · Thornwood Crossing*, *Gargoyle · Easy*,
  *The Eternal Tower · Floor 12*, *Cindervault · Normal · Stage 1*, a brewery hall's stage.
- **Your team** (780 px, gold head rule): team power top-right; the seats — three in campaign, four
  in boss gates, keeps and the tower — share a 732 px row, never wider than 220 px each and always
  316 px tall, so a four-seat row crops the paintings' sides rather than shrinking the faces. A seat
  is the champion's painting in a frame of its rarity, the level on a plate in the corner, stars,
  the name (two lines before it is cut), element, role and power at its foot. The first seat wears
  the gold **Leader** banner; any other filled seat offers *Make leader* on hover (`team-lead-N`),
  which moves that champion to the head without shuffling the rest. Pressing a seat empties it (a
  ✕ shows on hover); an empty seat holds the kit's warrior silhouette and *Choose a champion*.
  Under the seats, the leader's **aura** — its icon, name and one line of what it does. At the
  foot, three **presets** on an even grid: the chip of faces loads one, the quill beside it saves
  the team into it.
- **Enemies** (780 px, ember head rule): the waves as chips in the head; the chosen wave's enemies
  as cards the team's measures — each enemy's idle loop facing left on a lit patch of ground, the
  level plate, the name, element, role (its glyph only below 200 px) and **HP / ATK / SPD** at the
  encounter's scale; a boss wears the ember **Boss** banner and a slow smoulder. Under them, the
  **scout's report** across from the aura: the elements strong against the wave and the ones it is
  strong against (the element wheel, `CHAMPIONS.md` §1), and *a healer stands among them* when a
  mender does. The foot counts the wave and weighs it.
- **The seam** between them: the VS diamond on two hairlines; the two powers on one bar — the
  team's in gold from the left, the strongest wave's in ember from the right, both
  `power()` (`CHAMPIONS.md` §2) so they are measured with one ruler, and hidden at a boss gate,
  where a race against authored numbers makes the sum meaningless; the stand's three stars, lit for
  the ones already earned, with the best clear; and how the fight is lost (*Lost after 40 ally
  turns*, or *The fight ends after 50 turns* at a boss).
- **Roster** (the dock's left): every champion strongest first in a virtualised strip of 96 px
  cards, narrowed by element and role chips in its head; a seated champion is dimmed and carries its
  seat's number on its shoulder (the leader's in gold).
- **Launch column** (480 px): *Auto-repeat* where a stand or a keep takes it (a locked tier carries
  the shackle and says which level opens it) side by side with the **Manual | Auto** switch — one
  `role="switch"` with two lit halves — and, under both, above one run, how many runs the energy
  covers. On a campaign stand from level 11, the **instant clear** press (`CAMPAIGN.md` §10): the
  quill, *Instant ×10 · 40 ⚡* — the count the energy covers and what it costs — and one line under
  it; on a stand short of its stars the same press, dead, saying three stars open it, and on a purse
  short of one run, dead, saying what one costs. Then **Start battle** with the price on it:
  `6 ⚡`, `1 key`, `One run`. Too little energy disables it and says what the stand costs.
- Click-to-place, as before: a champion who is not seated takes the next empty seat, or the last
  seat of a full team.

### 5.9 Battle
- Reference: `in_battle_non_boss_screen*.png`, `in_battle_boss_screen*.png`.
- Layout: Pixi stage full-bleed (allies left, enemies right, ¾ perspective floor plane); above
  each unit a plate: level, the unit's **element** sigil (the wheel decides who should strike whom),
  name, HP bar with its shield, TM bar and the status row (up to 10 icons). A plate under a third
  of its health pulses its edge red; a full turn meter turns gold, because that unit acts next.
- **Top left** — the instruments: a kit square with a drawn **pause** mark (two gold bars — the
  kit has no glyph for it and nothing reads faster), then a stone plate with *Wave 2/3* and the
  waves as diamond pips (done, now, to come), *Ally turns 7 of 40* with the turn budget draining
  in a thin bar under it (ember for its last quarter), and the time.
- **Top centre** — whose turn: a champion's face and *Name's turn* on gold rules, or an enemy's
  element sigil and *Name acts* on ember; each turn slides in over the last, so a fight at ×4 still
  reads as a sequence. A provoked champion's banner says what the provocation leaves it. It steps
  down under a boss's pool bar (top centre, with phase pips and the boss's statuses).
- **The middle** — a wave's name sweeps in as the wave begins (*Wave 2*, *2 of 3* under it) and
  holds for 1.4 s; it never takes the pointer. The first wave's waits for the fight to begin — the
  stage holds the first turn until it is up — so a slow renderer never spends it unseen.
- **Bottom left** — one stone dock of three switches, each a 92 px square with its key in the
  corner: *Info* (I) opens the log, *Auto* (A) glows ember and turns its vortex while it runs the
  fight, and the speed (+/−) shows *×2* over four pips — lit to the speed, dark past what the
  chronicle has unlocked.
- **Bottom right** — the ability bar: a head with who acts and what **Space** would cast (or *Choose
  an ability, then a target*, or *Auto chooses every move*), then the portrait, A1–A4 as
  `AbilityIcon`s and the passive. The tooltips quote the numbers the fight uses — **with the
  champion's Skill Tome steps in them**, not the ability's base line.
- **The end** — *Victory* or *Defeat* as a ribbon across the whole screen, gold or red rules above
  and below, the word spreading as it lands, for the beat before the result takes over.
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
- **The pause menu** (640 px). It opens with the fight in one strip: where it is, then the wave,
  the ally turns against the limit, the speed, and whether the champions or the player are
  choosing. Under it:
  - **Resume**, full width;
  - *Settings* and *Retreat*, side by side;
  - a line saying Esc resumes.

  *Retreat* turns into a red card that says what it costs, with *Stay and fight* and **Retreat**.

### 5.10 Battle result
One layout for every fight. The result is laid out in three bands: the crest at the top, the team
and the side panel in the middle, and one row of presses along the bottom.

**The crest.** It sits at the top centre.
- The emblem sits over the word: a trophy for Victory, a skull wreath for Defeat and Time's up, a
  shield for Retreat.
- The word itself: Victory in gold on a slowly turning crown of light rays; Defeat, Time's up and
  Retreat in red on a cold one.
- The subtitle, which names the fight: stage, settlement and difficulty for a stand, boss and tier
  for a boss race, the mode's name for a tower, brewery or dungeon fight.
- A stand's three stars land one by one with a small chime each; the **New record** badge follows
  them.
- A batch adds a line under the stars: how many runs, and how the batch ended (done, stopped,
  defeated, out of energy).
- After a lost fight, how close it came: the enemy's health that was left, as a bar under the
  subtitle.

**The team.** It takes the left of the middle band (`ChampionReport`).
- Each champion who fought is a card, one after another; four cards fill the row.
- The painting sits in the champion's rarity frame and carries:
  - a level plate;
  - a green **Level up** badge when the fight earned one;
  - the name;
  - an XP bar showing where the champion now stands, with what the fight added (**Max level** at
    the cap).
- Under the painting, what the champion did:
  - damage dealt, as a bar against the team's best;
  - damage taken;
  - healing;
  - kills.
- The top dealer wears a gold **MVP** ribbon over a glow in their rarity's colour.
- A champion who fell is greyed out and stamped *Fallen*.
- The *Champions* heading is exactly as wide as the cards. The fight in three numbers sits at its
  other end: ally turns, total turns, waves cleared.

**The side panel.** It is a stone panel on the right under a gold rule (an ember rule after a
loss). It stops above the buttons and scrolls inside itself, so a long batch never runs underneath
them.
- Every mode draws its spoils in the same two pieces:
  - **Banners**: a glyph and a sentence on a band of their tone. Gold for a first clear, a star
    chest, a chronicle level, a record or a chest earned, and — with the quill — the run that took a
    stand to its last star (*Stand mastered: clear it instantly from now on*, or before level 11 the
    level instant clears open at); purple for a champion owed at the Portal or a boss floor's
    shards; red for a floor, run or keep that held.
  - **Reward tiles**, four to a row, landing one after another: the currency's icon, what came in,
    and its name. Champion XP and chronicle XP get blue tiles under their boosts' marks; shards get
    a purple tile in their own light.
- Each mode fills the panel its own way:

  | Fight | What the side panel shows |
  | --- | --- |
  | Campaign stand | *Spoils*: the banners, the tiles, then the drops. Each drop is a chip of its painting with its set's emblem, named in its rarity's colour, two to a row. A dozen at most are drawn and a longer batch counts the rest. |
  | Tower floor | The floor, the climb as a banner, then the tiles. A boss floor's shards come last, under their own purple banner. |
  | Boss race | The damage this key did, large. The period's pool as a bar notched at every chest's threshold, each notch lit once reached, with the chests marked under it. Then the record and the chests this fight earned as banners, and the chronicle XP. |
  | Brewery run | The casks, one per brew, pouring in beside the count. Then the first clear as a banner and the runs left today. |
  | Dungeon batch | The pieces as gear cards in their rarity frames, then the first clear and Hard opening as banners (the armoury being full in red). Then gold and XP as tiles, and the runs. |

- Wherever a Glorious Palace point was paid, the Palace plate follows with a press straight to the
  Palace.
- The seed sits at the panel's foot.

**After a loss.** The side panel turns to *What to try next* (`adviceFor`, `result-view.ts`).
- Each reason the fight went badly is a card of its own, and only when it is true:
  - out-sped (the enemy took well over 1.4 turns to each of the team's);
  - a mender left standing with waves still to clear;
  - the turn limit;
  - a champion below the enemy's level.
- A card carries a glyph and the advice. Where the fix lives, it adds a press straight there:
  *To the Champions* or *To the Tavern*.
- A boss race is judged as a race instead: the turn limit is a normal ending, then damage over time
  and curses until the boss falls.
- A lost stand adds the line that the energy is spent either way.
- Any loss that is not a boss race ends in **Grow stronger**: three shortcut cards to the Tavern,
  the Champions and the Portal.

**The buttons.** The ways out sit on the left, the one press that matters on the right, and the
team is never offered twice.

| After | Left | Right |
| --- | --- | --- |
| A won stand | *Emberhold*, *Campaign*, *Team*, *Replay · cost ⚡* | **Next stand** |
| A lost stand or a retreat | *Emberhold*, *Campaign*, *Try again · cost ⚡* | **Team** |
| A mode's fight | *Emberhold* | The mode's own way back (**Back to the tower**, **the gate**, **the keep**, **the Brewery**) |

The team for a mode's fight is set on the mode's own screen.

### 5.11 Forge & Armoury
- Reference: `tavern` layout language + right column pattern.
- **Two screens, by the owner's decision** (Q36): the Armoury keeps its own route and the Forge is
  *Craft* / *Dismantle* / *Refine*. Each links to the other, so a full rack is two clicks from the
  hammer either way.
- Forge (`screen-forge`, off the hub's forge hotspot, gated at player level 8): backdrop `bg5`
  with the hearth's own glows; the benches as tabs with their glyphs (*Craft* a hammer,
  *Dismantle* a bomb, *Refine* stars), the bench's one-line hint, and *Open the Armoury* on the
  right. Beside every bench stands the **storeroom**: every Forge material and the gold, each with
  its icon, what it is for and how much is held — lit when the bench's recipe draws on it, red
  when it is short, with the recipe's `−n` against it (or the `+n` a dismantle would return).
  Until `0.9.5` the benches sat on one grey slab with the stores out of sight, which read as a
  form rather than a smithy.
  - *Craft* — three numbered steps and the anvil. **1 · the slot**: six `Slot` tiles, each showing
    the named set's painting of that piece (the slot's glyph before a set is named). **2 · the
    tier**: three cards — name, pool, what the tier is for, its rarity odds as a coloured bar with
    a legend, its star odds, its material lines by their icons (red when short) and "You can
    strike this n×". **3 · the set, optional**: the set chooser (each option led by its emblem),
    the Glyph Sigils held, and the named set's card with its bonus and the Sigil it costs. Right,
    **the anvil**: the block raised over a burning hearth (flame flipbooks, `FxSprite`), the named
    set's painting glowing on the block as a ghost of what will be struck (or the slot's glyph),
    the hammer falling on every press with a burst of sparks, and the struck piece's whole sheet
    (`GearTooltip`'s) beneath; **Strike** — then *Strike another* — with the recipe's cost under
    it. Changing the slot, tier or set clears the last piece struck.
  - *Dismantle* — the rack's head counts what is free to break and what is kept (worn and locked
    pieces are never listed); the quick picks of `GEAR.md` §6 (*Common & Uncommon*, *Never
    levelled*, *1–2★*), disabled when nothing matches, and *Clear the selection*; a 128 px
    `GearCard` grid. Right, **the heap**: `n selected` of the 50 a press takes, a pile of the
    chosen pieces' paintings, the merged returns by their icons (the storeroom shows them
    arriving), the level refund, and **Dismantle n** in the danger colour.
  - *Refine* — two numbered racks: the pieces that can climb, then the twins that may feed the
    chosen one (same slot, same star, unworn, unlocked). Right, **the whetstone**: the piece before
    and after, side by side, its stars `n★ → n+1★`, the main stat either side, what survives
    (rarity, level, substats), the twin to be fed, the cores and gold by their icons with the cores
    held, and **Light the star**; with nothing chosen the panel reads the rules instead. Below
    player level 18 the tab shows that level instead.
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
  `summoning_screen_alternative_2.png` (chances panel). Shipped in `0.0.8`, rebuilt around the
  gate in `0.9.8`.
- **The gate is the screen.** The Pixi ritual layer covers the whole stage (so the ring stays a
  circle at every size) and hangs the ring in the open middle (`RING` in `ritualScene.ts`, passed
  to the DOM as `--ring-x`/`--ring-y`). In it the chosen shard's crystal turns — drawn, not painted,
  cut and coloured after its icon (`SHARD_CRYSTALS`) — over a slow vortex, with runes glinting round
  the ring. Choosing another shard dissolves the crystal and forms the next out of light.
- **Under the gate, the nameplate and the presses** (`GatePlate`): the shard's name in large type
  glowing in its light, what it can answer with (`RarityRange`: a lit diamond per rarity, then the
  least and the most by name in their colours), and the two presses side by side — *Summon ×1*
  (stone) and *Summon ×10* (ember) — each with the shard's icon and its cost, disabled while the
  purse cannot pay. Under them, the count held, or why a press was refused.
- **Left rail** (`ShardRail`): a card a shard — its icon in a diamond socket lit with the shard's
  light, the name, the rarity range and a one-line blurb, and a plaque with the count held in large
  numerals (greyed at none). The chosen card takes the gold frame, a bar of its light down the left
  edge and a pulsing socket. While the campaign owes a champion choice, a gold card under the
  shards names the debt and carries *Claim your Epic*.
- **Right column:** *Standard* / *Featured* tabs over a stone panel with the banner's name, the
  rotation (number, countdown, three featured champions as idle sprites, and the Primordial
  Rotation marked), the shard's **Chances** as bars in the rarities' colours (on a square-root
  scale, so a 1 % Legendary is still a mark you can see; the exact number beside each), its
  **Mercy** as bars filling towards each guarantee (`since / (since + within)`) with the climb
  noted while soft pity runs, *Rates* and *The last summons*, and the **Exchange** with the price's
  coin (Gold→Faded, Gems→Ancient/Sacred, Primordial never sold).
- **The press** (SUMMONING.md §5 for the ceremony itself). A scrim fades in over the panels and the
  top bar, the ritual layer rises above it (and under the reveal's own cards and buttons), the
  nameplate steps aside, and the gate charges, tells, holds its breath before gold, and bursts.
  The overlay makes no stacking context of its own so its scrim, the rising gate and its cards
  interleave with the screen.
- **The cards** land **on the ring's own centre**, not in the middle of the window: the champion
  steps *through* the gate. One card (192 px) spins in, its stars pop, its rarity is stamped under
  it (a seal for an Epic or better), then its name and "NEW" or "Duplicate — rank-up material".
  Ten (128 px) are dealt face down in a 5×2 grid, backed with the shard that bought them, then
  turned in order with the best last after a breath, marked *Best of the ten*; in the grid a
  second copy just says "Duplicate". Out of the overlay's flow, the cards stay put when the results
  land. *Skip* is offered throughout; the results (*Continue* / *Summon again* / *View champion*)
  take the nameplate's place under the gate.
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
- **Opening tier.** With no tier asked for, the gate opens on the one the chronicle is working on:
  the deepest tier with damage in it this period, else the deepest it has ever fought, else the
  first (`openingTier`, `ui/screens/bosses/boss-view.ts`). The Titan grew a tier below Normal in
  `0.9.10`, and a chronicle that fights Normal is not sent back to Easy every time it opens her gate.
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
- **Reference.** `different_content_battles_screen.png` for the card that leads here. The backdrop
  is `bg.bg1` graded to near-black, with the interior ambient preset and a cool vignette.
- **Layout.** Three columns under the top bar:
  - on the left (470 px), the tower itself;
  - in the middle, the **dossier** of the selected floor;
  - on the right (420 px), the season.
- **Opening floor.** The screen opens on the floor that matters: the next one to climb, or the one
  the route named.

**The tower (left, `TowerLadder`).** It is a stone arch (`panel_arch`) holding a hundred floors as
stone slabs in a `ScrollArea`, *reversed* so floor 1 sits at the foot and the climb runs upward.
- **Each slab** carries:
  - a number plate;
  - the settlement whose faction holds the floor.
- **A keeper's floor** is taller and cut from redder stone. It names its keeper beside a flaming
  skull, with the shard odds under the name (`tower-odds-N`).
- **States:**
  - Sealed floors are dark, at 55 % opacity.
  - Cleared floors light their plate in gold and say *Cleared* in green.
  - The one open floor is an ember band in a gold frame that breathes.
  - A keeper beaten this season wears an ember rim.
- **Selecting a floor.** Pressing a slab reads that floor in the dossier. The selected slab gets a
  bright rim and a pointer toward the dossier. The ladder follows the selection when it changes
  from elsewhere.
- **Fighting from the ladder.** The two states a key may open (the next floor, and a keeper beaten
  this season) carry their own **Fight** on the slab.

**The dossier (middle, `FloorDossier`).** One floor, read before a key is spent.
- **Header.** The place that holds the floor is the header's art, drifting slowly. Over it:
  - a kicker: *Floor*, or *The floor's keeper*;
  - the floor's number, large, in gold (in ember for a keeper);
  - the settlement or the keeper's name, with the element's sigil and who holds the floor;
  - a ribbon in the corner with the floor's state.
- **Terms**, as chips: the enemy level, the turn limit, and how many champions may go.
- ***Who holds it*.** The floor's one wave as the setup screen's enemy cards: its idle loop, level,
  element, role, and HP, ATK and SPD at this floor's scale. A keeper's floor shows the keeper and
  its two escorts.
- ***What a clear pays*.** The result screen's reward tiles (§5.10), built from
  `towerFloorPayout`: gold, brews, energy, and champion and chronicle XP. A keeper's floor adds its
  element's brew and its shard odds as purple tiles (*0.25 % · Ancient Shard chance*).
- **The press at its foot**, with the key it costs beside it:
  - **Climb floor N** on the next floor;
  - **Fight floor N again** on a keeper beaten this season;
  - both disabled, saying so, when no key is held;
  - a line instead of a press on a cleared floor (only keepers may be fought again), or a sealed
    one (which floor to clear first).

**The season (right, `ClimbPanel`, `ember-tall`).**
- ***The Climb*** and its blurb.
- **A ring of the season's climb.** It holds the floor number and *of 100*, with the best ever as
  a violet notch on the ring. Beside it are *Season*, *Resets in* and *Best ever*.
- ***Eternal Keys***:
  - the count (**ember when over the cap**, because 16 / 10 is worth seeing);
  - a row of ten kit keys, one lit per key held;
  - *Next in 14m 35s*, or *Full*, and beside it **Buy keys**, which opens the Wallet on the Eternal
    Key and its gem refill (`0.9.10`, Q49).
- ***The keepers***: a board of the ten keepers' floors with their shard odds.
  - Those beaten this season are lit gold with a trophy; the next one burns ember; the rest wait
    dark.
  - A press reads that keeper's floor in the dossier, however far up the tower it stands.
- **At the top of the tower**, a gold line says the tower begins again when the season turns.

**The fight.** It is an ordinary battle: it goes through battle setup, so a team may be rebuilt
between floors. The key is charged when the fight starts (`ETERNAL_TOWER.md` §6). The result screen
(§5.10) draws the floor's own panel: the climb as a banner, the pay as tiles, and a keeper's shards
under a purple banner of their own.

### 5.14 Quests — The Chronicler's Ledger (`QUESTS_MISSIONS.md` §2–§3)
- Reference: the RSL missions/quests layout (`progress_missions_screen.png` for the track).
  Backdrop `bg.bg3` (the runed gate, where the chronicler stands with their ledger) with the
  interior ambience and two candle glows.
- Header: **Daily** / **Weekly** tabs, each wearing a badge with what that board owes (quests
  finished plus chests earned); on the right, the period's countdown (*Resets in 10h 31m*) and the
  primary **Claim all (N)**, which reads *Nothing to claim yet* and is disabled when the board owes
  nothing. Under it the board as two pages.
- **The tally** (`LedgerTally`, an `ember-wide` panel on the left): *Today's tally* or *This week's
  tally*, the board's *40 / 100 points* large, and its chests down a vertical rail that fills from
  the top as quests are claimed. Each chest stands centred on its own threshold, so the gaps between
  chests are the gaps between their numbers (20 / 40 / 60 / 80 / 100 daily, 25 / 50 / 75 / 100
  weekly): the kit's painted chest in a bevelled niche with its mark under it, a lozenge on the rail
  that lights once the points reach it, what it holds as `RewardSlots`, and how far off it is
  (*20 more points*). The chest itself is the press. One the points have reached glows and stirs
  until it is opened (still under reduced motion); a taken one dims and wears a trophy. The daily
  hundred prints its cadence under its slots (*Every 3 claims this pays Ancient Shard ×1 instead.*).
- **The board** (`QuestCard`, two columns of `thin` cards, all ten in view): the quest's emblem in a
  gold-edged plate with its points under it, its line, a groove with `progress / target` beside it,
  and its reward as `RewardSlots`; at its end the one press that means something now — **Claim**
  once it is done, **Go** to where it is played while it is not (the place named under it: the
  Campaign, the Tavern's Level tab, the Forge's bench, the Gargoyle at the tier the quest names), a
  *Claimed* seal once taken. A card never offers a press that does nothing: the old disabled Claim
  on every unfinished row was one. What is owed stands first and what is taken last, each group in
  the board's own order, so a quest only moves when its state does. A finished card breathes gold
  until it is claimed. Nothing on the board is ever a dead row: a quest whose feature is still locked
  is not shown at all, and the period's replacement quest carries its points — in ember, with a
  hover that says whose they are. The weekly quest that counts daily boards is played on this very
  screen, so its **Go** turns to the Daily tab rather than opening a second ledger.
- A board the chronicle cannot open yet (the weekly one before level 12) replaces both pages with
  one panel: a broken shackle and *The ledger opens at chronicle level 12.*
- Motion and sound: `reward.small` on one claim, `reward.medium` on a Claim all, `reward.large` on a
  chest, `ui.tab` on the tabs, `ui.open` on a Go, `ui.error` on a press the board refuses; every
  claim raises a reward toast naming the points and the currencies, and the top bar ticks up.
- The hub's bottom-bar **Quests** button opens the ledger and carries the same badge; the Welcome
  Back panel says when a new day's or week's quests are waiting.

### 5.15 The Chronicler's Path (`QUESTS_MISSIONS.md` §4)
- Reference: `progress_missions_screen.png`. Backdrop `bg.bg6` with the interior ambience and two
  lamp glows over the chronicler's table.
- Header: the ten chapters as tabs (`ChapterTabs`) — each the kit's banner with a glyph for its
  state (a trophy for a finished chapter, the ember flame on the one being walked, a broken shackle
  ahead), *Chapter N* and a thin gold rail of how far it is walked, with a dot while its chest waits
  — and beside them the Path's total, *72 / 120 missions*, over a rail of its own. The chapter's own
  name is prose and sits with Eldric instead. Every tab is readable, including chapters still to
  come: the Path is a promise as much as a task list.
- **Mission cards** (`MissionCard`): a rail of tall cards joined by chevrons — gold behind a claimed
  card — with a slim drawn arrow either side that steps one card; the rail opens on the mission
  being walked, not at the start of its chapter. A card: a hexagonal crest standing out of its top
  edge in the colour of the kind of asking it is (campaign, champion, gear, summon, boss or
  chronicle — `mission-view.ts`), *Mission 7.1*, the kind as its heading (*Campaign mission*) and
  the line it asks for — a stage reference such as "4-10" is held whole rather than broken across
  two lines. Its middle says what it is doing: while it is walked, **where it is played** (the
  place's glyph in a gold lozenge and its name — *Thornwood Crossing*, *The Gargoyle*); a trophy and
  *Complete* once finished; a *Claimed* seal once taken; a broken shackle and *Locked* while it
  waits. Under it *Progress* with `progress / target` over a groove, a *Reward* divider and the
  reward as `RewardSlots`, and at its foot the one press that means something: **Claim** once
  finished, a compact **Go** to where it is played while it is walked — never the old disabled
  *In progress* — and for one still to come the mission it waits on (*Opens after mission 7.1*). A
  locked card's counter goals read zero (it has not started); its state predicates read the truth,
  so a chronicle deep enough sees what it already satisfies. The foot is always there, so every
  card's progress and reward sit level along the rail.
- **Eldric** (a `thin` panel at the foot, left): his portrait — the same face that teaches the
  chronicle — in a gold rim, *Chapter N*, the chapter's name, and his line for it in quotation marks
  with his name under it (the Path's own line once every mission is claimed).
- **The chapter chest** (`ChapterTrack`, an `ember-wide` panel beside him): *Chapter chest* with
  `claimed / 12`, twelve skewed pips — gold for a claimed mission, ember for the one being walked —
  what the chest holds as `RewardSlots` (the last chapter's champion as Eldric's portrait edged in
  gold, the gift as a 6★ piece), and the press: *Finish the chapter*, **Claim** while it waits, then
  *Taken*.
- **Eldric's parting gift** (`MissionGiftDialog`): the last chest owes a 6★ Legendary piece, so the
  dialog offers the six slots and the set list, strikes it on *Strike it*, and shows the card it
  made before it closes. Once — the piece's id is kept in the save.
- Motion and sound: `reward.medium` on a mission, `reward.large` on a chest or the gift, `ui.tab`
  on the tabs and the arrows, `ui.open` on a Go, `ui.error` on a press the Path refuses; a claimable
  card breathes gold (still under reduced motion); every claim raises a reward toast with what it
  paid, and Eldric's arrival gets its own.
- The hub's bottom-bar **Missions** button opens the Path and carries a badge for the mission or
  the chest it owes.

### 5.16 Idle chest
- See §5.2: the chest lives on the hub (the hotspot at the docks and the top-bar pill) and its
  dialog is specified there.

### 5.17 Profile & Settings
- Reference: `player_profile.png` (chip).
- **The chip** is a dark plate with a gold hairline along its foot, fading out to the right; hover
  brightens the plate and lights the ring. It carries:
  - the avatar in the kit's round frame, with the level on a gold gem set into the ring's foot;
  - the name, and the worn title under it in gold small caps;
  - the XP toward the next level as a lit blue bar in a dark groove (the numbers in its tooltip);
  - the **Account Power** row: every owned champion's power summed, in gold numerals.

  On a level-up the ring flares and the gem pops (skipped under `prefers-reduced-motion`).
- **Profile dialog** (1120 px wide): two columns.
  - **On the left, the chronicler as a card:**
    - the portrait in a gold deco frame, with the level on a gold gem set into its foot;
    - the name with *Rename*;
    - the worn title with *Choose*;
    - the experience bar with its numbers;
    - the Account Power plate;
    - *Choose avatar*.
  - **On the right, scrolling:**
    - the standing as eight glyph tiles (energy cap, stands cleared, champions, strongest
      champion, battles, victories, chronicle begun, time played);
    - the campaign's stars, one row per difficulty, with a gold bar (a mastered difficulty gets a
      gold rim);
    - every title as a chip: earned ones lit with a trophy, the worn one framed, the rest dark
      with what earns them in their tooltip;
    - the next three level gates, as cards under a gold hexagon of their level.
  - The avatar and title pickers open in place of the profile and return to it when they close.
- Title picker: two-column list of every title, earned ones in gold with a trophy glyph and
  selectable, locked ones dimmed with a shackle glyph and a "Locked" tag; *No title* is always
  available.
- **Settings** (1060 px wide): a rail of sections on the left and the chosen section's cards on
  the right.
  - **The rail.** A vertical tab list (the arrows, Home and End walk it). Each section is a plate:
    its glyph (dove for Audio, eye for Display, crossed swords for Battle, the book for Save data,
    the quill for About), its name, and one line of what it holds. The open one is lit with a
    gold rule down its edge. The version sits at the rail's foot.
  - **The pane.** A header repeats the section's glyph, name and line, over titled groups of
    setting cards. Each card has its name and a sentence of what it does on the left, and its
    control on the right:
    - a slider takes the card's wide right half;
    - a switch, a button or a picker sits at the card's end.
  - **Switches** are bevelled stone grooves with a square knob. Off, the groove is dark and says
    *Off*; on, it is ember-lit with a gold knob and says *On*.
  - **Battle speed** is a row of joined plates, ×1 to ×4: the one in force is gold, and the
    speeds not yet earned are dim and chained. Pressing a chained one says where it is earned
    instead of applying it.
  - **Save data** keeps *Export* and *Import* under *Keep your chronicle*, and *Reset chronicle*
    alone under *Start over* on a red card (the typed confirmation follows).
  - **About** holds the Chronicle of Changes and the credits.
  - Every change applies at once and is saved with the chronicle. Before a chronicle exists, the
    controls show but are still.

### 5.17a Level-up
- The moment (`ECONOMY.md` §4) is a dialog, never an overlay on a fight: levels earned during a
  battle queue in `ui.levelUp` and celebrate on the screen that follows it.
- Layout: ember burst behind a large numeral for the level reached ("Level 4 → 7" when a batch
  crossed several), then *Paid out* (gold, gems, shards — each by its icon — the energy refill
  and the new cap),
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
  there. Continue takes focus, so the whole beat is one key. A lesson that only asks to be read
  (Continue finishes it, so there is no second beat) lights what it names while he speaks: each
  target is cut out of the dim with the pulsing gold ring and no caret, and a clear layer over the
  screen still takes every press but the panel's — 1.9 lights the crest's stars and the spoils,
  1.11 the energy pill as it counts up.
- **While the player acts.** The panel shrinks to a strip — his face at 56 px, the line, the skip —
  above the bottom bar, so the lesson never sits on top of what it is teaching; when a target
  stands where the strip would (the Portal's presses stand under its gate, not in a bottom bar),
  the strip waits under the top bar instead (`data-dock="top"`). The scrim gains one
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
| `mine.strike` / `mine.deepen` (the Mine) | `Chopping and Mining/mine 1–5` / `Spells/Rock Wall 1–2` |
| `instant.write` (an instant clear's page turning, once per run counted) | the synthesised card flip the Portal's reveal uses (`sfx.summon.flip`) |
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
- **The rail: the day, then the halls.** A 420 px ember panel on the left. At its head, **Today's
  runs**: a 46 px numeral over a rack of twenty flasks on two gold-hairline shelves — a spent run
  keeps its place, dark — then the sentence the rack cannot say ("20 of 20 runs left today", in warn
  amber when there are none), the reset countdown and the line that every hall draws on the same
  twenty. Under it **The four halls** as cards: the hall's own place as art faded into the stone
  where the words sit, its element as a bevelled diamond medallion, its name, its doors (*Open today*
  in `--ok`, or *Opens Wednesday* with the broken shackle in `--warn` and the art greyed), how deep
  it has been taken as five diamonds lit in its element beside `3/5`, and how many of its brew the
  purse already holds — everything a day's choice of hall turns on, before it is opened. The chosen
  card takes a gold border, a wash of its element and a thick left rail. The rail ends with where
  the brews go: one line and **Pour at the Tavern**.
- **A hall wears its own place.** The backdrop is the settlement its deepest cellar is cut under,
  under a grade in the hall's element (amber, ember, ice, violet), so walking from the Ember Vats to
  the Waning Cellar is walking somewhere else. The right panel opens on the hall's **banner**: the
  same place drifting behind a grade in the element, an 86 px medallion, the name at 44 px in the
  element's colour, its days ("Open Wed, Sat, Sun", ordered from the game's own week start), its
  week as **seven day-stones** — open days lit in the element, today ringed in gold — the doors badge
  (*Open today* / *Closed today*), the blurb, and the element wheel's advice as a chip with the
  counter element's sigil ("Bring Faith champions — they have the advantage here"). A barred hall
  adds an amber strip saying when it opens and how long that is, and every Brew button in it is
  disabled — a closed door never costs a run.
- **The descent: five stages side by side**, left to right as the hall goes down, each a framed
  card (`StageCard`):
  - its head is the place its cellar is cut under (the backdrop's 640 px card cut), the stage's
    number at 58 px in gold, what it is pitched at ("Mid game"), who holds it, and its state as a
    chip — *Next* in gold, *Cleared* with a trophy, or the shackle;
  - its **guards stand on its floor** (`SpriteView` idles on a lit patch of ground in the hall's
    colour), in a formation that fits a narrow card: a captain alone at the front at 1.75×, flanked
    by their guards a step behind; otherwise the first two at 1.25× with the rest a row back in
    shadow;
  - what it fields ("4 guards · level 34", or the captain) and its ally-turn limit;
  - the guards' **power** against the roster's best three, measured with the same ruler a
    champion's power is: a green rail when the three are clearly stronger (≥ 115 %), amber for an
    even fight, red when the guards are stronger (< 85 %) — the stage to farm is readable before a
    run is spent;
  - what a clear **pays** at 34 px — the brew and `×3` in gold — because the brews are the point;
  - the press: **Brew** in red on the next stage, stone on the cleared ones, and on a locked stage
    the line that says which stage opens it. The next card glows and breathes; a cleared one wears a
    bronze frame; a locked one goes dark and grey but still shows what it pays, because that is the
    reason to reach it. Cards rise in one after another when a hall opens (Framer Motion, skipped
    under reduced motion).
- **The haul** under the descent: *The best haul left today* — the brew and what the runs still in
  hand would pour at the deepest cellar taken — beside the planning sentence for a whole day ("Your
  deepest cellar here is stage 3 — all 20 runs on it would pour 60 brews"), or, before anything is
  cleared, that stage 1 is open and pays one a run.
- **What a run says.** The battle result (§5.10) carries a Brewery panel beside the boss's and the
  tower's: the hall and stage, one cask per brew filling in sequence, the first clear that opened
  the next stage, and the runs left today. Its primary button goes back to the hall the run was
  spent in.

### 5.24 The Dungeons (`docs/design/DUNGEONS.md`)
- **The overview is a row of keeps, not a list.** Five `ModeCard`s (§5.19) across the screen,
  easiest first, each on its keep's own backdrop: the keep's name, its blurb, the **sets it holds**
  under a *Holds* caption as emblem chips (`SetChip`) — the one thing a player chooses on, so the
  set's mark is what they spot — and, as the card's live note, the deepest rung
  they have taken in it. The sealed Gilded Veil keeps its place
  at the end of the row, desaturated and wearing the broken shackle, with its reason on the card
  rather than only on its button: *"Sealed until there are necklaces, rings and trinkets to find."*
  A mode you cannot enter yet still has to say what it **is**, which is why `ModeCard` renders its
  children shut as well as open.
- **A keep is the tower's shape, because it is the same kind of climb.** Left rail (460 px): the
  keep's name in gold, its story, the keeper under a *Keeper* label, the sets it holds as
  `SetChip`s, and the deepest rung at the foot. Right: the Normal/Hard tabs, the repeat selector, and the
  **ladder of twenty rungs**. It opens scrolled to the deepest rung the player may enter, so a keep
  twelve stages in does not start at stage 1.
- **A rung says the four things a run is decided on**, in four columns: its number and the level it
  fields, the **stars** it drops with the rarities under them, each named in its own rarity's
  colour, its **energy** with
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
  scene, each wearing its currency — the coin over *Gold Market*, the gem over *Gem Market* — on
  the market-street backdrop with the interior ambience. Under the tabs one line of blurb, and — on
  the gold tab only — **the turn of the hour as an instrument**: an hourglass, "New stock in
  40m 00s" and the hour draining away under it. The gem tab has no clock at all, which is exactly
  the point of it: a shelf that never changes should not be wearing a timer.
- **The stall is six wares on one screen**, three by two, each a card in the gear cards' frame in
  bronze: the ware on a lit stand at 116 px, its name, what it is for (the currency's own
  description) and *You hold N*; a slim stock bar with *N left* and the price of one; then a
  **quantity picker** — −, the number, +, *Max* for all the purse can reach — with the total it
  comes to, and **Buy**. A slot with one in stock has no picker. The three rows `MARKET.md` §1.1
  calls the "sometimes" are **rare finds** (`rareFind` on the pool row): a bold gold frame, a *Rare
  find* ribbon and a sheen passing over the card, so a player skimming the stall does not walk past
  the one thing worth running for. A sold-out slot keeps its place, greyed and stamped *Sold out*;
  one the purse cannot reach says *Not enough*, so a disabled button always says which reason it
  is. Until `0.9.6` the stall was six bare full-width rows with the price a screen's width from the
  name.
- **The shelf reads top to bottom, in two headed sections.** *Always on the shelf*: the nine singles
  in three columns, each framed and lit in its rarity — the item on its stand, its name in that
  colour over what kind of thing it is (*Boost · 24 h*, *Today's quests*, *One champion* …),
  exactly what using it does, *In your Bag ×N* once one is held, the gem price and **Buy**.
  *Bundles*, with a line counting how many are still on offer: the four bundles two by two in gold
  knotted frames, each with a legible *Once per chronicle* ribbon, what it is, everything it
  **holds as marked chips** (an item by its icon and count, a currency by its icon and amount) and
  — where every part is also sold singly — **what those parts would cost bought singly and what
  the bundle saves**, from the shelf's own prices. A bundle already taken keeps its place, quiet,
  with *Taken* stamped across it, and its button reads *Already taken*. The shelf fades out at an
  edge it runs on past rather than cutting a card in half.
- **A purchase never leaves the screen.** No confirmation dialog, no result panel: "+N" rises off
  the ware's stand, the held count and the stock move, the wallet in the header ticks down and the
  reward sound plays; a bundle is stamped as it is bought. Buying is the small action here; using
  is the large one, and that happens in the Bag.

### 5.26 The Bag and the champion picker (`docs/design/MARKET.md` §3, §5)
- **A bag, not a list.** What is held as slots in a grid of twelve — each item's art in a niche
  edged in its rarity, its count in the corner and its name under it, in shelf order so the Bag reads
  the way the Market does; the slots it does not fill are cut into the stone and wait. The chosen
  one (the first held, until another is pressed) stands in full beside the grid (`BagDetail`).
- **The panel says what using it would do, in full.** A consumable is bought once and used weeks
  later, so a name alone would make a player guess: its art large in its rarity's frame, *Rare · The
  Brewery* over its name, how many are held, its whole description — and how the thing it acts
  on stands **right now** (`itemStatus`): a boost already running and how long it has left, the
  day's Brewery runs, a board's points, the mission being walked. Then the one press. When the last
  of an item is used, the panel moves on to what is left.
- **An empty Bag says so, and says where to go**: *The Market and the Calendar both fill it*, with
  **Go to the Market** and **Go to Daily Rewards** under it.
- **The two that act on a champion say so and hand off.** Their button reads *Use on…* and opens the
  picker rather than acting on whoever is first.
- **The picker greys rather than hides.** The whole roster is drawn in a `VirtualGrid` of 96 px
  cards; champions the item would do nothing for — one already at their level cap for a Chicken, one
  already wearing every star for a Cheatmeal — are drawn **dimmed and dead to the touch**. Showing
  them is the point: a player looking for someone who is *not* on the list learns the rule from the
  list itself.
- **What happened is said, not announced.** After a use, one line under the grid: the item's name in
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
- **The day in question, large** (`LoginHero`, the left panel): *Today* and *Day 4* over its tier,
  what it pays as large `RewardSlots` with each named in words beneath, and the one press on the
  board — **Take it**. Once taken, a *Taken* seal stamps down in its place and tomorrow's day shows
  under it with the time until it opens; opened again later the same day, the panel is simply
  tomorrow's (*Tomorrow · Day 5 · Opens in 7h 58m*). The design's one sentence (below) sits at its
  foot.
- **A board, not a list.** The whole round of thirty on the right, six across and five down, with no
  scrolling (`LoginTile`). Each day is bevelled stone edged in its tier's colour — borrowed from
  gear's rarities, which a player already reads fluently — so the shuffle reads as a scatter: *Day N*
  and what it pays as `RewardSlots`, a Bag item drawn in its own art rather than named in words.
  Today's day is gold-edged, lit and flagged *Today* on a corner ribbon; the days behind step back
  and wear a seal (which lands with a stamp on the day just taken); once today's is in, tomorrow's is
  ringed; the three finale tiles carry a gold wash and a star, so the end of the board reads as the
  end of the board — every round, not only the first.
- **One line is the whole design in a sentence.** *A day is a day you came* — so missing one costs
  nothing. Saying it on the board matters: a player who has met a login calendar before will assume
  there is a streak to protect and will feel punished by a day they missed that in fact cost them
  nothing. Over the board, *Thirty days, in whatever order you come* and which round this is.
- **The foot says what is left**: the time until the next day once today's is taken, the finale's
  invitation while it is still there, and — right after a claim — which day was just taken.
- **It is reached, never pushed.** A *Rewards* plate at the far left of the hub's bottom bar wearing a notification
  dot the moment a day is owed. It does not open itself over the hub at launch: that would be the
  one dialog a player meets before they have decided to do anything, and with no streak to lose
  there is nothing urgent enough to justify taking the first press of the session.

### 5.28 The Wallet (`docs/design/ECONOMY.md` §2, §5)
- **Everything held, in view.** Every currency as a tile — its icon, its name, how much — grouped
  under *Essentials*, *Keys*, *Shards*, *Brews*, *Tomes* and *Materials*, five to a line, all
  twenty-five on the stage at once. A holding is what can be spent (`holdingOf`): energy and the
  Eternal Key are read from their regenerating pools and the boss keys as the period's allowance less
  what it has spent — out of their cap (*250 / 250*, *2 / 2*) — never from their wallet rows, which
  those pools leave at zero (and which the first Wallet showed as 0).
- **The chosen one in full** (`WalletDetail`, the right panel): its art in a gold-rimmed niche, its
  group, its name and its amount; its description; for a pool, how it stands against its refill —
  *The next one comes back in 42s*, *Full*, *All 2 come back in 7h 38m*. Then **Where it comes from**
  and **What it is for**: the places from the currency's own data (`content/currencies/flows.ts`),
  two to a line, each with its door's glyph. A place with a way in is itself the press — the whole
  row, with *Go ›* at its end — and it closes the Wallet on the way; a place not yet open says
  *Locked*; the clock, a level-up and the resets are only named.
- **The two refills live here** (ECONOMY.md §5, §5.2): energy's *50 [gems] › 100 [energy]* and,
  since `0.9.10` (`USER_QUESTIONS.md` Q49), the Eternal Key's *150 [gems] › 5 [keys]*, each with
  **Refill** — as often as the gems allow, past the cap if need be; without the gems the press is
  dead and says *Not enough gems*. A refill toasts what it added. The Tower's own **Buy keys**
  opens the Wallet on the Eternal Key, so the price is only ever stated in one place.
- **It opens where it was asked for.** The **+** on a purse in the top bar opens the Wallet on that
  currency; anything else opens it on Gold.

### 5.29 The Mine (`docs/design/MINE.md`)
- Opened from the fountain on the hub (§5.2). Its own code chunk (`React.lazy`): the initial route
  is held to §5.6's budget, and a dialog opened a few times a day can wait the moment it takes to
  arrive. Three columns, left to right: the store, the level below, the whole shaft.
- **The store** (`MineVault`): the painted geode seam round-cut into a vault, the store's fill drawn
  round it (`FillRing`, the crystal `--mine` while it digs, gold when full) and the whole gems it
  holds against its size on a plate (*12/17*). Full, the vault warms, cold rays turn behind the seam
  and glints catch on it; under it, *Store full — the crews have downed tools* or *Full in 3h 20m*,
  the gems held and *Next gem in 1h 04m* — the dialog reads the clock every second, so under an
  hour the wait counts down in seconds — and, from the fourth level, the Sigils dug so far to two
  decimals. Under that, an ink plate names the stratum being worked and what it digs: gems a day,
  what the store holds and how long it takes to fill, Sigils a day.
- **Collect** (the footer, *Nothing whole yet* while it would pay nothing): a pick strikes the seam
  (`mine.strike`), the crystal shatters (`fx.gamefx.ice_shatter`) and the haul rises out of the
  vault as chips — *+12 [gem]*, *+1 [sigil]* — holding for a beat before the vault shows the store
  again; the reward toast carries the same amounts. A haul taken from a full store adds a line that
  the crews stopped digging until the player came.
- **The level below** (`MineNext`): *Dig deeper*, the stratum's name and its level; what it adds in
  green (*+3 gems a day*, *+3 gems the store holds*, *+0.15 Glyph Sigils a day*, or *Starts bringing
  up Glyph Sigils* at the fourth); **The crews need** — each line of the price against the purse,
  the amount held beside it or, short, *Short of 1,200* in red with a red edge; then either the gate
  (*Opens at chronicle level 16*, with the shackle) or the note that digging down collects the store
  first at this level's rate. **Dig to level N** is dead while anything stands in the way. At the
  bottom of the shaft the card is the pick alone and *The Deepvein is dug to its heart*.
- **The crews' tally**, under the level below: the gems and the Glyph Sigils brought up and the
  hauls collected over the chronicle's life, read off the `mine.*` counters.
- **The shaft** (`MineStrata`): ten strata, the Shaft Head to the Heart of the Vein, each a band of
  rock that darkens with depth while its vein brightens, its gems a day on the right and its state
  on a line under its name — so a note never crowds a name out. Dug strata are lit and read *Dug*
  beside the pick; the one being worked has a gold edge, a lantern breathing in it and *The crews
  are here*; the next is outlined in the vein's light (dimmer while the chronicle cannot reach it)
  and reads *The next level down*; a stratum the chronicle is too young for is dark, its rate dimmed,
  and reads *Opens at chronicle level N* by the shackle. A level dug this sitting gives way in a
  flash of light.
- Sound: `mine.strike` + `reward.medium` on a collection, `mine.deepen` (a rock wall giving way) +
  `reward.large` on a level; the toast says the new rate, or the gems the settled store paid.

### 5.30 Instant clear (`docs/design/CAMPAIGN.md` §10)
- Opened by the battle setup's instant press, which has already cleared the runs: the page is what
  they wrote into the chronicle. Its own code chunk (`React.lazy`), like the Mine's — it carries the
  result screen's spoils panel with it. Two columns in 1,320 px: the page on the left, what it
  paid and who took it on the right.
- **The page** (`InstantLedger`), on vellum under a gold hairline and filling the left column:
  *Written into the chronicle*, the stand (*Stand 1-3 · Intro*) and its encounter's name, its three
  stars; the quill in a gold-edged diamond — the VS medal turned to the pen — rocking while it
  writes; *Cleared* and the runs counted up a page at a time (*×10*, about a second whatever the
  count, never faster than a page every 28 ms, a page turned — `instant.write` — at each), the
  diamond flaring (`fx.gamefx.light_cast`) on the last; then *40 ⚡ spent*, and when the energy
  covered fewer runs than were asked, how many of how many.
- **The spoils**: the result screen's own `SpoilsPanel` — the tiles landing one after another, the
  chronicle-level banner when one was crossed, the drops as paintings named in their rarity (a
  dozen, then a count) and the pieces the armoury had no room for.
- **The team** (`InstantTeam`) under the spoils, one tile per champion seated: the portrait framed
  in their rarity, the name, *Level 24* with a gold *Level up* (or *+3 levels*) stamp when the batch
  carried them past one, the bar towards the next level in the result screen's XP blue, and
  *+2,380 XP* — *Max level* in gold, on a gold bar, for a champion at their stars' cap.
- Footer: **Again ×10 · 40 ⚡** clears the stand once more with the same team and count, and the
  page counts again; when the energy no longer covers a run it is dead and says so. **Done** closes;
  a chronicle level the batch paid is celebrated then, never over the page.
