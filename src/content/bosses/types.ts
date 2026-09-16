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

/**
 * The escort a phased boss fields (BOSSES.md §3). One definition per tier carries the numbers;
 * this is the part that is the same on every tier: how many stand with it, the share of a hit they
 * take while one lives, and how they come back.
 */
export interface BossAddsDef {
  /** i18n key for the add's name, for the mechanics sheet. */
  name: string;
  count: number;
  /** Percentage of a hit on the boss a living add takes instead (Ally Protection). */
  guardPercent: number;
  /** Own turns of the boss between revivals; they also return at every phase change. */
  reviveEvery: number;
  revivedHpPercent: number;
  art: { model: ModelKey; tint: string; scale: number; desaturate: boolean };
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
  /** The escort's definition at this tier's numbers, or `null` when the boss fights alone. */
  adds: EnemyDef | null;
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
  art: { model: ModelKey; tint: string; scale: number; desaturate: boolean };
  backdrop: BackdropKey;
  surface: 'dirt' | 'stone' | 'water' | 'wood';
  /** Statuses that never land on this boss, shown as "Unshakeable". */
  immunities: StatusId[];
  /** Own turns between the +10 % ATK enrage steps (BOSSES.md §1). */
  enrageEvery: number;
  /**
   * Descending HP fractions where the fight changes gear (BOSSES.md §3): `[0.7, 0.35]` is three
   * phases. Empty for a boss that fights the same way from start to finish.
   */
  phases: number[];
  /** The escort every tier fields, or `null` when the boss fights alone. */
  adds: BossAddsDef | null;
  tiers: BossTierDef[];
  version: number;
}
