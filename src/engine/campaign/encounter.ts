/**
 * Campaign stage → encounter (docs/design/CAMPAIGN.md §1, §2, §8).
 *
 * A stage is authored once and fought on three difficulties, so the encounter is derived rather
 * than stored: `stageEncounter` is a pure function of the settlement, the stage and the
 * difficulty, and its id round-trips through `parseStageEncounterId` so a save only ever needs to
 * remember the stage and the difficulty.
 */
import { PARTY_SIZE_CAMPAIGN, type Difficulty } from '@content/balance/battle';
import {
  BOSS_ENERGY_EXTRA,
  ENEMY_LEVEL_DIFFICULTY_ADD,
  ENEMY_LEVEL_PER_STAGE,
  ENERGY_COST,
  SETTLEMENT_COUNT,
  globalStageIndex,
} from '@content/balance/campaign';
import type { EncounterDef } from '@content/encounters/types';
import type { SettlementDef, StageDef } from '@content/stages/types';

/** `encounter.stage.<settlement:02>.<stage:02>.<difficulty>`. */
const STAGE_ENCOUNTER = /^encounter\.(stage\.\d{2}\.\d{2})\.(intro|normal|hard)$/;

export function stageEncounterId(stageId: string, difficulty: Difficulty): string {
  return `encounter.${stageId}.${difficulty}`;
}

/** The inverse of `stageEncounterId`; `null` for ids that are not campaign stages. */
export function parseStageEncounterId(id: string): { stageId: string; difficulty: Difficulty } | null {
  const match = STAGE_ENCOUNTER.exec(id);
  if (!match?.[1] || !match[2]) return null;
  return { stageId: match[1], difficulty: match[2] as Difficulty };
}

/** Energy per run: a band of four settlements per step, +1 on a boss stage (CAMPAIGN.md §2). */
export function stageEnergyCost(settlementIndex: number, boss: boolean, difficulty: Difficulty): number {
  const bands = ENERGY_COST[difficulty];
  const band = Math.min(
    bands.length - 1,
    Math.floor((settlementIndex - 1) / (SETTLEMENT_COUNT / bands.length)),
  );
  return (bands[band] ?? bands[bands.length - 1] ?? 0) + (boss ? BOSS_ENERGY_EXTRA : 0);
}

/** Plate level: `1 + g × 0.5` plus the difficulty's offset. Display only (CAMPAIGN.md §8). */
export function stageEnemyLevel(globalIndex: number, difficulty: Difficulty): number {
  return Math.round(1 + globalIndex * ENEMY_LEVEL_PER_STAGE) + ENEMY_LEVEL_DIFFICULTY_ADD[difficulty];
}

/**
 * The encounter fought when a stage is run on a difficulty. Waves come straight from the stage;
 * everything else (scaling index, plate level, limits, backdrop, music) is derived, so a balance
 * pass on `content/balance/campaign.ts` moves all 360 stages at once.
 */
export function stageEncounter(
  settlement: SettlementDef,
  stage: StageDef,
  difficulty: Difficulty,
): EncounterDef {
  const globalIndex = globalStageIndex(settlement.index, stage.number);
  return {
    id: stageEncounterId(stage.id, difficulty),
    stageId: stage.id,
    name: settlement.name,
    description: settlement.description,
    kind: 'campaign',
    partySize: PARTY_SIZE_CAMPAIGN,
    difficulty,
    stageIndex: globalIndex,
    enemyLevel: stageEnemyLevel(globalIndex, difficulty),
    waves: stage.waves.map((wave) => ({ enemies: wave.map((enemyId) => ({ enemyId })) })),
    turnLimit: stage.turnLimitDefeat,
    turnLimitMode: 'ally',
    timeUpIsDefeat: true,
    backdrop: settlement.backdrop,
    music: stage.boss ? 'boss' : settlement.music,
    surface: settlement.surface,
    version: settlement.version,
  };
}
