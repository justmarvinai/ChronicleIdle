/**
 * The Hall of Deeds (docs/design/ACHIEVEMENTS.md): the achievements, the challenges, the ranks
 * renown climbs and the portrait frames some of them hang up.
 *
 * Both ledgers are goals from the shared DSL (`@content/quests/types`) read against the whole
 * chronicle — a baseline of zero — so a deed is a content change: a goal, what it pays and the
 * renown it is worth. What is claimable, what the renown adds up to and which rank stands on it
 * is arithmetic in `@engine/deeds`.
 */
import type { GlyphKey } from '@assets/manifest.generated';
import type { CurrencyAmount } from '@content/currencies/types';
import type { PlaceId } from '@content/places/types';
import type { Goal } from '@content/quests/types';

/** The parts of the game an achievement belongs to, in the order the Hall lists them. */
export const DEED_LEDGERS = [
  'campaign',
  'champions',
  'gear',
  'portal',
  'trials',
  'halls',
  'emberhold',
  'ledgers',
] as const;
export type DeedLedger = (typeof DEED_LEDGERS)[number];

/** One tier of an achievement: the goal it asks, what claiming it pays and the renown it adds. */
export interface AchievementTierDef {
  /** 1–5, written I–V. */
  tier: number;
  goal: Goal;
  rewards: CurrencyAmount[];
  renown: number;
}

/** A lifetime milestone in five tiers, claimed one at a time (ACHIEVEMENTS.md §1). */
export interface AchievementDef {
  /** `achievement.<snake_case>`. */
  id: string;
  ledger: DeedLedger;
  /** i18n keys: the achievement's name, and the line a tier reads with its numbers filled in. */
  name: string;
  line: string;
  icon: GlyphKey;
  /**
   * Where "Go" sends a chronicle whose goal names no place of its own — a counter has no
   * settlement or Tavern tab to point at, so the achievement says where it is played.
   */
  place: PlaceId | null;
  tiers: AchievementTierDef[];
  version: number;
}

/** A one-off feat, claimed once (ACHIEVEMENTS.md §6). */
export interface ChallengeDef {
  /** `challenge.<snake_case>`. */
  id: string;
  /** i18n keys: the name, and the line saying what it asks. */
  name: string;
  line: string;
  icon: GlyphKey;
  place: PlaceId | null;
  goal: Goal;
  rewards: CurrencyAmount[];
  renown: number;
  version: number;
}

/** A rank of the Hall: the renown it stands on and what claiming it pays (ACHIEVEMENTS.md §2). */
export interface HallRankDef {
  /** `hall_rank.<nn>`. */
  id: string;
  /** 1-based; ranks are claimed in order. */
  rank: number;
  /** i18n key. */
  name: string;
  renown: number;
  rewards: CurrencyAmount[];
  version: number;
}

/** What hangs a portrait frame up: a rank claimed, or a challenge claimed. */
export type FrameSource = { kind: 'rank'; rank: number } | { kind: 'challenge'; id: string };

/**
 * A frame for the chronicler's portrait (ACHIEVEMENTS.md §3): one of the pixel deco set's
 * frames, tinted, with the light it throws. Earned frames are derived from `source`, never stored;
 * the save keeps only which one is worn.
 */
export interface PortraitFrameDef {
  /** `frame.<snake_case>`. */
  id: string;
  /** i18n key. */
  name: string;
  /** Frame number 1–32 of the pixel deco set. */
  deco: number;
  /** The frame's colour, and the round avatar ring's. */
  tint: string;
  /** The glow round the portrait, or null for none. */
  glow: string | null;
  /** A slow light that runs round the frame — kept for the frames that are hardest to earn. */
  shimmer: boolean;
  source: FrameSource;
  version: number;
}
