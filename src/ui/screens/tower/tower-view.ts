/**
 * What the tower screen reads off a floor (docs/tech/UI_DESIGN.md §5.13a): who holds it, what it
 * fields and what a clear pays. Kept out of the components so the dossier's numbers are testable.
 */
import { TOWER_FLOORS, towerFaction } from '@content/balance/tower';
import type { EncounterDef } from '@content/encounters/types';
import type { FactionDef } from '@content/enemies/faction';
import type { EnemyDef } from '@content/enemies/types';
import { content } from '@content/registry';
import type { SettlementDef } from '@content/stages/types';
import { isBossFloor, shardOdds, towerFloorPayout, type TowerFloorRewards } from '@engine/tower/index';
import { towerFloorEncounter } from '@state/tower';

export interface FloorDossier {
  floor: number;
  boss: boolean;
  /** Where the floor's faction comes from: its name and its art. */
  settlement: SettlementDef;
  faction: FactionDef;
  encounter: EncounterDef;
  /** The floor's one wave, each enemy at its own scale. */
  enemies: { def: EnemyDef; statMult: number }[];
  /** What a clear pays for certain; a boss floor may also roll shards at `odds`. */
  payout: TowerFloorRewards;
  odds: { ancient: number; sacred: number };
}

/** Everything the dossier shows about `floor`, or null for a floor the tower does not have. */
export function floorDossier(floor: number): FloorDossier | null {
  const settlement = content.settlementByIndex(towerFaction(floor));
  const faction = settlement ? content.factionById(settlement.faction) : undefined;
  const encounter = towerFloorEncounter(floor);
  if (!settlement || !faction || !encounter || floor < 1 || floor > TOWER_FLOORS) return null;
  const enemies = encounter.waves
    .flatMap((wave) => wave.enemies)
    .flatMap((spawn) => {
      const def = content.enemyById(spawn.enemyId);
      return def ? [{ def, statMult: spawn.statMult ?? 1 }] : [];
    });
  return {
    floor,
    boss: isBossFloor(floor),
    settlement,
    faction,
    encounter,
    enemies,
    payout: towerFloorPayout({ floor, element: faction.element }),
    odds: shardOdds(floor),
  };
}
