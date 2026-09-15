/** Every enemy definition: the twelve faction rosters, their stage bosses, and the boss tiers. */
import { BOSS_ENEMIES } from '@content/bosses/index';
import { FACTIONS } from './factions/index';
import type { EnemyDef } from './types';

export const ENEMIES: readonly EnemyDef[] = [
  ...FACTIONS.flatMap((f) => [...f.units, f.boss]),
  ...BOSS_ENEMIES,
];

export const ENEMY_BY_ID: Readonly<Record<string, EnemyDef>> = Object.fromEntries(
  ENEMIES.map((e) => [e.id, e]),
);
