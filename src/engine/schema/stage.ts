/** Zod schemas for the campaign: settlements and their ten stages (docs/design/CAMPAIGN.md §8). */
import { z } from 'zod';
import { BOSS_STAGE_NUMBER, SETTLEMENT_COUNT, STAGES_PER_SETTLEMENT } from '@content/balance/campaign';
import { ELEMENTS } from '@content/champions/types';

export const stageSchema = z.object({
  id: z.string().regex(/^stage\.\d{2}\.\d{2}$/),
  number: z.number().int().min(1).max(STAGES_PER_SETTLEMENT),
  waves: z
    .array(
      z
        .array(z.string().regex(/^enemy\.[a-z0-9_]+$/))
        .min(1)
        .max(4),
    )
    .min(2)
    .max(3),
  boss: z.boolean(),
  turnLimit3Star: z.number().int().min(5).max(200),
  turnLimitDefeat: z.number().int().min(10).max(500),
});

export const settlementSchema = z.object({
  id: z.string().regex(/^settlement\.\d{2}\.[a-z0-9_]+$/),
  index: z.number().int().min(1).max(SETTLEMENT_COUNT),
  name: z.string().min(1),
  description: z.string().min(1),
  faction: z.string().regex(/^faction\.[a-z0-9_]+$/),
  element: z.enum(ELEMENTS),
  backdrop: z.string().min(1),
  /** A CSS colour laid over the backdrop, so reused art reads as a different place. */
  grade: z.string().regex(/^(#[0-9a-f]{6}|rgba?\((\s*[\d.]+\s*,){2,3}\s*[\d.]+\s*\))$/i),
  music: z.enum(['battle', 'boss']),
  surface: z.enum(['dirt', 'stone', 'water', 'wood']),
  setPool: z.array(z.string().regex(/^gear_set\.[a-z0-9_]+$/)).min(1),
  stages: z.array(stageSchema).length(STAGES_PER_SETTLEMENT),
  version: z.number().int().positive(),
});

/** The third star's limit must be reachable inside the defeat limit, and only stage 10 is a boss. */
export function stageShapeIssues(stage: {
  number: number;
  boss: boolean;
  turnLimit3Star: number;
  turnLimitDefeat: number;
}): string[] {
  const problems: string[] = [];
  if (stage.turnLimit3Star >= stage.turnLimitDefeat)
    problems.push('turnLimit3Star must be below turnLimitDefeat');
  if (stage.boss !== (stage.number === BOSS_STAGE_NUMBER))
    problems.push(`only stage ${BOSS_STAGE_NUMBER} is a boss stage`);
  return problems;
}
