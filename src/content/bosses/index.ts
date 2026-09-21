/**
 * The bosses the game knows: Gargoyle every day, Titan every week
 * (`docs/design/BOSSES.md` §2–§3).
 */
import gargoyle from './gargoyle';
import titan from './titan';
import type { BossDef, BossTierDef } from './types';

export const BOSSES: readonly BossDef[] = [gargoyle, titan];

export const BOSS_BY_ID: Readonly<Record<string, BossDef>> = Object.fromEntries(
  BOSSES.map((boss) => [boss.id, boss]),
);

/**
 * Every tier's enemy and escort, so `enemyById` resolves a boss fight like any other — a wave
 * names its units by id, and a phased boss's Choristers are units like the rest (BOSSES.md §3).
 */
export const BOSS_ENEMIES = BOSSES.flatMap((boss) =>
  boss.tiers.flatMap((tier) => (tier.adds ? [tier.enemy, tier.adds] : [tier.enemy])),
);

export function bossTier(boss: BossDef, tierId: string): BossTierDef | undefined {
  return boss.tiers.find((tier) => tier.id === tierId);
}
