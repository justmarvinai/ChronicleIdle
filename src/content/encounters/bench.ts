/**
 * Perf-bench encounter (CLAUDE.md §5.6, ROADMAP Phase 2 acceptance): a 4 v 4 fight heavier than
 * any real encounter, fought at ×4 by four maxed legendaries so every FX path fires. It is never
 * listed in-game; `tools/perf/battle-bench.ts` opens it through `?screen=perf`.
 */
import type { EncounterDef } from './types';

const wave = (...enemyIds: string[]): EncounterDef['waves'][number] => ({
  enemies: enemyIds.map((enemyId) => ({ enemyId, statMult: 1.5 })),
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
      wave('enemy.remnant_warlord', 'enemy.remnant_hexer', 'enemy.remnant_mender', 'enemy.remnant_marksman'),
      wave('enemy.remnant_warden', 'enemy.remnant_brute', 'enemy.remnant_raider', 'enemy.remnant_hexer'),
    ],
  },
];
