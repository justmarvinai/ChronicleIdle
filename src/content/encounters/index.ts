/**
 * Authored encounters. Campaign stages generate theirs from `content/stages` (the campaign engine
 * derives one per difficulty), so the only authored entries are the perf bench and, later, the
 * daily and weekly bosses.
 */
import { BENCH_ENCOUNTERS } from './bench';
import type { EncounterDef } from './types';

export const ENCOUNTERS: readonly EncounterDef[] = [...BENCH_ENCOUNTERS];
export const ENCOUNTER_BY_ID: Readonly<Record<string, EncounterDef>> = Object.fromEntries(
  ENCOUNTERS.map((e) => [e.id, e]),
);
