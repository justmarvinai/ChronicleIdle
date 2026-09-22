/**
 * Every enemy definition: the twelve faction rosters, their stage bosses, the two period bosses'
 * tiers, and the four dungeon keepers.
 */
import { BOSS_ENEMIES } from '@content/bosses/index';
import { DUNGEON_KEEPERS } from '@content/dungeons/keepers';
import { FACTIONS } from './factions/index';
import type { EnemyDef } from './types';

export const ENEMIES: readonly EnemyDef[] = [
  ...FACTIONS.flatMap((f) => [...f.units, f.boss]),
  ...BOSS_ENEMIES,
  ...DUNGEON_KEEPERS,
];

export const ENEMY_BY_ID: Readonly<Record<string, EnemyDef>> = Object.fromEntries(
  ENEMIES.map((e) => [e.id, e]),
);
