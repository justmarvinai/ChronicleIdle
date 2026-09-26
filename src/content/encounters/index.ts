/**
 * Authored encounters. Campaign stages generate theirs from `content/stages` (the campaign engine
 * derives one per difficulty), and the bosses, the tower, the Brewery and the Dungeons derive theirs
 * from their own content, so the only authored entries are the perf bench's.
 */
import { BENCH_ENCOUNTERS } from './bench';
import type { EncounterDef } from './types';

export const ENCOUNTERS: readonly EncounterDef[] = [...BENCH_ENCOUNTERS];
export const ENCOUNTER_BY_ID: Readonly<Record<string, EncounterDef>> = Object.fromEntries(
  ENCOUNTERS.map((e) => [e.id, e]),
);
