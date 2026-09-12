# Assets — Inventory, Usage Map and Pipeline

`/game` is the owner-provided source of truth (commercial rights confirmed by the owner). It is
never modified; `pnpm assets:build` derives everything the game loads into
`public/assets/generated/` (git-ignored) and a typed manifest.

## 1. Inventory (as of planning)

| Group | Path | Count | Format / size | Notes |
| --- | --- | --- | --- | --- |
| Champion models | `assets/champions/epic_{anuria,darius,khazgor,maruan,rattledagger,sethlurias,thordakk}/` | 7 | avatar 1254² PNG (1.3–2.3 MB); `still/` 64² PNG; `idle/` 9 × 88² PNG + GIF (200 ms/frame, loop) | all seven are Epic-rarity art |
| Enemy / placeholder model | `assets/enemies/teritorial_lizard/` | 1 | avatar 1254²; still 64²; idle 9 × 84² + GIF | placeholder for every model-less champion and all enemies |
| Tutorial NPC | `assets/ui/misc_avatars/tutorial_npc_avatar.jpg` | 1 | painted portrait (dwarven king) | Eldric the Chronicler |
| Logo | `assets/logos/chronicle_idle.{svg,png}` | 2 | white on transparent; PNG 6848×2975 | title, loading, about |
| Wallpapers | `assets/wallpapers/bg1–bg9` | 9 | JPG/PNG ~1672×941 – 1774×887 | see usage map |
| UI kit: dark-ember | `assets/ui/dark-ember/` | 42 | PNG 64²–1024×1536 | ember buttons, frames, banners, bars, ornate panels, 4 skill icons, 3 item icons, 2 silhouettes |
| UI kit: stone-vine | `assets/ui/stone-vine/` | 37 | PNG | stone panels/slots/buttons, icon buttons, health/mana/stamina bars, 10 item icons, vine divider, dark scene bg 1920×1047 |
| Pixel deco frames | `assets/ui/deco-frames/` | 140 | 32 frames × {solid, soft, scrim} 96² + 6 dividers + 6 fade dividers 192×20–44 | 9-slice with 32 px insets |
| Line glyphs | `assets/ui/line-glyphs/` | 40 | SVG, black | recolourable via CSS mask / Pixi tint |
| Spell icons | `assets/ui/spell-icons/` | 235 | WebP, painted | families: blood 25, crest 6, earth 40, fire 40, fx 12, hero 15, hunt 25, icon 4, orb 4, rune 19, skill 4, tech 25, weapon 16 |
| Music | `assets/music_and_sounds/background_music/` | 2 | MP3 (7–8 MB) | `background_music_outside_combat`, `combat_campaign_depths_arena` |
| Design references | `design_examples/` | 23 | PNG screenshots | layout references only, never shipped |

Every kit folder also contains a `thumb/` copy (ignored by the pipeline).

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
`deco.<nn>.<variant>`, `glyph.<name>`, `spell.<name>`, `music.<name>`, `sfx.<name>`.

## 5. Conventions for new owner assets

- Champion: `/game/assets/champions/<id>/` with `<id>_avatar.png`, `still/<id>_still.png`,
  `idle/frame_000…008.png`; optional `attack/`, `cast/`, `hit/`, `death/` folders (same frame
  scheme, any frame count; durations default 100 ms for actions).
- Enemy: `/game/assets/enemies/<id>/` same layout.
- Backdrops: `/game/assets/wallpapers/<slug>.png` ≥ 1920 wide, 16:9.
- SFX: `/game/assets/music_and_sounds/sfx/<key>.ogg` (or `.mp3`), keys from `UI_DESIGN.md` §7.
- Music: `/game/assets/music_and_sounds/background_music/<key>.mp3`.

## 6. Additional assets to source (CC0 / commercially safe only)

The brief allows sourcing more assets. Needed for EA-0.1, with provenance to be recorded in
`docs/tech/CREDITS.md` when added:

| Need | Plan |
| --- | --- |
| UI SFX set (hover, confirm, cancel, reward, chest) | Kenney "UI Audio" / "Interface Sounds" (CC0) |
| Battle SFX (hits, casts, heals, death) and stingers (victory/defeat/summon) | Kenney "Impact Sounds", "RPG Audio", "Music Jingles" (CC0); freesound CC0-filtered |
| Particle/VFX sprites (slash, spark, smoke, rune ring) | Kenney "Particle Pack" (CC0) + procedural Pixi shapes |
| Summon and title ambience | own synthesised loops or CC0 field recordings |
| Extra battle backdrops (frost, marsh) | colour-graded reuse first; CC0 art only if a settlement still reads wrong |
| Fonts | Alegreya Sans SC, Nunito Sans, Rajdhani — SIL Open Font License via `@fontsource` |

No asset with unclear licensing is ever added; if in doubt, the placeholder stays.
