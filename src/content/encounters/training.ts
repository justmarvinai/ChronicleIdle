/**
 * Training Grounds (ROADMAP.md Phase 2): three encounters on the Emberhold practice field,
 * replaced by the Campaign in Phase 3. Scaling follows BATTLE.md §4.5 at Intro difficulty.
 * Compositions were tuned with a seeded win-rate sweep so the level-1 starter trio beats 1 and
 * 2 on auto (~29/30 seeds) and a full party of four wins the Warlord fight (~28/30).
 */
import { CAMPAIGN_TURN_LIMIT_DEFAULT } from '@content/balance/battle';
import type { EncounterDef } from './types';

const base = {
  difficulty: 'intro',
  turnLimit: CAMPAIGN_TURN_LIMIT_DEFAULT,
  turnLimitMode: 'ally',
  timeUpIsDefeat: true,
  music: 'battle',
  version: 1,
} as const;

const wave = (...enemyIds: string[]): EncounterDef['waves'][number] => ({
  enemies: enemyIds.map((enemyId) => ({ enemyId })),
});

const RAIDER = 'enemy.remnant_raider';
const MARKSMAN = 'enemy.remnant_marksman';
const WARDEN = 'enemy.remnant_warden';
const HEXER = 'enemy.remnant_hexer';
const MENDER = 'enemy.remnant_mender';
const WARLORD = 'enemy.remnant_warlord';

export const TRAINING_ENCOUNTERS: readonly EncounterDef[] = [
  {
    ...base,
    id: 'encounter.training.1',
    name: 'encounter.training.1.name',
    description: 'encounter.training.1.description',
    kind: 'training',
    partySize: 3,
    stageIndex: 0,
    enemyLevel: 1,
    backdrop: 'bg.bg7',
    surface: 'dirt',
    waves: [wave(RAIDER, RAIDER), wave(RAIDER, MARKSMAN)],
  },
  {
    ...base,
    id: 'encounter.training.2',
    name: 'encounter.training.2.name',
    description: 'encounter.training.2.description',
    kind: 'training',
    partySize: 3,
    stageIndex: 0,
    enemyLevel: 2,
    backdrop: 'bg.bg8',
    surface: 'stone',
    waves: [wave(RAIDER, MARKSMAN), wave(HEXER, RAIDER), wave(MENDER, RAIDER)],
  },
  {
    ...base,
    id: 'encounter.training.3',
    name: 'encounter.training.3.name',
    description: 'encounter.training.3.description',
    kind: 'boss',
    partySize: 4,
    stageIndex: 1,
    enemyLevel: 3,
    turnLimit: 50,
    backdrop: 'bg.bg3',
    music: 'boss',
    surface: 'stone',
    waves: [wave(WARDEN, MENDER), wave(WARLORD, RAIDER)],
  },
];
