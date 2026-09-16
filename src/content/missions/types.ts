/**
 * The Chronicler's Path (docs/design/QUESTS_MISSIONS.md §4): ten chapters of twelve missions,
 * sequential within a chapter and sequential across them, so exactly one mission is ever open.
 *
 * A mission is a goal from the shared DSL (`@content/quests/types`) plus what it pays. The line's
 * shape — which one is open, what a chapter's chest is worth, what the last page grants — is data
 * here and arithmetic in `@engine/missions`.
 */
import type { GlyphKey } from '@assets/manifest.generated';
import type { ChampionId } from '@content/champions/types';
import type { CurrencyAmount } from '@content/currencies/types';
import type { Goal } from '@content/quests/types';

/** One mission: `mission.<chapter>.<n>`, two digits each. */
export interface MissionDef {
  id: string;
  /** 1-based, and equal to the chapter it sits in. */
  chapter: number;
  /** 1-based position within the chapter. */
  index: number;
  /** i18n key of the line the card shows. */
  name: string;
  icon: GlyphKey;
  goal: Goal;
  rewards: CurrencyAmount[];
  version: number;
}

/**
 * What finishing a chapter pays. The tenth chapter's chest is the Path's own reward: Eldric
 * himself, the gems, and a 6★ Legendary piece the player chooses.
 */
export interface ChapterChestDef {
  currencies: CurrencyAmount[];
  /** A champion the chest hands over — the Path's final reward, granted exactly once. */
  champion?: ChampionId;
  /** A 6★ Legendary piece the player names the slot and set of (`GEAR.md` §1). */
  gearChoice?: { rarity: 'legendary'; stars: 6 };
}

/** One chapter: its twelve missions, its chest and the line Eldric says while it is open. */
export interface MissionChapterDef {
  /** `chapter.<nn>`. */
  id: string;
  /** 1-based; chapters open in this order. */
  index: number;
  /** i18n keys: the chapter's name and Eldric's line for it. */
  name: string;
  eldric: string;
  missions: MissionDef[];
  chest: ChapterChestDef;
  version: number;
}
