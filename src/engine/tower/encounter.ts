/**
 * Eternal Tower floor → encounter (docs/design/ETERNAL_TOWER.md §3).
 *
 * A floor is not authored. Everything it fields is a pure function of its number: which faction
 * holds it, which of that faction's units stand on it, how hard they are and what the plate says.
 * The id round-trips, so a save only ever remembers a floor number.
 *
 * The encounter is pitched at Intro's flat multiplier and stage index 0 on purpose: `stageScale`
 * and `DIFFICULTY_MULT` both come out at 1, which leaves `towerScale(floor)` as the single curve
 * acting on a tower enemy. One number decides how hard a floor is.
 */
import { PARTY_SIZE_BOSS } from '@content/balance/battle';
import {
  TOWER_BOSS_ESCORT,
  TOWER_BOSS_EVERY,
  TOWER_TURN_LIMIT,
  TOWER_TURN_LIMIT_BOSS,
  TOWER_WAVE_SIZE,
  towerEnemyLevel,
  towerScale,
} from '@content/balance/tower';
import type { EncounterDef, EncounterEnemy } from '@content/encounters/types';
import type { FactionDef } from '@content/enemies/faction';
import type { SettlementDef } from '@content/stages/types';

/** `encounter.tower.<floor:03>`. */
const TOWER_ENCOUNTER = /^encounter\.tower\.(\d{3})$/;

export function towerEncounterId(floor: number): string {
  return `encounter.tower.${String(floor).padStart(3, '0')}`;
}

/** The inverse of `towerEncounterId`; `null` for ids that are not tower floors. */
export function parseTowerEncounterId(id: string): number | null {
  const match = TOWER_ENCOUNTER.exec(id);
  if (!match?.[1]) return null;
  const floor = Number.parseInt(match[1], 10);
  return floor >= 1 ? floor : null;
}

/** Every tenth floor: the only kind that may be fought again, and the only kind that drops shards. */
export function isBossFloor(floor: number): boolean {
  return floor % TOWER_BOSS_EVERY === 0;
}

/**
 * Which of a faction's six units stand on an ordinary floor. The window walks by one per floor, so
 * two floors of the same faction are never the same fight and every archetype takes its turn.
 */
function wavePicks(floor: number, faction: FactionDef): EncounterEnemy[] {
  const units = faction.units;
  const statMult = towerScale(floor);
  const offset = (floor - 1) % units.length;
  const picks: EncounterEnemy[] = [];
  for (let i = 0; i < Math.min(TOWER_WAVE_SIZE, units.length); i += 1) {
    const unit = units[(offset + i) % units.length];
    if (unit) picks.push({ enemyId: unit.id, statMult });
  }
  return picks;
}

/** A boss floor: the faction's named boss, flanked by two of its own. */
function bossPicks(floor: number, faction: FactionDef): EncounterEnemy[] {
  const statMult = towerScale(floor);
  const picks: EncounterEnemy[] = [{ enemyId: faction.boss.id, statMult }];
  const units = faction.units;
  const offset = (floor - 1) % units.length;
  for (let i = 0; i < Math.min(TOWER_BOSS_ESCORT, units.length); i += 1) {
    const unit = units[(offset + i) % units.length];
    if (unit) picks.push({ enemyId: unit.id, statMult });
  }
  return picks;
}

/**
 * The encounter fought on a floor. One wave — a key buys a fight, not a gauntlet — and the
 * faction's own backdrop and surface, so the tower reads as a climb through places the player has
 * already walked.
 */
export function towerEncounter(floor: number, faction: FactionDef, settlement: SettlementDef): EncounterDef {
  const boss = isBossFloor(floor);
  return {
    id: towerEncounterId(floor),
    name: 'tower.floor.name',
    description: 'tower.floor.description',
    kind: 'tower',
    partySize: PARTY_SIZE_BOSS,
    // Intro × stage 0 = 1: `towerScale` is the only thing scaling a tower enemy.
    difficulty: 'intro',
    stageIndex: 0,
    enemyLevel: towerEnemyLevel(floor),
    waves: [{ enemies: boss ? bossPicks(floor, faction) : wavePicks(floor, faction) }],
    turnLimit: boss ? TOWER_TURN_LIMIT_BOSS : TOWER_TURN_LIMIT,
    turnLimitMode: 'ally',
    timeUpIsDefeat: true,
    backdrop: settlement.backdrop,
    music: boss ? 'boss' : settlement.music,
    surface: settlement.surface,
    version: 1,
  };
}
