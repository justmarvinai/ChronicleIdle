/** Every enemy definition (explicit imports, like champions/index.ts). */
import type { EnemyDef } from './types';
import remnant_raider from './remnant_raider';
import remnant_marksman from './remnant_marksman';
import remnant_brute from './remnant_brute';
import remnant_warden from './remnant_warden';
import remnant_hexer from './remnant_hexer';
import remnant_mender from './remnant_mender';
import remnant_warlord from './remnant_warlord';

export const ENEMIES: readonly EnemyDef[] = [
  remnant_raider,
  remnant_marksman,
  remnant_brute,
  remnant_warden,
  remnant_hexer,
  remnant_mender,
  remnant_warlord,
];

export const ENEMY_BY_ID: Readonly<Record<string, EnemyDef>> = Object.fromEntries(
  ENEMIES.map((e) => [e.id, e]),
);
