/**
 * Perf-bench encounter (CLAUDE.md §5.6, ROADMAP Phase 2 acceptance): a 4 v 4 fight heavier than
 * any real encounter, fought at ×4 by four maxed legendaries so every FX path fires. It is never
 * listed in-game; `tools/perf/battle-bench.ts` opens it through `?screen=perf`.
 */
import type { EncounterDef } from './types';

/**
 * Heavier than any real stage: the bench measures frames, so the fight has to last. At ×5 the four
 * maxed legendaries win around turn 35–45 having fired every cast, hit, heal, buff and death FX.
 */
const BENCH_STAT_MULT = 5;
const wave = (...enemyIds: string[]): EncounterDef['waves'][number] => ({
  enemies: enemyIds.map((enemyId) => ({ enemyId, statMult: BENCH_STAT_MULT })),
});

export const BENCH_ENCOUNTERS: readonly EncounterDef[] = [
  {
    id: 'encounter.bench.stress',
    name: 'encounter.bench.stress.name',
    description: 'encounter.bench.stress.description',
    kind: 'bench',
    partySize: 4,
    difficulty: 'normal',
    stageIndex: 40,
    enemyLevel: 40,
    // A fixed length: the bench measures frames over the whole fight, whoever wins.
    turnLimit: 60,
    turnLimitMode: 'all',
    timeUpIsDefeat: false,
    backdrop: 'bg.bg3',
    music: 'boss',
    surface: 'stone',
    version: 1,
    waves: [
      wave('enemy.the_gatekeeper', 'enemy.nightbinder', 'enemy.soul_tender', 'enemy.star_caller'),
      wave('enemy.eclipse_warden', 'enemy.rift_hulk', 'enemy.void_acolyte', 'enemy.nightbinder'),
    ],
  },
];
