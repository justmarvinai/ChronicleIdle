/**
 * What the Unwritten's engine reads besides the expedition itself (docs/design/UNWRITTEN.md).
 *
 * The engine never imports content data: the state layer hands it the Unwritten's own bundle and
 * the few registries it needs from the rest of the game — the factions whose foes a folio
 * remembers, the champions an Echo can be — so every function here is testable with a small world.
 */
import type { ChampionDef } from '@content/champions/types';
import type { FactionDef } from '@content/enemies/faction';
import type { EnemyDef } from '@content/enemies/types';
import type { UnwrittenContent } from '@content/unwritten/index';

export interface UnwrittenWorld {
  content: UnwrittenContent;
  factionById(id: string): FactionDef | undefined;
  /** Any foe: the campaign's and the Unwritten's own. */
  enemyById(id: string): EnemyDef | undefined;
  championById(id: string): ChampionDef | undefined;
  /** The champions an Echo may be: every summonable one. */
  echoPool: readonly ChampionDef[];
}
