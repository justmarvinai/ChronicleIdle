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

export interface EnemyBossConfig {
  /** Fixed ability order, repeated (BOSSES.md §2); abilities on cooldown are skipped to the next entry. */
  rotation: AbilitySlot[];
  /** Statuses that never land. */
  immunities: StatusId[];
  /** Boss ATK grows by BOSS_ENRAGE_STEP every BOSS_ENRAGE_EVERY own turns after this own turn. */
  enrageAfterTurn: number;
  /** Damage taken multiplier (bosses have large HP pools, not immunity). */
  damageTakenMult: number;
  /**
   * The daily and weekly bosses carry the stats their tier prints (BOSSES.md §2–§3): no
   * difficulty multiplier, no stage curve and no stage-boss promotion on top.
   */
  fixedStats?: boolean;
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
  art: { model: ModelKey; tint: string | null; facing: 'left' | 'right'; scale: number };
  abilities: AbilityDef[];
  passives: PassiveDef[];
  boss?: EnemyBossConfig;
  version: number;
}
