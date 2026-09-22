/**
 * Dungeon stage → encounter (docs/design/DUNGEONS.md §3).
 *
 * A stage is not authored. Its keeper comes from the dungeon, its guard from the warband that
 * keeps the dungeon, and how hard both are from `dungeonScale(stage, difficulty)` — so forty
 * fights per keep are four lines of data and no authored encounters, the way a tower floor and a
 * brewery stage are.
 *
 * The encounter is pitched at Intro's flat multiplier and stage index 0 on purpose: `stageScale`
 * and `DIFFICULTY_MULT` both come out at 1, which leaves `dungeonScale` as the **single** curve
 * acting on a dungeon enemy. One number decides how hard a stage is.
 */
import { PARTY_SIZE_BOSS } from '@content/balance/battle';
import {
  DUNGEON_KEEPER_MULT,
  DUNGEON_LEVEL_BASE,
  DUNGEON_LEVEL_PER_STAGE,
  DUNGEON_PARTY_SIZE,
  DUNGEON_STAGES,
  DUNGEON_TURN_LIMIT,
  dungeonScale,
  type DungeonDifficulty,
} from '@content/balance/dungeon';
import type { EncounterDef, EncounterEnemy } from '@content/encounters/types';
import type { DungeonDef } from '@content/dungeons/types';
import type { EnemyDef } from '@content/enemies/types';
import type { FactionDef } from '@content/enemies/faction';

/** `encounter.dungeon.<slug>.<difficulty>.<stage>`. */
const DUNGEON_ENCOUNTER = /^encounter\.dungeon\.([a-z_]+)\.(normal|hard)\.(\d{1,2})$/;

export function dungeonEncounterId(slug: string, difficulty: DungeonDifficulty, stage: number): string {
  return `encounter.dungeon.${slug}.${difficulty}.${stage}`;
}

/** The inverse of `dungeonEncounterId`; `null` for ids that are not dungeon stages. */
export function parseDungeonEncounterId(
  id: string,
): { slug: string; difficulty: DungeonDifficulty; stage: number } | null {
  const match = DUNGEON_ENCOUNTER.exec(id);
  const slug = match?.[1];
  const difficulty = match?.[2];
  const stage = match?.[3];
  if (!slug || !difficulty || !stage) return null;
  const number = Number.parseInt(stage, 10);
  if (number < 1 || number > DUNGEON_STAGES) return null;
  return { slug, difficulty: difficulty as DungeonDifficulty, stage: number };
}

/** Plate level: display only, like the campaign's (owner's answer Q29). */
export function dungeonEnemyLevel(stage: number, difficulty: DungeonDifficulty): number {
  const clamped = Math.max(1, Math.min(DUNGEON_STAGES, Math.round(stage)));
  return Math.round(DUNGEON_LEVEL_BASE[difficulty] + (clamped - 1) * DUNGEON_LEVEL_PER_STAGE[difficulty]);
}

/**
 * The keeper and its guard. The guard is a **walking window** over the warband's six units — the
 * window moves by one per stage, so two stages of the same dungeon are never quite the same fight
 * and every archetype takes its turn beside the keeper.
 */
function picks(
  stage: number,
  difficulty: DungeonDifficulty,
  keeper: EnemyDef,
  faction: FactionDef,
): EncounterEnemy[] {
  const scale = dungeonScale(stage, difficulty);
  const out: EncounterEnemy[] = [{ enemyId: keeper.id, statMult: scale * DUNGEON_KEEPER_MULT }];
  const units = faction.units;
  const guards = DUNGEON_PARTY_SIZE - 1;
  const offset = (stage - 1) % units.length;
  for (let i = 0; i < Math.min(guards, units.length); i += 1) {
    const unit = units[(offset + i) % units.length];
    if (unit) out.push({ enemyId: unit.id, statMult: scale });
  }
  return out;
}

/**
 * The fight a dungeon stage is: one wave, the keeper and three of its warband, against four
 * champions. One wave rather than a gauntlet because a dungeon is farmed by the dozen — the
 * fight has to fit in an evening at ×4, and the keeper is the whole of it.
 */
export function dungeonEncounter(
  def: DungeonDef,
  stage: number,
  difficulty: DungeonDifficulty,
  keeper: EnemyDef,
  faction: FactionDef,
): EncounterDef {
  return {
    id: dungeonEncounterId(def.slug, difficulty, stage),
    name: def.name,
    description: def.description,
    kind: 'dungeon',
    // Four champions, the bosses' shape rather than the campaign's three (the owner's answer).
    partySize: PARTY_SIZE_BOSS,
    // Intro × stage 0 = 1: `dungeonScale` is the only thing scaling a dungeon enemy.
    difficulty: 'intro',
    stageIndex: 0,
    enemyLevel: dungeonEnemyLevel(stage, difficulty),
    waves: [{ enemies: picks(stage, difficulty, keeper, faction) }],
    turnLimit: DUNGEON_TURN_LIMIT,
    turnLimitMode: 'ally',
    timeUpIsDefeat: true,
    backdrop: def.backdrop,
    // Every stage is a keeper fight, so every stage gets the boss theme.
    music: 'boss',
    surface: def.surface,
    version: def.version,
  };
}
