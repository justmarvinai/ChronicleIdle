# Assets — Inventory, Usage Map and Pipeline

`/game` is the owner-provided source of truth (commercial rights confirmed by the owner). It is
never modified; `pnpm assets:build` derives everything the game loads into
`public/assets/generated/` (git-ignored) and a typed manifest. Provenance of every asset group is
recorded in `CREDITS.md`.

## 1. Inventory (planning, after the owner's second asset drop)

### Art and UI

| Group | Path | Count | Format / size | Notes |
| --- | --- | --- | --- | --- |
| Champion models | `assets/champions/epic_{anuria,darius,khazgor,maruan,rattledagger,sethlurias,thordakk}/` | 7 | avatar 1254² PNG (1.3–2.3 MB); `still/` 64² PNG; `idle/` 9 × 88² PNG + GIF (200 ms/frame, loop) | all seven are Epic-rarity art |
| Enemy / placeholder model | `assets/enemies/teritorial_lizard/` | 1 | avatar 1254²; still 64²; idle 9 × 84² + GIF | placeholder for every model-less champion and all enemies |
| Tutorial NPC | `assets/ui/misc_avatars/tutorial_npc_avatar.jpg` | 1 | painted portrait (dwarven king) | Eldric the Chronicler |
| Logo | `assets/logos/chronicle_idle.{svg,png}` | 2 | white on transparent; PNG 6848×2975 | title, loading, about, app icons |
| Wallpapers | `assets/wallpapers/bg1–bg9` | 9 | JPG/PNG ~1672×941 – 1774×887 | see usage map |
| UI kit: dark-ember | `assets/ui/dark-ember/` | 42 | PNG 64²–1024×1536 | ember buttons, frames, banners, bars, ornate panels, 4 skill icons, 3 item icons, 2 silhouettes |
| UI kit: stone-vine | `assets/ui/stone-vine/` | 37 | PNG | stone panels/slots/buttons, icon buttons, health/mana/stamina bars, 10 item icons, vine divider, dark scene bg 1920×1047 |
| Pixel deco frames | `assets/ui/deco-frames/` | 140 | 32 frames × {line, solid, soft, scrim} 96² + 6 dividers + 6 fade dividers | 9-slice with 32 px insets; `line` is the bare outline, `solid` adds an opaque inner band, `soft`/`scrim` are the 50 % alpha versions |
| Line glyphs | `assets/ui/line-glyphs/` | 40 | SVG, black | recolourable via CSS mask / Pixi tint |
| Spell icons | `assets/ui/spell-icons/` | 235 | WebP, painted | families: blood 25, crest 6, earth 40, fire 40, fx 12, hero 15, hunt 25, icon 4, orb 4, rune 19, skill 4, tech 25, weapon 16 |
| Design references | `design_examples/` | 23 | PNG screenshots | layout references only, never shipped |

Every kit folder also contains a `thumb/` copy (ignored by the pipeline).

### Audio (`assets/music_and_sounds/`)

| Group | Path | Count | Format | Notes |
| --- | --- | --- | --- | --- |
| Music | `background_music/` | 2 | MP3, 7–8 MB | `background_music_outside_combat`, `combat_campaign_depths_arena` |
| Ambience loops (WAV) | `ambience_sounds/{Beach,Cave,Forest Day,Forest Night,Interior Day,Interior Night,Sea}/` | 7 × 3 = 21 | WAV 44.1 kHz stereo 16-bit, exactly 60 s | each set: clear, `Rain`, `Storm` |
| Ambience loops (MP3) | `ambience_sounds/*.mp3` | 21 | MP3 ≈ 0.4 MB | Cave ×4, Dungeon ×4, Forest ×4, Night ×3, Town ×4, plus variants; file names contain mis-encoded dashes (`ÔÇô`) — the pipeline maps them to clean keys, files are never renamed |
| SFX: attacks | `sfx/Attacks/Sword Attacks Hits and Blocks/` (16), `…/Bow Attacks Hits and Blocks/` (10) | 26 | WAV 0.25–1.0 s | attack, blocked, impact hit, parry, sheath/unsheath; bow attack, blocked, impact, put away/take out |
| SFX: spells | `sfx/Spells/` | 28 | WAV 0.3–3.8 s | Fireball ×3, Firebuff ×2, Firespray ×2, Ice Barrage/Freeze/Throw/Wall ×2 each, Rock Meteor Swarm/Throw ×2, Rock Wall ×2, Spell Impact ×3, Waterspray ×2, Wave Attack ×2 |
| SFX: doors, gates, chests | `sfx/Doors Gates and Chests/` | 12 | WAV 1–12 s | Chest Open/Close ×2, Door Open/Close ×2, Gate Open/Close, Lock Unlock, Portcullis Gate |
| SFX: torch | `sfx/Torch/` | 9 | WAV 0.3–10 s | light torch, strike, impact, loop |
| SFX: chopping & mining | `sfx/Chopping and Mining/` | 9 | WAV 0.3–0.6 s | chop ×4, mine ×5 (forge hammer) |
| SFX: footsteps | `sfx/Footsteps/{Dirt,Stone,Water,Wood}/` | 4 × 24 = 96 | WAV ≈ 0.5 s | walk/run/jump/land variants per surface |
| SFX: water loops | `sfx/Waterfalls Rivers and Streams/` | 3 | WAV 60 s | River, River Stream, Waterfall |

### Visual effects (`assets/music_and_sounds/vfx/`)

| Group | Path | Count | Format | Notes |
| --- | --- | --- | --- | --- |
| Free Pixel Effects Pack | `vfx/Free Pixel Effects Pack/` | 20 sheets + README | PNG grids of 100 × 100 px frames (600²–1100²) | public domain (README); magicspell, magic8, bluefire, casting, magickahit, flamelash, firespin, protectioncircle, brightfire, weaponhit, fire, nebula, vortex, phantom, loading, sunburn, felspell, midnight, freezing, magicbubbles |
| GameFX export | `vfx/GameFXExport/SPRITESHEET_Files/` (+ `GIF_Files/` previews) | 22 strips + 22 GIFs | PNG horizontal strips, 64 / 96 / 133 px frames, 28–89 frames | Explosion ×3, FireBall ×3, FireBurst, FireCast, HolyExplosion, IceCast, IcePick, IceShatter ×2, LightCast, MagicBarrier, MediumStar, SmallStar, PoisonCast, PoisonClaw, Tornado ×3 |

## 2. Usage map

### Wallpapers
| File | Scene | Use |
| --- | --- | --- |
| bg1 | Drowned colosseum | Settlement 9 backdrop; Game Modes card art |
| bg2 | Valley road with castle & bridge | Settlement 5; Settlement 8 (cold grade); campaign map base |
| bg3 | Mossy dungeon gate | Settlement 6; Daily Boss arena; Settlement 10 (green grade) |
| bg4 | Desert bazaar | Settlement 4; (Market, backlog) |
| bg5 | Armory / tavern interior | Tavern; Forge; Settlement 11 interior stages (1–5) |
| bg6 | Burning battlefield | Settlement 7; Settlement 11 outer stages (6–10) |
| bg7 | Green plains with rider | Settlement 1; Settlement 2 (dusk grade) |
| bg8 | Night harbour town | **Hub (Emberhold)**; Settlement 3 |
| bg9 | Violet gate | Title; Summoning; Settlement 12; Weekly Boss arena |
| stone-vine/bg-scene-dark | Dark stone texture | dialog/backdrop fallback, loading |

### Ambience → screens
| Screen / place | Bed | Variant rules |
| --- | --- | --- |
| Hub (Emberhold) | `Town ambience` (MP3) + `Night ambience` (MP3) layered | none |
| Tavern, Forge, Profile | `Interior Night` (WAV) / `Interior Day` (day/night follows device clock) | rain when the hub is "raining" (weekly seeded weather, cosmetic) |
| Settlements 1, 2, 5, 7 | `Forest Day` / `Forest Night`, `Forest ambience` (MP3) | 2 and 7 use `Storm` |
| Settlement 3 (harbor) | `Sea` / `Beach` | `Rain` on stages 6–10 |
| Settlements 6, 10; Daily Boss | `Cave` / `Dungeon ambience` (MP3) | `Rain` for Duskmere Marsh |
| Settlement 5 (Kingsroad) | `River Loop`, `Waterfall Loop` under `Forest Day` | none |
| Settlement 8 (Frostvein) | `Forest Day Storm` low-passed | none |
| Settlement 11 (Citadel) | `Torch Loop` + `Interior Night` | none |
| Settlement 12; Weekly Boss; Summoning; Title | `Cave ambience` (MP3) pitched down + generated void drone | none |

### SFX → sound keys
See `UI_DESIGN.md` §7 for the full key table. Highlights: sword/bow packs drive melee/ranged
attacks and shields ("Blocked"); the spell pack drives element casts (fire → Valor, ice/water →
Faith), buffs (`Firebuff`), debuffs (`Ice Freeze`) and impacts; chests/gates drive rewards and
battle start; mining drives the Forge; footsteps drive lunges per settlement surface.

### VFX → effect keys
See `UI_DESIGN.md` §6.3. Highlights: `LightCast`/`HolyExplosion`/`sunburn` = Justice;
`FireCast`/`FireBall`/`fire`/`flamelash` = Valor; `IceCast`/`IceShatter`/`bluefire`/`freezing` =
Faith; `midnight`/`phantom`/`vortex`/`felspell` = Eclipse; `PoisonCast`/`PoisonClaw` = poison;
`weaponhit`/`magickahit` = physical hits; `protectioncircle`/`MagicBarrier` = buffs and shields;
`Explosion*` = ultimates and boss abilities; `Tornado*` = turn-meter effects; `loading` = spinner.

### Spell icons → abilities and items
- Champion abilities pick from thematically matching families (Anuria → `hunt-*`, Darius →
  `rune-*`/`orb-*`, Khazgor → `crest-*`/`blood-*`, Maruan → `orb-frostwind`/`rune-radiance`,
  Rattledagger → `hunt-venom-*`/`blood-*`, Sethlurias → `earth-*`, Thordakk → `weapon-*`/`skill-*`,
  Legendaries → `fire-*`/`fx-*`/`blood-*`, Varkos → `fire-void-flame`, `blood-void-lance`).
  The mapping is in each champion file; the validator ensures uniqueness per champion.
- Gear set icons: `crest-*` (defensive sets), `weapon-*` (offensive), `rune-*` (utility).
- Currency icons: see `docs/design/ECONOMY.md` §2. Boss portraits: `hero-demon-lord`
  (Gravemaw placeholder), `blood-witch` (Nyxara placeholder) until art exists.

### Line glyphs → UI icons
Status effects (`docs/design/BATTLE.md` §5), role icons (attack `glyph-crossed-swords`, defense
`glyph-shield-block`, health `glyph-health-potion`, support `glyph-holy-totem`), element sigils
(justice `glyph-holy-cross`, valor `glyph-flaming-skull`, faith `glyph-peace-dove`, eclipse
`glyph-celestial-body`), nav (`glyph-spell-book` missions, `glyph-burning-scroll` quests,
`glyph-trophy-cup` records, `glyph-hourglass` timers, `glyph-arcane-symbol` portal).

### Kits → components
See `UI_DESIGN.md` §4.

### Models
| Model | Facing (verify in Phase 1) | Users |
| --- | --- | --- |
| anuria | left | Anuria |
| darius | left | Darius |
| khazgor | right | Khazgor |
| maruan | left | Maruan |
| rattledagger | left | Rattledagger |
| sethlurias | right | Sethlurias |
| thordakk | left | Thordakk |
| teritorial_lizard | left | every other champion (tinted), every enemy (faction tint, boss scale), boss placeholders |

The presenter flips sprites so allies face right and enemies face left.

## 3. Placeholder tinting

Placeholder champions/enemies are the lizard model with a per-definition tint (multiply colour)
and, for bosses, a scale (1.35 stage boss, 2.0 daily boss, 2.4 weekly boss) plus a rarity-coloured
ground ring so units are distinguishable. Names and element sigils do the rest.

## 4. Pipeline outputs

See `ARCHITECTURE.md` §8. Manifest keys: `model.<id>`, `avatar.<id>`, `bg.<id>`, `ui.<kit>.<name>`,
`deco.<nn>.<variant>`, `glyph.<name>`, `spell.<name>`, `music.<name>`, `ambience.<set>.<variant>`,
`sfx.<category>.<name>`, `fx.<pack>.<name>`. Audio is transcoded to OGG with MP3 fallback and
loudness-normalised; VFX grids/strips become frame atlases with JSON frame data; generated assets
from `tools/audio` and `tools/vfx` land in the same groups.

## 5. Conventions for new owner assets

- Champion: `/game/assets/champions/<id>/` with `<id>_avatar.png`, `still/<id>_still.png`,
  `idle/frame_000…008.png`; optional `attack/`, `cast/`, `hit/`, `death/` folders (same frame
  scheme, any frame count; durations default 100 ms for actions).
- Enemy: `/game/assets/enemies/<id>/` same layout.
- Backdrops: `/game/assets/wallpapers/<slug>.png` ≥ 1920 wide, 16:9.
- SFX: `/game/assets/music_and_sounds/sfx/<Category>/<Name N>.wav` (current convention) or
  `.ogg`; ambience: `/game/assets/music_and_sounds/ambience_sounds/<Set>/<Set Variant>.wav`.
- Music: `/game/assets/music_and_sounds/background_music/<key>.mp3`.
- VFX: grids of square frames (`<name>_spritesheet.png`, frame size in a sibling README or
  detected) or horizontal strips named `<Name>_<frame>x<frame>.png`.

## 6. Sourcing and generating additional assets (owner's answer, Q24)

The owner allows (a) sourcing from reputable CC0 / commercially-safe sources and (b) generating
high-quality sounds and VFX in-house. Rules:

1. Prefer owner assets in `/game`; then in-house generation (fully controlled, reproducible);
   then CC0 sources (Kenney, OpenGameArt CC0 filter, freesound CC0) — never an asset with unclear
   licensing.
2. Everything gets a row in `CREDITS.md` in the same commit.
3. Generated assets are recipes in `tools/audio` / `tools/vfx`; outputs are build artifacts.

Still needed for EA-0.1 and how they are covered:

| Need | Plan |
| --- | --- |
| UI ticks, confirms, cancels, tabs, errors | generated (`tools/audio`) |
| Reward, level-up, rank-up, victory/defeat, summon-tier stingers | generated, layered with the owner's `Spells` pack |
| Void/Eclipse and holy/Justice cast layers | generated drones/chimes layered on owner sounds |
| Summon and title ambience | generated void drone + owner `Cave ambience` |
| Slash arcs, impact sparks, rune rings, smoke, speed lines, ash dissolve, rarity bursts | generated (`tools/vfx`) |
| Custom cursor set | in-house SVG in the kit style |
| Extra battle backdrops (frost, marsh) | colour-graded reuse of bg2/bg3; CC0 art only if a settlement still reads wrong |
| Fonts | Alegreya Sans SC, Nunito Sans, Rajdhani — SIL Open Font License via `@fontsource` |
