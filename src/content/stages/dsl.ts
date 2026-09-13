/**
 * `defineSettlement`: ten stages from ten lines (docs/design/CAMPAIGN.md §4, §8).
 *
 * Wave *shape* is the design table's, so it is computed rather than typed out 360 times; a stage
 * only declares which of its faction's archetypes turn up, in the order the player should meet
 * them, and the waves are filled by cycling that mix. The boss stage leads its last wave with the
 * faction's named boss.
 */
import {
  BOSS_STAGE_NUMBER,
  DEFEAT_TURN_LIMIT,
  DEFEAT_TURN_LIMIT_BOSS,
  STAGES_PER_SETTLEMENT,
  STAR3_TURN_LIMIT,
  STAR3_TURN_LIMIT_BOSS,
} from '@content/balance/campaign';
import type { FactionArchetype } from '@content/enemies/types';
import type { FactionDef } from '@content/enemies/faction';
import type { SettlementDef, StageDef } from './types';

export interface StageInput {
  /** Archetypes that turn up, in order; each wave is filled by cycling this list. */
  mix: readonly FactionArchetype[];
  /** Boss stage only: who stands beside the boss in the final wave. */
  adds?: readonly FactionArchetype[];
}

export interface SettlementInput {
  index: number;
  /** `<snake_case>` matching the settlement's name, e.g. `greyhaven_harbor`. */
  slug: string;
  faction: FactionDef;
  backdrop: SettlementDef['backdrop'];
  grade: string;
  surface: SettlementDef['surface'];
  setPool: readonly string[];
  /** Exactly ten entries, stages 1..10. */
  stages: readonly StageInput[];
  version?: number;
}

/**
 * Enemies per wave (CAMPAIGN.md §4). The first settlement's opening three stages are gentler so
 * the tutorial has somewhere to stand; the boss wave is the boss plus two adds.
 */
export function waveCounts(settlement: number, stage: number): readonly number[] {
  if (stage === BOSS_STAGE_NUMBER) return [3, 4, 3];
  if (stage <= 3) return settlement === 1 ? [2, 2] : [2, 3, 3];
  if (stage <= 6) return [3, 3, 4];
  return [3, 4, 4];
}

const pad = (n: number): string => String(n).padStart(2, '0');

export function defineSettlement(input: SettlementInput): SettlementDef {
  if (input.stages.length !== STAGES_PER_SETTLEMENT)
    throw new Error(`${input.slug}: ${input.stages.length} stages, expected ${STAGES_PER_SETTLEMENT}`);
  const stages: StageDef[] = input.stages.map((stage, i) => {
    const number = i + 1;
    const boss = number === BOSS_STAGE_NUMBER;
    const counts = waveCounts(input.index, number);
    const unit = (archetype: FactionArchetype): string => input.faction.byArchetype[archetype];
    let cursor = 0;
    const waves = counts.map((count, wave) => {
      const lastWave = wave === counts.length - 1;
      if (boss && lastWave) {
        const adds = stage.adds ?? stage.mix;
        return [
          input.faction.boss.id,
          ...Array.from({ length: count - 1 }, (_, k) => unit(adds[k % adds.length] as FactionArchetype)),
        ];
      }
      return Array.from({ length: count }, () => {
        const archetype = stage.mix[cursor % stage.mix.length] as FactionArchetype;
        cursor += 1;
        return unit(archetype);
      });
    });
    return {
      id: `stage.${pad(input.index)}.${pad(number)}`,
      number,
      waves,
      boss,
      turnLimit3Star: boss ? STAR3_TURN_LIMIT_BOSS : STAR3_TURN_LIMIT,
      turnLimitDefeat: boss ? DEFEAT_TURN_LIMIT_BOSS : DEFEAT_TURN_LIMIT,
    };
  });
  return {
    id: `settlement.${pad(input.index)}.${input.slug}`,
    index: input.index,
    name: `settlement.${input.slug}.name`,
    description: `settlement.${input.slug}.description`,
    faction: input.faction.id,
    element: input.faction.element,
    backdrop: input.backdrop,
    grade: input.grade,
    music: 'battle',
    surface: input.surface,
    setPool: input.setPool,
    stages,
    version: input.version ?? 1,
  };
}
