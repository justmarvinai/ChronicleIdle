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
| `GearCard` | `Frame` (rarity) + spell-icon art per set/slot + star row + `+N` badge + main stat | |
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
| `Dropdown`, `Toggle`, `Slider` | stone frames + ember indicators | settings, filters |
| `TopBar`, `BottomBar` | `dark-ember/bg-wide` strips with gold hairline | |

Every component has states: default, hover, active, disabled, focus-visible, and a `motion` prop
(`none` under reduced motion).

## 5. Screens

Format: **Reference** → **Layout** → **Elements** → **Interactions** → **Motion & sound**.

### 5.1 Title
- Reference: none (own). Backdrop `bg9` slow zoom + violet fog; logo (`chronicle_idle.svg`) with
  ember glint sweep; buttons: *Continue* (if save), *New Chronicle*, *Import Save*, *Settings*;
  version tag bottom-right. Music: hub track. Entering "New Chronicle" fades to the tutorial.

### 5.2 Hub — Emberhold
- Reference: `main_hub_screen.png` (structure), `main_hub_screen_alternative_2.png` (mood).
- The bosses are **not** on the hub: two cards floating over the artwork were web furniture pasted
  on a painting (§7.1 of `CLAUDE.md`), and everything they said lives on Game Modes. What the hub
  keeps is a counted dot on **Battle** when a boss chest is waiting.
- Layout: full-bleed `bg8` (night harbour town) with hotspots placed on real buildings; top bar
  (profile chip left: avatar `frame-round-sm`, name, level, XP bar and, under the bar, the
  **Account Power** row — every owned champion's power summed, gold numerals, ticking up when the
  roster gains a level, a rank or a piece of gear; currencies centre-right:
  Energy, Gold, Gems, +; the Idle Chest as a framed pill with its countdown, once it is unlocked;
  settings right); left edge: Idle Chest at the docks — the hourglass hotspot wearing a gold
  `FillRing` (an SVG arc, exact at any size) with its countdown under the banner and a dot once it
  is full; bottom bar: **Missions**, **Quests**, **Armoury**, **Index**, **Champions**,
  primary **BATTLE** (opens Game Modes, and wears the boss-chest dot). **Index** opens the
  Chronicle Index (§5.20).
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
  **Gear**: the power with everything worn, then a 3×2 slot grid (`Slot`) — each slot shows the
  piece's crest, its `+level` badge, its main stat and its stars, with *Take off* under it — then
  the set-bonus rows (a complete group shows how many copies it grants, an incomplete one how
  many pieces it still needs), then *Open the Armoury*. A slot opens the **gear picker**
  (`dialog-gear-picker`): the racks filtered to that slot on the left, and a compare panel on the
  right that answers before anything is spent — every stat before → after (coloured by the
  delta), the power either side, and the set groups the swap would make or break. A piece worn by
  another champion turns the button into *Take from <name>*, and the press asks once before it
  strips them.
  **Abilities**: A1–A4 rows (`AbilityIcon`, name, description with live numbers, cooldown,
  upgrade dots), passive, aura; *Upgrade* jumps to Tavern skills with this champion selected.

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
- *Info* opens the **battle log**: a 460 × 640 ember panel of numbered events, newest pinned to the
  bottom, capped at the last 120 lines, with the hotkey legend under it. The list scrolls inside
  the frame — the flex column belongs to the panel's *content box*, and the list needs
  `min-height: 0` to shrink below its content, or it grows as tall as the fight and spills off the
  screen. Markers sit in the list's own padding, wide enough for three digits.
- **The marked enemy** (`BATTLE.md` §7.1): an enemy plate takes the pointer at all times, not only
  while a turn is open, because marking one is something a player does between turns and in auto
  mode. The marked plate wears a gold frame and a ◆ beside its name; pressing it again lifts the
  mark. When a turn *is* open and the chosen ability can reach that enemy, the same press also
  spends the turn on it, which is what a press did before the mark existed.
- Ability icons: the round button clips nothing (the art clips itself), so the keyboard number and
  the passive tag sit whole on the rim wearing the same dark chip with a gold hairline. An ability
  on cooldown greys and darkens under the turns remaining, in gold.
- Motion: per `ARCHITECTURE.md` §3.4; ultimates cut-in; kill slow-mo; wave transition slide.

### 5.10 Battle result
- Victory: the stand's stars and a "New record" badge on the stats panel, stage name and
  settlement, turns and waves, the spoils list (gold, materials, shards, brews, gems, energy,
  champion and chronicle XP) with first-clear, star-chest, gear-drop and level-up lines, the
  per-champion report, and buttons *Emberhold*, *Campaign*, *Team*, *Replay*, **Next stand**.
  An auto-repeat batch shows the merged spoils and how the batch ended (done, stopped, defeated,
  out of energy). Defeat: red vignette, enemy HP left, tips, *Team*, *Emberhold* — and the energy
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
    whose rows are the tier's pool, with the Sigils held beside it. Right: the anvil — a stone
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
  filter bar (sort + direction, set and minimum-star dropdowns, one-tap chips for slot, rarity and
  locked, a clear link and a "shown of total" count) over a virtualised `GearCard` grid that on the
  default *Set* sort is cut into one run per set, each opening with a heading row — the set's
  crest, its name, `n-piece` and how many are on the racks — with the capacity band pinned to the
  bottom (`held / 400`, amber warning at
  90 %, a red band and the overflow note when it is full). Right: the bench — the piece's crest
  in a rarity-lit frame, its name, slot, rarity, `+level` and stars, its power, its main stat,
  its substats with the roll count behind each, its set and what the set gives, who wears it (a
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

### 5.13 Bosses — the boss gate
- Reference: `daily_weekly_boss_screen.png`. Backdrop: the boss's own (`bg3` for Gravemaw) with
  the interior ambient preset and two lantern glows on the gate.
- Layout per `docs/design/BOSSES.md` §4. Left rail (340 px): period tabs *Daily* / *Weekly* over
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
- Reference: `different_content_battles_screen.png`. Horizontal cards: Campaign (current stage),
  Daily Boss (keys, timer), Weekly Boss (keys, timer), **The Eternal Tower** (the climb and the
  keys held); cards for locked content show what opens them — a chronicle level for most, and
  *Clear the Intro campaign* for the tower, which is gated on progress rather than on a level
  (`ETERNAL_TOWER.md` §1). Backlog cards (Dungeons, Events) do not exist in EA-0.1.

### 5.20 The Chronicle Index

- Reached from the hub's bottom bar (**Index**), open from level 1 — it is a reference, not a
  reward. Backdrop `bg.bg5` with the interior ambience, like every other reading room.
- Four tabs across the head, a one-line blurb, and — on the champions tab only — the tally
  (`12 of 23 champions found`) in gold on the right.
- **Champions**: the whole roster of definitions, found or not, richest rarity first and
  alphabetical inside it. Six columns of `ChampionCard` in a `VirtualGrid`, compact (no level
  badge, no stars on the card), **dimmed when unfound**, wearing `×N` when the chronicle holds
  more than one. Rarity / element / role dropdowns and a *Found only* switch. The page beside it:
  portrait framed in the rarity's colour, base→max stars, rarity · element · role, whether it is
  in the chronicle, the authored stats (6★ level 60, before gear), every ability with its cooldown
  and live numbers, the passive, the aura, the lore and where it comes from.
- **Bestiary**: the twelve settlements as numbered tabs, each page its faction's six rank-and-file
  and the boss that holds the last stand (wearing a **BOSS** tag). Cards are the enemy's own sprite
  over its name; the page beside them prints archetype · element · role, the settlement-1 base
  stats the encounter scales, and the kit.
- **Gear Sets**: the fourteen crests, each with its piece count, what a complete group gives, and
  the settlements that favour it. The set's own description *is* its bonus text — printing the
  passives beside it said the same sentence twice.
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
Night`; Greyhaven Harbor → `Sea` / `Beach`; Barrowdeep, Daily Boss → `Cave` / `Dungeon ambience`;
Old Kingsroad → `River Loop` / `Waterfall Loop`; Ironcrag Citadel → `Torch Loop`; rain/storm
variants are used for Duskmere Marsh and Frostvein Pass.

## 8. Input & accessibility

- Mouse + keyboard; hotkeys listed in `docs/design/BATTLE.md` §8 and on the pause menu.
- Focus rings: gold hairline; tab order follows visual order; dialogs trap focus.
- `prefers-reduced-motion` or the setting: menu animations become fades; battle unchanged.
- Colour is never the only carrier: rarity also shown by star count and label; buff/debuff icons
  differ in shape and have a small +/− mark.
