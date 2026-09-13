/** Every encounter definition; campaign stages and bosses add theirs in later phases. */
import { BENCH_ENCOUNTERS } from './bench';
import { TRAINING_ENCOUNTERS } from './training';
import type { EncounterDef } from './types';

export const ENCOUNTERS: readonly EncounterDef[] = [...TRAINING_ENCOUNTERS, ...BENCH_ENCOUNTERS];
export const ENCOUNTER_BY_ID: Readonly<Record<string, EncounterDef>> = Object.fromEntries(
  ENCOUNTERS.map((e) => [e.id, e]),
);
