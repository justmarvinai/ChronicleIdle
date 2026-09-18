/**
 * Encounter content types: what a battle is fought against (waves of enemies, scaling, limits)
 * and how it presents (backdrop, music). Campaign stages (Phase 3) and bosses (Phases 10–11)
 * produce encounters from their own definitions; the Training Grounds author them directly.
 */
import type { BackdropKey } from '@assets/manifest.generated';
import type { Difficulty } from '@content/balance/battle';

/** `bench` encounters exist only for the perf bench (`?screen=perf`) and never list in-game. */
export const ENCOUNTER_KINDS = ['training', 'campaign', 'boss', 'tower', 'bench'] as const;
export type EncounterKind = (typeof ENCOUNTER_KINDS)[number];

export interface EncounterEnemy {
  enemyId: string;
  /** Extra multiplier on top of the encounter scaling (bosses: 1; elite adds: 1.2). */
  statMult?: number;
}

export interface EncounterWave {
  enemies: EncounterEnemy[];
}

export interface EncounterDef {
  /** `encounter.<snake_case>`; campaign stages derive `encounter.stage.<nn>.<nn>.<difficulty>`. */
  id: string;
  /** Campaign encounters only: the stage they were derived from (`@engine/campaign/encounter`). */
  stageId?: string;
  /** i18n keys. */
  name: string;
  description: string;
  kind: EncounterKind;
  /** 3 for campaign-type encounters, 4 for boss-type (BATTLE.md §1). */
  partySize: number;
  difficulty: Difficulty;
  /** Global stage index 0..119; drives `stageScale` (BATTLE.md §4.5). */
  stageIndex: number;
  /** Enemy level shown on plates and used by the mitigation constant. */
  enemyLevel: number;
  waves: EncounterWave[];
  /** Ally turns (or all turns with `turnLimitMode: 'all'`) before the battle is lost / time is up. */
  turnLimit: number;
  turnLimitMode: 'ally' | 'all';
  /** Boss-type fights end with "time's up" instead of defeat when the limit is reached. */
  timeUpIsDefeat: boolean;
  backdrop: BackdropKey;
  music: 'battle' | 'boss';
  /** Footstep surface for lunges (docs/tech/UI_DESIGN.md §7). */
  surface: 'dirt' | 'stone' | 'water' | 'wood';
  version: number;
}
