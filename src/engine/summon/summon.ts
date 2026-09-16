/**
 * One pull (docs/design/SUMMONING.md §1–§3).
 *
 * A pull is two rolls: a rarity, then a champion of it. The rarity comes from the shard's table
 * with mercy applied — a hard guarantee replaces the roll outright, a soft climb bends it — and
 * the champion from everyone summonable of that rarity, with a featured champion weighted twice.
 *
 * Every roll goes through the injected `Rng`, so a pull replays exactly from its seed and the
 * 100k-roll rate test is a real test rather than a sampling of the machine's mood.
 */
import { RARITIES, type ChampionDef, type ChampionId, type Rarity } from '@content/champions/types';
import { FEATURED_WEIGHT, SHARD_RATES, type PityRule, type ShardId } from '@content/balance/summon';
import { fail, ok, type Result } from '@engine/errors';
import type { Rng } from '@engine/rng/rng';
import { afterPull, forcedRarity, softBonusPp, type PityCounters } from './pity';

const RARITY_RANK: Readonly<Record<Rarity, number>> = Object.fromEntries(
  RARITIES.map((rarity, index) => [rarity, index]),
) as Record<Rarity, number>;

/** How rare a rarity is, so "Legendary satisfies the Epic mercy" is one comparison. */
export const rarityRank = (rarity: Rarity): number => RARITY_RANK[rarity];

export interface SummonInput {
  shard: ShardId;
  /** The shard's mercy rules, already adjusted for a Primordial Rotation (`rotation.ts`). */
  rules: readonly PityRule[];
  counters: PityCounters;
  /** Champions this shard may answer with; the caller reads them from content. */
  pool: readonly ChampionDef[];
  /** Featured ids get `FEATURED_WEIGHT` inside their own rarity bucket. */
  featured?: readonly ChampionId[];
  /**
   * A rarity the pull may not fall below, whatever the dice say — the scripted first summon of the
   * tutorial (`TUTORIAL.md` 3.2), which teaches what a colour means and so cannot be left to them.
   * The roll is still taken, so the stream advances exactly as it would without the floor.
   */
  floor?: Rarity;
}

export interface Pull {
  championId: ChampionId;
  rarity: Rarity;
  /** True when mercy, not the dice, decided the rarity. */
  mercy: boolean;
  /** True when this champion was one of the rotation's featured. */
  featured: boolean;
}

export interface SummonResult {
  pull: Pull;
  /** The shard's counters after the pull. */
  counters: PityCounters;
}

/**
 * The rarity table for a pull: the shard's percentages, plus whatever the soft climb adds. The
 * climb is taken out of the commonest rarity on the table, so the row still sums to 100 and the
 * shard cannot quietly become more generous overall than the doc says.
 */
export function rarityWeights(
  shard: ShardId,
  rules: readonly PityRule[],
  counters: PityCounters,
): { item: Rarity; weight: number }[] {
  const table = { ...SHARD_RATES[shard] } as Partial<Record<Rarity, number>>;
  const rarities = Object.keys(table) as Rarity[];
  const commonest = rarities.reduce((a, b) => (rarityRank(a) <= rarityRank(b) ? a : b));
  for (const rule of rules) {
    const bonus = softBonusPp(counters, rule);
    if (bonus <= 0 || table[rule.rarity] === undefined || rule.rarity === commonest) continue;
    const take = Math.min(bonus, table[commonest] ?? 0);
    table[rule.rarity] = (table[rule.rarity] ?? 0) + take;
    table[commonest] = (table[commonest] ?? 0) - take;
  }
  return rarities.map((rarity) => ({ item: rarity, weight: Math.max(0, table[rarity] ?? 0) }));
}

/** Everyone of a rarity in the pool, with the rotation's featured weighted twice. */
export function championWeights(
  pool: readonly ChampionDef[],
  rarity: Rarity,
  featured: readonly ChampionId[] = [],
): { item: ChampionId; weight: number }[] {
  return pool
    .filter((def) => def.rarity === rarity)
    .map((def) => ({
      item: def.id,
      weight: featured.includes(def.id) ? FEATURED_WEIGHT : 1,
    }));
}

/** One pull, with its mercy bookkeeping. */
export function summonOne(input: SummonInput, rng: Rng): Result<SummonResult> {
  const forced = forcedRarity(input.counters, input.rules);
  const weights = rarityWeights(input.shard, input.rules, input.counters);
  if (weights.every((entry) => entry.weight <= 0))
    return fail('content_invalid', `${input.shard} has no rates`);
  // A guarantee replaces the roll, but the roll is still taken: the stream must advance the same
  // way whether mercy fired or not, or a replay of the same seed would diverge.
  const rolled = rng.weighted(weights);
  const guaranteed = forced ?? rolled;
  const floored = input.floor && rarityRank(input.floor) > rarityRank(guaranteed) ? input.floor : guaranteed;
  const rarity = floored;

  const candidates = championWeights(input.pool, rarity, input.featured);
  if (candidates.length === 0) return fail('content_invalid', `No summonable champion of rarity ${rarity}`);
  const championId = rng.weighted(candidates);

  return ok({
    pull: {
      championId,
      rarity,
      mercy: forced !== null,
      featured: (input.featured ?? []).includes(championId),
    },
    counters: afterPull(input.counters, input.rules, rarity, rarityRank),
  });
}

/**
 * `count` pulls in order, each seeing the counters the last one left — so a ×10 can trip its own
 * mercy halfway through, exactly as ten single pulls would.
 */
export function summonMany(
  input: SummonInput,
  count: number,
  rng: Rng,
): Result<{
  pulls: Pull[];
  counters: PityCounters;
}> {
  const pulls: Pull[] = [];
  let counters = input.counters;
  for (let i = 0; i < Math.max(0, count); i += 1) {
    const result = summonOne({ ...input, counters }, rng);
    if (!result.ok) return result;
    pulls.push(result.value.pull);
    counters = result.value.counters;
  }
  return ok({ pulls, counters });
}

/** The best pull of a batch — what the reveal saves for last and the toast names. */
export function bestPull(pulls: readonly Pull[]): Pull | null {
  return pulls.reduce<Pull | null>(
    (best, pull) => (best === null || rarityRank(pull.rarity) > rarityRank(best.rarity) ? pull : best),
    null,
  );
}
