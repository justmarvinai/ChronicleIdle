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
| `Bar` | `stone-vine/bar-track-stone-*` + `bar-fill-health` / `bar-fill-mana` / `bar-fill-stamina`; `dark-ember/bar-track-ember` + `bar-fill-ember` for boss HP | fills are masked and animated |
| `Slot` | `stone-vine/slot-stone-sm/md/lg/long` (+ `-fill`) | team slots, gear slots, brew slots |
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
| `Scrollbar` | custom thin stone track + ember thumb | never native |
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
- Layout: full-bleed `bg8` (night harbour town) with hotspots placed on real buildings; top bar
  (profile chip left: avatar `frame-round-sm`, name, level, XP bar, power; currencies centre-right:
  Energy, Gold, Gems, +; settings right); left edge: Idle Chest at the docks (chest icon with fill
  ring and timer); bottom bar: **Missions**, **Quests**, **Index**, **Champions**, primary
  **BATTLE** (opens Game Modes). Right column: Daily Boss / Weekly Boss gate cards with timers.
- Hotspots (label banner `banner-plain` + glow ring + dot): Tavern, Forge, Portal (statue replaced
  with a violet gate overlay), Chronicler's Hall (missions), Campaign gate (world map), Champions
  barracks, Boss gate.
- Motion: lantern flicker sprites, fog drift, fireflies, water shimmer, hotspot bob on hover,
  camera parallax on mouse (±12 px), notification dots pulse; ambient hub SFX loop + music.

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
- **Info**: as 5.3. **Gear**: 2×3 slot grid (`Slot`) to the right of the portrait; click → gear
  list filtered to slot with compare panel; set bonus summary with active/inactive rows.
  **Abilities**: A1–A4 rows (`AbilityIcon`, name, description with live numbers, cooldown,
  upgrade dots), passive, aura; *Upgrade* jumps to Tavern skills with this champion selected.

### 5.5 Tavern
- Reference: `tavern_champion_upgrade_screen.png`.
- Layout: left rail roster; centre: `bg5` interior with the selected champion's large portrait
  and six offering slots around it (brews / food); right column tabs: *Upgrade Level*, *Upgrade
  Rank*, *Upgrade Skills*; bottom-right: cost pill + **Upgrade** primary; "Auto-fill" picks the
  cheapest food (never locked/favourite; confirms if a Rare+ would be consumed).
- Motion: brews pour into a mug meter, XP bar fills with tick-up, level-up flash + stinger;
  rank-up: stars ignite one by one, sprite gets a gold burst.

### 5.6 Campaign map
- Reference: `campaign_settlement_screen.png` (RSL map), `_alternative_2.png` (banners).
- Layout: painted parchment map (`bg2`/`bg7` composite with map overlay) with 12 settlement
  banners (`Frame` with the boss portrait, stars ×30, name, lock); difficulty dropdown bottom-left;
  star-chest track bottom-centre (10/20/30 chests); *Emberhold* button bottom-right.
- Motion: banners sway, cleared settlements glow gold, locked ones are chained; camera pans to the
  furthest unlocked settlement on open.

### 5.7 Settlement stages
- Reference: `campaign_stages_screen.png`.
- Layout: left panel: settlement name, drop preview (set icons, materials, rarity ranges),
  difficulty dropdown; content: 10 stage rows — stage number, stars, best turns, enemy preview
  (4–5 `ChampionCard`-style enemy chips with level), **Battle ⚡cost** button; boss row uses the
  boss portrait.
- Auto-repeat control lives on the Battle setup screen.

### 5.8 Battle setup
- Reference: `battle_setup_screen.png`, `_alternative_2.png`.
- Layout: title "Stage 3-7 · Normal"; left half: team slots — 3 in campaign, 4 in boss fights — (leader slot marked, aura text),
  team power; centre "VS" with element wheel and 3-star conditions; right half: enemy waves
  preview (tabs Wave 1/2/3) with element sigils and levels; bottom: roster strip (virtualised,
  filter/sort), presets (3 per mode: campaign / boss), *Auto-repeat ×N* selector, **Start ⚡cost**.
- Drag-and-drop or click-to-place; slot swap animation; energy insufficient → refill dialog.

### 5.9 Battle
- Reference: `in_battle_non_boss_screen*.png`, `in_battle_boss_screen*.png`.
- Layout: Pixi stage full-bleed (allies left, enemies right, ¾ perspective floor plane); above
  each unit: level badge, HP bar, TM bar, status row (up to 10 icons); top-left: pause, wave
  "2/3", turn counter, timer; top-centre (boss): boss HP bar with phase pips and boss status row;
  bottom-left: *Info*, *Auto*, *×N speed*; bottom-right: ability bar (A1–A4 `AbilityIcon`,
  passive tag), current champion mini-portrait; target reticle on hover.
- Motion: per `ARCHITECTURE.md` §3.4; ultimates cut-in; kill slow-mo; wave transition slide.

### 5.10 Battle result
- Victory: stars ignite, stage name, turns, "New record", reward cards fly to wallet, champion
  XP bars fill with level-up pops, buttons *Replay*, *Next stage*, *Emberhold*. Auto-repeat
  shows a compact ticker instead and the full summary at the end. Defeat: red vignette, enemy
  HP left, tips, *Retry*, *Team*, *Emberhold*.

### 5.11 Forge & Inventory
- Reference: `tavern` layout language + right column pattern.
- Tabs: *Craft* (slot picker, tier cards with material costs, set chooser using Glyph Sigil,
  anvil scene with hammer animation and reveal), *Inventory* (grid of `GearCard`, filters, sort,
  multi-select, *Dismantle*, *Lock*), *Refine* (piece picker, sacrifice picker, cores, result
  preview).

### 5.12 Summoning Portal
- Reference: `summoning_screen.png` (rail of shards + centre ritual + right tabs),
  `summoning_screen_alternative_2.png` (chances panel).
- Layout: left rail: four shard cards with counts and rarity legend; centre: Pixi ritual on `bg9`;
  right column: *Standard*, *Featured* tabs; featured card with rotation timer and featured
  champions (idle sprites); pity counters; *Rates* info; bottom: **Summon ×1** / **Summon ×10**
  with cost. Exchange sub-panel (Gold→Faded, Gems→Ancient/Sacred).

### 5.13 Bosses
- Reference: `daily_weekly_boss_screen.png`.
- Layout per `docs/design/BOSSES.md` §4; tabs *Daily* / *Weekly*; key count in the top bar.

### 5.14 Quests
- Tabs Daily / Weekly; points track with five chest nodes; quest rows with progress and *Claim*;
  reset timer; "Claim all".

### 5.15 The Chronicler's Path
- Reference: `progress_missions_screen.png`. Chapter tabs; mission card carousel with arrows;
  chapter track with chest nodes; Eldric portrait + line.

### 5.16 Idle chest
- Dialog: chest art (`stone-vine/icon-chest` large) with fill ring, timer, capacity band note
  ("Fills in 6 h at level 10–19"), guaranteed contents preview, **Open**; reward burst.

### 5.17 Profile & Settings
- Reference: `player_profile.png` (chip). Profile dialog: avatar picker (owned champions), name
  edit, level/XP, stats grid, titles. Settings: music/sfx sliders, default speed, auto, reduced
  motion, fullscreen, language (en), *Export save*, *Import save*, *Reset chronicle* (typed
  confirmation), credits.

### 5.18 Tutorial overlay
- Dim layer with spotlight cut-out (mask), Eldric panel bottom-left (portrait in `panel-arch`,
  name banner, text with typewriter effect, *Continue*), pointer hand sprite, input blocked
  outside `allow`.

### 5.19 Game Modes
- Reference: `different_content_battles_screen.png`. Horizontal cards: Campaign (current stage),
  Daily Boss (keys, timer), Weekly Boss (keys, timer); cards for locked content show the unlock
  level. Backlog cards (Dungeons, Events) do not exist in EA-0.1.

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
the same atlas format. All keys live in `src/render/fx/registry.ts`.

| Use | Sheets (Free Pixel Effects Pack = FPEP, 100 px grids; GameFX = 64/96/133 px strips) |
| --- | --- |
| Justice (gold / holy) casts and hits | GameFX `LightCast_96`, `HolyExplosion_96x96`, FPEP `16_sunburn`, `9_brightfire` |
| Valor (crimson / fire) casts, projectiles, hits | GameFX `FireCast_96x96`, `FireBall_64x64`, `FireBall_2_64x64`, `FireBall_3_64x64`, `FireBurst_64x64`, FPEP `11_fire`, `6_flamelash`, `7_firespin` |
| Faith (azure / frost) casts, projectiles, hits | GameFX `IceCast_96x96`, `IcePick_64x64`, `IceShatter_96x96`, `IceShatter_2_96x96`, FPEP `3_bluefire`, `19_freezing` |
| Eclipse (violet / void) casts and hits | FPEP `18_midnight`, `14_phantom`, `13_vortex`, `17_felspell`, `2_magic8`, `12_nebula` |
| Poison / DoT ticks | GameFX `PoisonCast_96x96`, `PoisonClaw_96x96`; Burn uses `11_fire` small; Bleed uses generated droplets |
| Physical hits (A1s, counters) | FPEP `10_weaponhit`, `5_magickahit` + generated slash arcs |
| Buffs / shields / block | FPEP `8_protectioncircle`, GameFX `MagicBarrier_64x64`; ATK/DEF/SPD Up use tinted `4_casting` |
| Heal / revive | FPEP `20_magicbubbles`, `1_magicspell` (green), GameFX `SmallStar_64x64`, `MediumStar_64x64` |
| Explosions (ultimates, boss abilities) | GameFX `Explosion_96x96`, `Explosion_2_64x64`, `Explosion_3_133x133` |
| Wind / TM effects | GameFX `TornadoLoop_96x96`, `TornadoMoving_96x96`, `TornadoStatic_96x96` |
| Loading / portal ambience | FPEP `15_loading` (ring), `13_vortex` (summon ring), Pixi particle embers |
| Generated (`tools/vfx`) | slash arcs, impact sparks, rune rings, smoke puffs, speed lines, ash dissolve, gold pillar, rarity bursts |

## 7. Sound map (keys)

`ui.hover`, `ui.confirm`, `ui.cancel`, `ui.tab`, `ui.error`, `reward.small/medium/large`,
`levelup.champion`, `levelup.player`, `rankup`, `gear.equip`, `gear.upgrade`, `forge.hammer`,
`forge.reveal`, `summon.place`, `summon.crack`, `summon.burst.{rarity}`, `battle.start`,
`battle.hit.{light,heavy,crit}`, `battle.cast.{element}`, `battle.heal`, `battle.buff`,
`battle.debuff`, `battle.death`, `battle.victory`, `battle.defeat`, `chest.open`, `quest.claim`.
Sources: the owner's SFX packs under `/game/assets/music_and_sounds/sfx` (44.1 kHz stereo WAV,
transcoded by the pipeline) and in-house generated sounds (`tools/audio`, deterministic synth
recipes). Variants are chosen round-robin with slight pitch jitter.

| Key group | Source |
| --- | --- |
| `ui.*` | generated (short synthesised ticks/clicks in the ember palette) |
| `reward.*`, `levelup.*`, `rankup`, `battle.victory/defeat`, `summon.burst.*` | generated stingers, layered with `Spells/Firebuff 1–2`, `Spells/Spell Impact 1–3`, `Spells/Wave Attack 1–2` (mythic) |
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
| `summon.place` / `summon.crack` | `Spells/Rock Wall 1–2` / `Spells/Ice Freeze 1–2` |
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
