/**
 * Boss content types (docs/design/BOSSES.md). A boss is a damage race: a colossal HP pool per
 * tier, a few keys per period, damage that accumulates across the period, and chests that unlock
 * at damage thresholds.
 *
 * A boss owns its numbers — the tier table is the boss's own content, not a shared curve — and the
 * kit is one set of abilities shared by every tier. Each tier becomes an enemy definition with the
 * stats printed for it (nothing scales them) and an encounter that fights it.
 */
import type { BackdropKey, ModelKey } from '@assets/manifest.generated';
import type { ChampionStats, Element, Rarity, Role, StatusId } from '@content/champions/types';
import type { CurrencyAmount } from '@content/currencies/types';
import type { EnemyDef } from '@content/enemies/types';

export const BOSS_PERIODS = ['daily', 'weekly'] as const;
export type BossPeriod = (typeof BOSS_PERIODS)[number];

/** One reward chest: everything at or above `pct` of the tier's HP pool has earned it. */
export interface BossChestDef {
  /** Threshold as a percentage of the tier's HP (5 / 15 / 30 / 60 / 100). */
  pct: number;
  currencies: CurrencyAmount[];
  /** A piece of gear, minted at claim time from the boss's own pool (BOSSES.md §2). */
  gear?: { rarity: Rarity; stars: number };
}

export interface BossTierDef {
  /** `easy` | `normal` | `hard` | `brutal` — the boss's own ladder. */
  id: string;
  /** i18n key. */
  name: string;
  /** Exactly what BOSSES.md prints: no difficulty multiplier and no stage curve. */
  stats: ChampionStats;
  /** All turns (allies and boss) before the fight is called; the damage still counts. */
  turnLimit: number;
  /** Boss ATK starts climbing after this many of its own turns. */
  enrageTurn: number;
  /** Level on the plate; it also sets the mitigation constant for the boss's own hits. */
  enemyLevel: number;
  /** Chronicle XP for spending a key on this tier. */
  playerXp: number;
  /** Ascending thresholds; the engine checks they climb and end at 100 %. */
  chests: BossChestDef[];
  /** The derived enemy this tier fields (built by `defineBoss`). */
  enemy: EnemyDef;
}

export interface BossDef {
  /** `boss.<snake_case>`. */
  id: string;
  /** i18n keys. */
  name: string;
  title: string;
  lore: string;
  period: BossPeriod;
  keysPerPeriod: number;
  unlockLevel: number;
  /** The feature flag that opens it (`@engine/progression/unlocks`). */
  feature: 'daily_boss' | 'weekly_boss';
  /** The key spent on a fight, for the UI's icon and count. */
  keyCurrency: 'key_daily' | 'key_weekly';
  element: Element;
  role: Role;
  art: { model: ModelKey; tint: string; scale: number };
  backdrop: BackdropKey;
  surface: 'dirt' | 'stone' | 'water' | 'wood';
  /** Statuses that never land on this boss, shown as "Unshakeable". */
  immunities: StatusId[];
  tiers: BossTierDef[];
  version: number;
}
