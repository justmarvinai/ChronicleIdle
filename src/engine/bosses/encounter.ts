/**
 * Boss tier → encounter (docs/design/BOSSES.md §1).
 *
 * A boss tier is authored once and fought with a key, so its encounter is derived rather than
 * stored: `bossEncounter` is a pure function of the boss and the tier, and its id round-trips
 * through `parseBossEncounterId` so a save only ever remembers the boss and the tier. The fight
 * never scales with the campaign — `stageIndex: 0` on Intro is scale 1, and the tier's enemy
 * carries `fixedStats` — so the numbers in the table are the numbers in the fight.
 */
import { PARTY_SIZE_BOSS } from '@content/balance/battle';
import type { BossDef, BossTierDef } from '@content/bosses/types';
import type { EncounterDef } from '@content/encounters/types';

/** `encounter.boss.<slug>.<tier>`. */
const BOSS_ENCOUNTER = /^encounter\.(boss\.[a-z0-9_]+)\.([a-z0-9_]+)$/;

export function bossEncounterId(bossId: string, tierId: string): string {
  return `encounter.${bossId}.${tierId}`;
}

/** The inverse of `bossEncounterId`; `null` for ids that are not boss fights. */
export function parseBossEncounterId(id: string): { bossId: string; tierId: string } | null {
  const match = BOSS_ENCOUNTER.exec(id);
  if (!match?.[1] || !match[2]) return null;
  return { bossId: match[1], tierId: match[2] };
}

/**
 * The fight a key buys. One wave, one boss, four champions, and a turn limit that ends the race
 * without calling it a defeat — the damage counts either way (BOSSES.md §1).
 */
export function bossEncounter(boss: BossDef, tier: BossTierDef): EncounterDef {
  return {
    id: bossEncounterId(boss.id, tier.id),
    name: boss.name,
    description: boss.lore,
    kind: 'boss',
    partySize: PARTY_SIZE_BOSS,
    difficulty: 'intro',
    stageIndex: 0,
    enemyLevel: tier.enemyLevel,
    waves: [{ enemies: [{ enemyId: tier.enemy.id }] }],
    turnLimit: tier.turnLimit,
    turnLimitMode: 'all',
    timeUpIsDefeat: false,
    backdrop: boss.backdrop,
    music: 'boss',
    surface: boss.surface,
    version: boss.version,
  };
}
