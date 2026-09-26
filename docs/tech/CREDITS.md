# Credits and Asset Provenance

Every asset shipped by ChronicleIdle is listed here with its origin and licence. Update this file
in the same commit that adds an asset (`AGENTS.md` §5, `docs/tech/ASSETS.md` §6).

| Asset group | Origin | Licence / rights | Added |
| --- | --- | --- | --- |
| Champion models, placeholder model, tutorial portrait, logo, wallpapers (`/game/assets/{champions,enemies,ui/misc_avatars,logos,wallpapers}`) | Provided by the project owner | Owner holds full commercial rights (confirmed in the brief) | Planning |
| UI kits `dark-ember`, `stone-vine`, pixel `deco-frames`, `line-glyphs`, `spell-icons` (`/game/assets/ui`) | Provided by the project owner | Owner holds full commercial rights | Planning |
| Background music (2 tracks, `/game/assets/music_and_sounds/background_music`) | Provided by the project owner | Owner holds full commercial rights | Planning |
| Ambience sets (7 × 3 WAV loops + 21 MP3 loops, `/game/assets/music_and_sounds/ambience_sounds`) | Provided by the project owner | Owner holds full commercial rights | Planning (update 1) |
| SFX packs (attacks, spells, chests/doors, torch, chopping/mining, footsteps, water; `/game/assets/music_and_sounds/sfx`) | Provided by the project owner | Owner holds full commercial rights | Planning (update 1) |
| "Free Pixel Effects Pack" (20 sheets, `/game/assets/music_and_sounds/vfx/Free Pixel Effects Pack`) | Davit Masia & CodeManu (Pixel FX Designer), supplied by the owner | Public domain per the pack's README ("use for personal and commercial purposes, no credit required") — credited anyway | Planning (update 1) |
| GameFX export (22 strips + GIFs, `/game/assets/music_and_sounds/vfx/GameFXExport`) | Provided by the project owner | Owner holds full commercial rights | Planning (update 1) |
| Alegreya Sans SC, Nunito Sans, Rajdhani (self-hosted via `@fontsource`) | Google Fonts authors | SIL Open Font License 1.1 | Phase 0 (planned) |

## Generated in-house

Sounds rendered by `tools/audio` and effects rendered by `tools/vfx` are original works of this
project (recipes in the repository). They are listed per key in the registries and need no
external credit. The same holds for the few line glyphs drawn in-house where the owner's set has no
mark for a building (`tools/assets/glyphs/`), each drawn to sit with the owner's forty.

## Additions

| Set | Origin | Licence | Added |
| --- | --- | --- | --- |
| Summon ritual sounds (`sfx.summon.charge`, `crack`, `reveal_common/rare/epic/legendary/mythic`) | Generated in-house by `tools/audio/summon-recipes.ts` | Original work of this project | Phase 8 (`0.0.8`); the charge re-cut in `0.9.8` |
| Summon ritual sounds, second set (`sfx.summon.tell`, `stall`, `windup`, `shatter`, `flip`, `star`, `stamp`) | Generated in-house by `tools/audio/summon-recipes.ts` | Original work of this project | `0.9.8` |
| The Mine's glyph (`glyph.pickaxe`: a miner's pick striking a cut gem, `tools/assets/glyphs/glyph-pickaxe.svg`) | Drawn in-house for the Mine's medallion and buttons | Original work of this project (CC0) | `0.10.0` |
| The Unwritten's glyphs (`glyph.quill`, `glyph.candle`, `glyph.coin_purse`, `glyph.chest`: a quill writing a line, a candle on its dish, a tied purse and a coin, a banded chest — `tools/assets/glyphs/`) | Drawn in-house for the mode's card, its mysteries, shrines, Peddler and reliquaries | Original work of this project (CC0) | `0.13.0` |
| The Unwritten's sounds (`sfx.unwritten.page`, `quill`, `illuminate`, `blot`) | Generated in-house by `tools/audio/unwritten-recipes.ts` | Original work of this project | `0.13.0` |
