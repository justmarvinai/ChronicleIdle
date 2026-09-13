/** Every enemy definition: the twelve faction rosters and their stage bosses. */
import { FACTIONS } from './factions/index';
import type { EnemyDef } from './types';

export const ENEMIES: readonly EnemyDef[] = FACTIONS.flatMap((f) => [...f.units, f.boss]);

export const ENEMY_BY_ID: Readonly<Record<string, EnemyDef>> = Object.fromEntries(
  ENEMIES.map((e) => [e.id, e]),
);
