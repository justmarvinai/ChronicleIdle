/**
 * Enemy content types (docs/design/CAMPAIGN.md §5, BOSSES.md §5). Enemies share the champion
 * ability and passive shapes; their stats are archetype bases at Intro difficulty, index 0, and
 * the encounter scales them (BATTLE.md §4.5).
 */
import type { ModelKey } from '@assets/manifest.generated';
import type {
  AbilityDef,
  AbilitySlot,
  ChampionStats,
  Element,
  PassiveDef,
  Role,
  StatusId,
} from '@content/champions/types';

/** Archetypes a faction fields as rank and file; `boss` enemies are authored one by one. */
export const FACTION_ARCHETYPES = ['raider', 'marksman', 'brute', 'warden', 'hexer', 'mender'] as const;
export type FactionArchetype = (typeof FACTION_ARCHETYPES)[number];

export const ENEMY_ARCHETYPES = [...FACTION_ARCHETYPES, 'boss'] as const;
export type EnemyArchetype = (typeof ENEMY_ARCHETYPES)[number];

/**
 * The adds a boss fields (docs/design/BOSSES.md §3). They stand in the same wave as their master,
 * a share of what the master is dealt lands on whichever of them still lives, and they come back
 * at every phase change and on their own turn schedule.
 */
export interface EnemyAddsConfig {
  /** The add's own enemy definition; `count` copies stand with the boss. */
  enemyId: string;
  count: number;
  /** Percentage of a hit on the master that a living add takes instead (Ally Protection). */
  guardPercent: number;
  /** Own turns of the boss between revivals. */
  reviveEvery: number;
  /** Percentage of max HP an add returns with. */
  revivedHpPercent: number;
}

export interface EnemyBossConfig {
  /** Fixed ability order, repeated (BOSSES.md §2); abilities on cooldown are skipped to the next entry. */
  rotation: AbilitySlot[];
  /** Statuses that never land. */
  immunities: StatusId[];
  /** Boss ATK grows by BOSS_ENRAGE_STEP every `enrageEvery` own turns after this own turn. */
  enrageAfterTurn: number;
  /** Own turns between enrage steps; defaults to BOSS_ENRAGE_EVERY (the campaign's cadence). */
  enrageEvery?: number;
  /** Damage taken multiplier (bosses have large HP pools, not immunity). */
  damageTakenMult: number;
  /**
   * The daily and weekly bosses carry the stats their tier prints (BOSSES.md §2–§3): no
   * difficulty multiplier, no stage curve and no stage-boss promotion on top.
   */
  fixedStats?: boolean;
  /**
   * HP fractions, descending, at which the fight changes gear: `[0.7, 0.35]` is three phases.
   * The phase is read at the boss's own turn, so a threshold crossed by a hit lands on its next
   * turn — abilities gated by `minPhase` open, and the adds come back with it.
   */
  phases?: number[];
  adds?: EnemyAddsConfig;
}

export interface EnemyDef {
  /** `enemy.<snake_case>`. */
  id: string;
  /** i18n key. */
  name: string;
  archetype: EnemyArchetype;
  element: Element;
  role: Role;
  /** Intro, index-0 base stats; the encounter scales them. */
  stats: ChampionStats;
  art: {
    model: ModelKey;
    tint: string | null;
    facing: 'left' | 'right';
    scale: number;
    /**
     * Wash the model's own colours out before the tint (docs/tech/ASSETS.md §3). A multiply tint
     * alone cannot lighten a sprite, so a placeholder standing in for something pale — Gravemaw's
     * bone — needs the luminance first.
     */
    desaturate?: boolean;
  };
  abilities: AbilityDef[];
  passives: PassiveDef[];
  boss?: EnemyBossConfig;
  version: number;
}
