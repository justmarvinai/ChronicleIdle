/**
 * The Summoning Portal as it touches the save (docs/design/SUMMONING.md).
 *
 * The rules are in `@engine/summon/*`; this is the bookkeeping — what the wallet pays, which
 * copies join the roster, what mercy stands at afterwards and what the history remembers. Every
 * press is all-or-nothing: the pulls are rolled and the cost is checked before a single champion
 * is written, so a half-finished summon cannot exist.
 *
 * A duplicate is an ordinary roster copy (owner's answer Q8): nothing is auto-converted, ever.
 */
import type { ChampionChoiceDef } from '@content/balance/campaign';
import {
  MULTI_PULL,
  HISTORY_LIMIT,
  SHARD_CURRENCY,
  SHARD_EXCHANGE,
  type ShardId,
} from '@content/balance/summon';
import type { BannerDef } from '@content/banners/types';
import type { ChampionDef, ChampionId } from '@content/champions/types';
import type { CurrencyAmount } from '@content/currencies/types';
import { content } from '@content/registry';
import {
  cloneInstance,
  createInstance,
  instanceIdFor,
  type ChampionInstance,
} from '@engine/champions/instance';
import { grant, spend, type CurrencyChange } from '@engine/economy/wallet';
import { fail, ok, type Result } from '@engine/errors';
import { choiceById, choicePool, openChoices } from '@engine/summon/choices';
import { mercyView, type MercyView } from '@engine/summon/pity';
import { rotationAt, pityRules, type RotationView } from '@engine/summon/rotation';
import { bestPull, summonMany, type Pull } from '@engine/summon/summon';
import type { Rng } from '@engine/rng/rng';
import type { SaveGame, SummonRecord } from '@engine/schema/save';
import { progressOf } from './campaign';

export interface SummonInput {
  bannerId: string;
  shard: ShardId;
  /** 1 or up to `MULTI_PULL`; the cost is one shard per pull. */
  count: number;
  now: number;
  rng: Rng;
}

export interface SummonedChampion {
  record: SummonRecord;
  /** The copy the pull became. */
  instance: ChampionInstance;
  /** Copies of this champion the chronicle held *before* the pull; 0 means the "NEW" ribbon. */
  copiesBefore: number;
}

export interface SummonSummary {
  shard: ShardId;
  banner: BannerDef;
  rotation: RotationView | null;
  pulls: SummonedChampion[];
  /** The rarest pull — what the reveal saves for last (SUMMONING.md §5.4). */
  best: SummonedChampion;
  changes: CurrencyChange[];
  /** Mercy as it stands after the press, for the portal's counters. */
  mercy: MercyView[];
}

/** Pulls `count` champions: the shards are paid, the copies join the roster, mercy moves on. */
export function applySummon(save: SaveGame, input: SummonInput): Result<SummonSummary> {
  const banner = content.bannerById(input.bannerId);
  if (!banner) return fail('content_invalid', `Unknown banner ${input.bannerId}`);
  if (!banner.shards.includes(input.shard))
    return fail('invalid_argument', `${banner.id} does not take ${input.shard} shards`);
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > MULTI_PULL)
    return fail('invalid_argument', `A press is 1 to ${MULTI_PULL} pulls, not ${input.count}`);

  const rotation = rotationAt(banner, input.now);
  const rules = pityRules(input.shard, rotation?.primordial ?? false);
  const rolled = summonMany(
    {
      shard: input.shard,
      rules,
      counters: save.summon.pity[input.shard],
      pool: content.summonPool,
      ...(rotation ? { featured: rotation.featured } : {}),
    },
    input.count,
    input.rng,
  );
  if (!rolled.ok) return rolled;

  // Resolve every champion before anything is written, so the all-or-nothing promise below is
  // true rather than nearly true.
  const rolls: { pull: Pull; def: ChampionDef }[] = [];
  for (const pull of rolled.value.pulls) {
    const def = content.championById(pull.championId);
    if (!def) return fail('content_invalid', `Unknown champion ${pull.championId}`);
    rolls.push({ pull, def });
  }

  const paid = spend(save.wallet, [{ currency: SHARD_CURRENCY[input.shard], amount: input.count }]);
  if (!paid.ok) return paid;

  // Nothing above touched the save; from here the press is committed.
  save.wallet = paid.value.wallet;
  save.summon.pity[input.shard] = { ...rolled.value.counters };
  const mercy = mercyView(rolled.value.counters, rules);

  const pulls: SummonedChampion[] = [];
  let serial = save.counters.instances;
  for (const { pull, def } of rolls) {
    const copiesBefore = copiesOf(save, pull.championId);
    serial += 1;
    // Only ever hand the draft freshly built objects: a plain clone can be read back safely once
    // the producer has closed, a draft cannot.
    const instance = createInstance(def, {
      instanceId: instanceIdFor(pull.championId, serial),
      now: input.now,
      source: 'summon',
    });
    save.roster[instance.instanceId] = cloneInstance(instance);
    save.summon.unseen.push(instance.instanceId);
    pulls.push({
      record: recordOf(pull, banner.id, input.shard, instance.instanceId, copiesBefore > 0, input.now),
      instance,
      copiesBefore,
    });
  }
  save.counters.instances = serial;

  // Newest first, and a press's own pulls newest first within it.
  save.summon.history = [...pulls.map((p) => p.record).reverse(), ...save.summon.history].slice(
    0,
    HISTORY_LIMIT,
  );

  // Which pull is the best is the engine's rule; the index maps 1:1 onto the copies above.
  const rarest = bestPull(rolled.value.pulls);
  const best = rarest ? pulls[rolled.value.pulls.indexOf(rarest)] : undefined;
  if (!best) return fail('invalid_argument', 'A press pulls at least once');

  bump(save, 'summon.pulls', pulls.length);
  bump(save, `summon.pulls.${input.shard}`, pulls.length);
  for (const pull of pulls) bump(save, `summon.${pull.record.rarity}`, 1);

  return ok({
    shard: input.shard,
    banner,
    rotation,
    pulls,
    best,
    changes: paid.value.changes,
    mercy,
  });
}

export interface ExchangeSummary {
  shard: ShardId;
  count: number;
  paid: CurrencyAmount;
  changes: CurrencyChange[];
}

/** Buys shards at the Exchange (SUMMONING.md §1); a shard that is never sold refuses the press. */
export function applyExchange(
  save: SaveGame,
  input: { shard: ShardId; count: number },
): Result<ExchangeSummary> {
  const offer = SHARD_EXCHANGE[input.shard];
  if (!offer) return fail('invalid_argument', `${input.shard} shards are not sold`);
  if (!Number.isInteger(input.count) || input.count < 1)
    return fail('invalid_argument', `Buy at least one shard, not ${input.count}`);

  const price: CurrencyAmount = { currency: offer.currency, amount: offer.amount * input.count };
  const paid = spend(save.wallet, [price]);
  if (!paid.ok) return paid;
  const granted = grant(paid.value.wallet, [{ currency: SHARD_CURRENCY[input.shard], amount: input.count }]);
  save.wallet = granted.wallet;
  bump(save, 'summon.exchanged', input.count);
  return ok({
    shard: input.shard,
    count: input.count,
    paid: price,
    changes: [...paid.value.changes, ...granted.changes],
  });
}

export interface ChoiceSummary {
  choice: ChampionChoiceDef;
  instance: ChampionInstance;
  copiesBefore: number;
}

/**
 * Takes a champion choice (CAMPAIGN.md §7): the Intro milestone's Epic, picked by name. The
 * entitlement comes from the campaign's stars, so the pick can only be taken once and only for
 * someone the choice actually offers.
 */
export function applyChampionChoice(
  save: SaveGame,
  input: { choiceId: string; championId: ChampionId; now: number },
): Result<ChoiceSummary> {
  const choice = choiceById(input.choiceId);
  if (!choice) return fail('content_invalid', `Unknown champion choice ${input.choiceId}`);
  if (!openChoices(progressOf(save), save.summon.choices).some((open) => open.id === choice.id))
    return fail('invalid_argument', `${choice.id} is not owed`);
  const def = choicePool(content.summonPool, choice.rarity).find((c) => c.id === input.championId);
  if (!def) return fail('invalid_argument', `${input.championId} is not offered by ${choice.id}`);

  const copiesBefore = copiesOf(save, def.id);
  const serial = save.counters.instances + 1;
  const instance = createInstance(def, {
    instanceId: instanceIdFor(def.id, serial),
    now: input.now,
    source: 'campaign_drop',
  });
  save.roster[instance.instanceId] = cloneInstance(instance);
  save.counters.instances = serial;
  save.summon.unseen.push(instance.instanceId);
  save.summon.choices[choice.id] = {
    championId: def.id,
    instanceId: instance.instanceId,
    at: input.now,
  };
  bump(save, 'summon.choices', 1);
  return ok({ choice, instance, copiesBefore });
}

/** Clears the "NEW" badge from copies the player has now looked at. */
export function markChampionsSeen(save: SaveGame, instanceIds: readonly string[]): void {
  if (instanceIds.length === 0 || save.summon.unseen.length === 0) return;
  const seen = new Set(instanceIds);
  save.summon.unseen = save.summon.unseen.filter((id) => !seen.has(id));
}

// ---------------------------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------------------------

/** Mercy lines for a shard on a banner, as the portal quotes them (SUMMONING.md §2). */
export function mercyOf(save: SaveGame, banner: BannerDef, shard: ShardId, now: number): MercyView[] {
  const rotation = rotationAt(banner, now);
  return mercyView(save.summon.pity[shard], pityRules(shard, rotation?.primordial ?? false));
}

/** Copies of a champion in the roster. */
export function copiesOf(save: SaveGame, championId: ChampionId): number {
  return Object.values(save.roster).filter((copy) => copy.defId === championId).length;
}

/** Choices the campaign owes and the chronicle has not taken. */
export function openChampionChoices(save: SaveGame): ChampionChoiceDef[] {
  return openChoices(progressOf(save), save.summon.choices);
}

/** Everyone a choice offers, in content order. */
export function choiceCandidates(choice: ChampionChoiceDef): ChampionDef[] {
  return choicePool(content.summonPool, choice.rarity);
}

function recordOf(
  pull: Pull,
  bannerId: string,
  shard: ShardId,
  instanceId: string,
  duplicate: boolean,
  now: number,
): SummonRecord {
  return {
    at: now,
    shard,
    bannerId,
    championId: pull.championId,
    rarity: pull.rarity,
    instanceId,
    duplicate,
    mercy: pull.mercy,
    featured: pull.featured,
  };
}

function bump(save: SaveGame, key: string, by: number): void {
  if (by <= 0) return;
  save.stats[key] = (save.stats[key] ?? 0) + by;
}
