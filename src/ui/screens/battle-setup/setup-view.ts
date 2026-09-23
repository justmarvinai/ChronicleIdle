/**
 * What the battle setup screen reads off an encounter and a team (docs/tech/UI_DESIGN.md §5.8),
 * kept out of the components so the numbers it shows are testable on their own.
 */
import { ELEMENT_BEATS } from '@content/balance/element';
import { ELEMENTS, type Element } from '@content/champions/types';
import type { EncounterDef } from '@content/encounters/types';
import { content } from '@content/registry';
import { scaledEnemyStats } from '@engine/battle/index';
import { parseStageEncounterId } from '@engine/campaign/encounter';
import { parseStageId, type StagePointer } from '@engine/campaign/progress';
import { power } from '@engine/champions/stats';

/** `encounter.stage.03.07.normal` → the stage pointer the campaign actions take. */
export function stagePointerOf(encounterId: string): StagePointer | null {
  const parsed = parseStageEncounterId(encounterId);
  const stage = parsed ? parseStageId(parsed.stageId) : null;
  return parsed && stage ? { ...stage, difficulty: parsed.difficulty } : null;
}

/**
 * One wave's power: Σ `power(scaledEnemyStats)` over its enemies — the same weighted sum a
 * champion's power is (CHAMPIONS.md §2), so the two numbers the screen sets side by side are
 * measured with one ruler.
 */
export function wavePower(encounter: EncounterDef, wave: number): number {
  let total = 0;
  for (const spawn of encounter.waves[wave]?.enemies ?? []) {
    const def = content.enemyById(spawn.enemyId);
    if (def) total += power(scaledEnemyStats(def, encounter, spawn.statMult ?? 1));
  }
  return total;
}

/** The strongest wave's power: a fight is only as easy as its hardest wave. */
export function enemyPower(encounter: EncounterDef): number {
  return encounter.waves.reduce((best, _, wave) => Math.max(best, wavePower(encounter, wave)), 0);
}

/**
 * The team's share of the two sides' power, for the bar between them: ½ when they are level,
 * towards 1 when the team outweighs the enemy. Nothing on either side reads as level.
 */
export function powerShare(team: number, enemy: number): number {
  const total = team + enemy;
  return total > 0 ? team / total : 0.5;
}

/**
 * Click-to-place (docs/tech/UI_DESIGN.md §5.8): a champion already seated leaves the team, one
 * who is not takes the next empty seat — or, with the team full, the last seat.
 */
export function toggleMember(team: readonly string[], instanceId: string, partySize: number): string[] {
  if (team.includes(instanceId)) return team.filter((id) => id !== instanceId);
  if (team.length >= partySize) return [...team.slice(0, partySize - 1), instanceId];
  return [...team, instanceId];
}

/** The champion in seat `index` takes the leader's seat; everyone else keeps their order. */
export function makeLeader(team: readonly string[], index: number): string[] {
  const chosen = team[index];
  if (chosen === undefined || index === 0) return [...team];
  return [chosen, ...team.filter((_, i) => i !== index)];
}

/** What a scout reads off one wave before the fight: the element match-ups, and a healer if any. */
export interface ScoutReport {
  /** Elements that strike this wave harder (CHAMPIONS.md §1): bring them. */
  strong: Element[];
  /** Elements this wave strikes harder: they are the ones at risk. */
  weak: Element[];
  /** A mender stands in the wave, and a fight goes better when it falls first. */
  healer: boolean;
}

/** The scout's report on wave `wave`: every element's match-up against it, and its menders. */
export function scoutWave(encounter: EncounterDef, wave: number): ScoutReport {
  const strong = new Set<Element>();
  const weak = new Set<Element>();
  let healer = false;
  for (const spawn of encounter.waves[wave]?.enemies ?? []) {
    const def = content.enemyById(spawn.enemyId);
    if (!def) continue;
    for (const element of ELEMENTS) if (ELEMENT_BEATS[element] === def.element) strong.add(element);
    const beats = ELEMENT_BEATS[def.element];
    if (beats) weak.add(beats);
    if (def.archetype === 'mender') healer = true;
  }
  // The wheel's order, not the wave's, so the chips never shuffle between waves.
  return {
    strong: ELEMENTS.filter((element) => strong.has(element)),
    weak: ELEMENTS.filter((element) => weak.has(element)),
    healer,
  };
}
