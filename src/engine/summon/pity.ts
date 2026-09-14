/**
 * Mercy (docs/design/SUMMONING.md §2). A shard keeps one counter per rarity it can be merciful
 * about: how many pulls since that rarity last came. The counter drives two things — a hard
 * guarantee ("the next pull *is* an Epic") and a soft climb ("+1 pp per pull past 100").
 *
 * The counters live in the save, persist across banners, and are what the portal quotes back to
 * the player, so the same numbers must drive the roll and the label. They do.
 */
import type { PityRule } from '@content/balance/summon';
import type { Rarity } from '@content/champions/types';

/** Pulls since each rarity the shard tracks; a missing key is the same as zero. */
export type PityCounters = Partial<Record<Rarity, number>>;

export function emptyPity(): PityCounters {
  return {};
}

/** Pulls since `rarity` on this shard. */
export function since(counters: PityCounters, rarity: Rarity): number {
  return counters[rarity] ?? 0;
}

/** The rarity a hard guarantee forces on this pull, or null when nothing is owed. */
export function forcedRarity(counters: PityCounters, rules: readonly PityRule[]): Rarity | null {
  for (const rule of rules) {
    if (rule.hard === null) continue;
    if (since(counters, rule.rarity) + 1 >= rule.hard) return rule.rarity;
  }
  return null;
}

/**
 * Percentage points a soft climb adds to a rarity on this pull. `after` is the number of pulls
 * that must have passed *without* the rarity before the climb starts.
 */
export function softBonusPp(counters: PityCounters, rule: PityRule): number {
  if (rule.after === null || rule.stepPp === 0) return 0;
  const past = since(counters, rule.rarity) - rule.after;
  return past > 0 ? past * rule.stepPp : 0;
}

/**
 * The counters after a pull of `rarity`: the rarity that came resets, and everything the shard
 * tracks that is *rarer* also resets — a Legendary is an Epic-or-better, so the Epic mercy has
 * been satisfied too (SUMMONING.md §2).
 */
export function afterPull(
  counters: PityCounters,
  rules: readonly PityRule[],
  rarity: Rarity,
  rank: (rarity: Rarity) => number,
): PityCounters {
  const next: PityCounters = { ...counters };
  for (const rule of rules) {
    next[rule.rarity] = rank(rarity) >= rank(rule.rarity) ? 0 : since(counters, rule.rarity) + 1;
  }
  return next;
}

export interface MercyView {
  rarity: Rarity;
  /** Pulls since it last came. */
  since: number;
  /** Pulls until the hard guarantee, or null when the shard has none. */
  within: number | null;
  /** Percentage points the soft climb is adding right now. */
  bonusPp: number;
}

/** What the portal shows under a shard (SUMMONING.md §2). */
export function mercyView(counters: PityCounters, rules: readonly PityRule[]): MercyView[] {
  return rules.map((rule) => ({
    rarity: rule.rarity,
    since: since(counters, rule.rarity),
    within: rule.hard === null ? null : Math.max(1, rule.hard - since(counters, rule.rarity)),
    bonusPp: softBonusPp(counters, rule),
  }));
}
