/**
 * The world the Unwritten's engine is played in: its own content bundle, and the campaign's
 * factions, foes and champions it borrows (docs/design/UNWRITTEN.md). Imported only by the
 * Unwritten's own chunk (ADR-050) and by tests and tools — never by the first screen.
 */
import { content } from '@content/registry';
import type { ChampionId } from '@content/champions/types';
import { UNWRITTEN, UNWRITTEN_ENEMY_BY_ID } from '@content/unwritten/index';
import type { UnwrittenWorld } from '@engine/unwritten/world';

export const UNWRITTEN_WORLD: UnwrittenWorld = {
  content: UNWRITTEN,
  factionById: (id) => content.factionById(id),
  enemyById: (id) => UNWRITTEN_ENEMY_BY_ID[id] ?? content.enemyById(id),
  championById: (id) => content.championById(id as ChampionId),
  echoPool: content.summonPool,
};
