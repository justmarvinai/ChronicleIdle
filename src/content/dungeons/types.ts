/**
 * The Dungeons' content types (docs/design/DUNGEONS.md).
 *
 * A dungeon is the gear sets it holds, the keeper that holds them and the warband the keeper
 * fields — never a stage list. Its forty stages come from `balance/dungeon.ts`: the bands decide
 * what a stage drops and costs, the scale curve decides how hard it is, so a dungeon is a dozen
 * lines of data and no authored encounters (`CONTENT_AUTHORING.md` §16).
 */
import type { BackdropKey, GlyphKey } from '@assets/manifest.generated';

/**
 * Why a dungeon's doors are shut. `accessories` is the Gilded Veil: it pays necklaces, rings and
 * trinkets, none of which the game has yet, and a keep whose whole reward does not exist is shown
 * as locked rather than shipped half-working (`CLAUDE.md` §2.1).
 */
export type DungeonLock = 'accessories';

export interface DungeonDef {
  /** `dungeon.<slug>`. */
  id: string;
  /** `<snake_case>`; the route, the testids and the save's keys all use it. */
  slug: string;
  /** i18n keys. */
  name: string;
  /** One line under the name on the overview card. */
  description: string;
  /** The keep's own story, on its screen. */
  lore: string;
  /** Reading order on the overview, easiest first. */
  order: number;
  /**
   * The gear sets this dungeon's stages drop. Every set in the game belongs to exactly one
   * dungeon (`validateDungeons`), which is what makes a dungeon worth choosing: the harder the
   * keep, the better the sets behind it.
   */
  sets: readonly string[];
  /** The named enemy fought on every stage, scaled by the stage's own multiplier. */
  keeperId: string;
  /** Whose rank and file stand with the keeper; a walking window over the faction's six. */
  factionId: string;
  backdrop: BackdropKey;
  glyph: GlyphKey;
  surface: 'dirt' | 'stone' | 'water' | 'wood';
  /** Absent on the four that are open. */
  lock?: DungeonLock;
  version: number;
}
