/**
 * Banners (docs/design/SUMMONING.md §3, §6). Two kinds ship in EA-0.1: the standard portal, whose
 * four shards are always available, and the featured banner, whose rotation is computed from a
 * fixed epoch so the game needs no server to agree with itself.
 */
import type { ChampionId } from '@content/champions/types';
import type { ShardId } from '@content/balance/summon';

export const BANNER_KINDS = ['standard', 'featured'] as const;
export type BannerKind = (typeof BANNER_KINDS)[number];

/** One turn of the wheel: a Legendary and two Epics get the featured weight. */
export interface RotationDef {
  legendary: ChampionId;
  epics: readonly ChampionId[];
  /** A Primordial Rotation also features the Mythic and accelerates its pity. */
  mythic?: ChampionId;
}

export interface BannerDef {
  /** `banner.<slug>`. */
  id: string;
  kind: BannerKind;
  /** i18n keys. */
  name: string;
  description: string;
  /** Which shards this banner accepts, in rail order. */
  shards: readonly ShardId[];
  /** Featured banners only: the cycle, walked by rotation index. */
  rotations?: readonly RotationDef[];
  version: number;
}
