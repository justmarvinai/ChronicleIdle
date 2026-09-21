/**
 * Brewery stage → encounter (docs/design/BREWERY.md §3).
 *
 * A stage is not authored. Which guards stand in it comes from the faction that holds it, how hard
 * they are from the stage's own multiplier, and what the fight looks like from that faction's
 * settlement — so a hall is data and its five fights are derived, the way a tower floor is.
 *
 * The encounter is pitched at Intro's flat multiplier and stage index 0 on purpose: `stageScale`
 * and `DIFFICULTY_MULT` both come out at 1, which leaves the stage's `scale` as the single curve
 * acting on a brewery guard. One number decides how hard a stage is.
 */
import { PARTY_SIZE_CAMPAIGN } from '@content/balance/battle';
import type { BreweryDef, BreweryStageDef } from '@content/brewery/types';
import { ELEMENTS, type Element } from '@content/champions/types';
import type { EncounterDef, EncounterEnemy } from '@content/encounters/types';
import type { FactionDef } from '@content/enemies/faction';
import type { SettlementDef } from '@content/stages/types';

/** `encounter.brewery.<element>.<stage>`. */
const BREWERY_ENCOUNTER = /^encounter\.brewery\.([a-z]+)\.(\d)$/;

export function breweryEncounterId(element: Element, stage: number): string {
  return `encounter.brewery.${element}.${stage}`;
}

/** The inverse of `breweryEncounterId`; `null` for ids that are not brewery stages. */
export function parseBreweryEncounterId(id: string): { element: Element; stage: number } | null {
  const match = BREWERY_ENCOUNTER.exec(id);
  const element = match?.[1];
  const stage = match?.[2];
  if (!element || !stage) return null;
  if (!ELEMENTS.includes(element as Element)) return null;
  return { element: element as Element, stage: Number.parseInt(stage, 10) };
}

/**
 * Which of a faction's six units guard a stage. The window walks by one per stage, so two stages
 * held by the same faction are never the same fight and every archetype takes its turn.
 */
function guardPicks(stage: BreweryStageDef, faction: FactionDef): EncounterEnemy[] {
  const units = faction.units;
  const picks: EncounterEnemy[] = [];
  if (stage.boss) picks.push({ enemyId: faction.boss.id, statMult: stage.scale });
  const offset = (stage.number - 1) % units.length;
  const wanted = stage.boss ? stage.guards - 1 : stage.guards;
  for (let i = 0; i < Math.min(wanted, units.length); i += 1) {
    const unit = units[(offset + i) % units.length];
    if (unit) picks.push({ enemyId: unit.id, statMult: stage.scale });
  }
  return picks;
}

/**
 * The fight a brewery stage is. One wave — twenty runs a day have to fit in an evening — and the
 * holding faction's own backdrop, so a hall reads as a descent through places the player knows.
 */
export function breweryEncounter(
  def: BreweryDef,
  stage: BreweryStageDef,
  faction: FactionDef,
  settlement: SettlementDef,
): EncounterDef {
  return {
    id: breweryEncounterId(def.element, stage.number),
    name: `${def.name}`,
    description: def.description,
    kind: 'brewery',
    partySize: PARTY_SIZE_CAMPAIGN,
    // Intro × stage 0 = 1: the stage's own `scale` is the only thing scaling a brewery guard.
    difficulty: 'intro',
    stageIndex: 0,
    enemyLevel: stage.enemyLevel,
    waves: [{ enemies: guardPicks(stage, faction) }],
    turnLimit: stage.turnLimit,
    turnLimitMode: 'ally',
    timeUpIsDefeat: true,
    backdrop: settlement.backdrop,
    music: stage.boss ? 'boss' : settlement.music,
    surface: settlement.surface,
    version: 1,
  };
}
