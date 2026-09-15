/**
 * The bosses the game knows. Gravemaw is the daily boss (Phase 10); Nyxara, the weekly one, joins
 * in Phase 11 (`docs/design/BOSSES.md` §3).
 */
import gravemaw from './gravemaw';
import type { BossDef, BossTierDef } from './types';

export const BOSSES: readonly BossDef[] = [gravemaw];

export const BOSS_BY_ID: Readonly<Record<string, BossDef>> = Object.fromEntries(
  BOSSES.map((boss) => [boss.id, boss]),
);

/** Every tier's enemy, so `enemyById` resolves a boss fight like any other. */
export const BOSS_ENEMIES = BOSSES.flatMap((boss) => boss.tiers.map((tier) => tier.enemy));

export function bossTier(boss: BossDef, tierId: string): BossTierDef | undefined {
  return boss.tiers.find((tier) => tier.id === tierId);
}
