/**
 * Training Grounds (ROADMAP.md Phase 2): three encounters on the Emberhold practice field,
 * replaced by the Campaign in Phase 3. Scaling follows BATTLE.md §4.5 at Intro difficulty.
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
    waves: [
      { enemies: [{ enemyId: 'enemy.remnant_raider' }, { enemyId: 'enemy.remnant_raider' }] },
      { enemies: [{ enemyId: 'enemy.remnant_raider' }, { enemyId: 'enemy.remnant_marksman' }] },
    ],
  },
  {
    ...base,
    id: 'encounter.training.2',
    name: 'encounter.training.2.name',
    description: 'encounter.training.2.description',
    kind: 'training',
    partySize: 3,
    stageIndex: 4,
    enemyLevel: 3,
    backdrop: 'bg.bg8',
    surface: 'stone',
    waves: [
      {
        enemies: [
          { enemyId: 'enemy.remnant_raider' },
          { enemyId: 'enemy.remnant_marksman' },
          { enemyId: 'enemy.remnant_hexer' },
        ],
      },
      {
        enemies: [
          { enemyId: 'enemy.remnant_brute' },
          { enemyId: 'enemy.remnant_raider' },
          { enemyId: 'enemy.remnant_mender' },
        ],
      },
      {
        enemies: [
          { enemyId: 'enemy.remnant_warden' },
          { enemyId: 'enemy.remnant_marksman' },
          { enemyId: 'enemy.remnant_hexer' },
          { enemyId: 'enemy.remnant_raider' },
        ],
      },
    ],
  },
  {
    ...base,
    id: 'encounter.training.3',
    name: 'encounter.training.3.name',
    description: 'encounter.training.3.description',
    kind: 'boss',
    partySize: 4,
    stageIndex: 9,
    enemyLevel: 6,
    turnLimit: 50,
    backdrop: 'bg.bg3',
    music: 'boss',
    surface: 'stone',
    waves: [
      {
        enemies: [
          { enemyId: 'enemy.remnant_brute' },
          { enemyId: 'enemy.remnant_warden' },
          { enemyId: 'enemy.remnant_mender' },
        ],
      },
      {
        enemies: [
          { enemyId: 'enemy.remnant_warlord' },
          { enemyId: 'enemy.remnant_raider' },
          { enemyId: 'enemy.remnant_hexer' },
        ],
      },
    ],
  },
];
