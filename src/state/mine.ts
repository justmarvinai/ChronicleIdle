/**
 * The Mine as it touches the save (docs/design/MINE.md).
 *
 * The rules are in `@engine/mine`; this is the bookkeeping — what the store holds at this instant,
 * what a collection pays into the wallet, and what digging a level deeper takes out of it. The
 * save keeps the level, one timestamp and two fractions; everything the hub and the dialog show is
 * derived from those here.
 */
import type { MineLevelDef } from '@content/balance/mine';
import type { CurrencyId } from '@content/currencies/types';
import { grant, spend, type CurrencyChange } from '@engine/economy/wallet';
import { fail, ok, type Result } from '@engine/errors';
import {
  collectMine,
  mineGain,
  mineLevel,
  mineStore,
  mineUpgradeBlock,
  nextMineLevel,
  settleMine,
  type MineHaul,
  type MineStore,
  type MineUpgradeBlock,
} from '@engine/mine/index';
import { bumpCounter } from '@engine/progression/counters';
import { isFeatureUnlocked, unlockLevel } from '@engine/progression/unlocks';
import type { SaveGame } from '@engine/schema/save';

/** One line of the next level's price, against what the wallet holds. */
export interface MineCostLine {
  currency: CurrencyId;
  amount: number;
  owned: number;
  /** How much is still missing; 0 when the wallet covers it. */
  short: number;
}

export interface MineView {
  unlocked: boolean;
  /** The chronicle level the Mine opens at. */
  opensAt: number;
  level: MineLevelDef;
  store: MineStore;
  /** The level below this one, or `null` at the deepest. */
  next: MineLevelDef | null;
  /** What the next level adds over this one. */
  gain: ReturnType<typeof mineGain>;
  cost: MineCostLine[];
  /** Why the next level cannot be dug yet, or `null` when it can. */
  block: MineUpgradeBlock | null;
}

/** The Mine as the hub and the dialog show it. */
export function mineView(save: SaveGame, now: number): MineView {
  const next = nextMineLevel(save.mine.level);
  const owned = (currency: CurrencyId): number => save.wallet[currency] ?? 0;
  return {
    unlocked: isFeatureUnlocked('mine', save.profile.level),
    opensAt: unlockLevel('mine'),
    level: mineLevel(save.mine.level),
    store: mineStore(save.mine, now),
    next,
    gain: mineGain(save.mine.level),
    cost: (next?.cost ?? []).map(({ currency, amount }) => ({
      currency,
      amount,
      owned: owned(currency),
      short: Math.max(0, amount - owned(currency)),
    })),
    block: mineUpgradeBlock(save.mine.level, save.profile.level, owned),
  };
}

export interface MineCollectSummary {
  gems: number;
  sigils: number;
  changes: CurrencyChange[];
  /** True when the store had filled — the "the crews stopped" line. */
  wasFull: boolean;
}

/** Pays a haul into the wallet and the lifetime counters. */
function bank(save: SaveGame, haul: MineHaul): CurrencyChange[] {
  const granted = grant(save.wallet, haul.paid);
  save.wallet = granted.wallet;
  save.mine = haul.mine;
  bumpCounter(save, 'mine.gems', haul.gems);
  bumpCounter(save, 'mine.sigils', haul.sigils);
  return granted.changes;
}

/** Empties the store into the wallet. Refused before level 6 and while nothing in it is whole. */
export function applyMineCollect(save: SaveGame, now: number): Result<MineCollectSummary> {
  if (!isFeatureUnlocked('mine', save.profile.level))
    return fail('locked', `The Mine opens at level ${unlockLevel('mine')}`);
  const collected = collectMine(save.mine, now);
  if (!collected.ok) return collected;
  const haul = collected.value;
  const changes = bank(save, haul);
  bumpCounter(save, 'mine.collections');
  return ok({ gems: haul.gems, sigils: haul.sigils, changes, wasFull: haul.wasFull });
}

export interface MineUpgradeSummary {
  /** The level the Mine now stands at. */
  level: number;
  /** The price paid, then what the old level's store paid on the way down. */
  changes: CurrencyChange[];
  /** What settling the old store paid, so the dialog can say so. */
  collected: { gems: number; sigils: number };
}

/**
 * Digs the Mine one level deeper. The store is settled at the old rate first (MINE.md §1), so an
 * upgrade never re-prices time already worked, and the new level starts digging from `now`.
 */
export function applyMineUpgrade(save: SaveGame, now: number): Result<MineUpgradeSummary> {
  if (!isFeatureUnlocked('mine', save.profile.level))
    return fail('locked', `The Mine opens at level ${unlockLevel('mine')}`);
  const next = nextMineLevel(save.mine.level);
  const block = mineUpgradeBlock(
    save.mine.level,
    save.profile.level,
    (currency) => save.wallet[currency] ?? 0,
  );
  if (block?.reason === 'max' || !next) return fail('invalid_argument', 'The Mine is as deep as it goes');
  if (block?.reason === 'level')
    return fail('locked', `Mine level ${next.level} opens at chronicle level ${block.opensAt}`);

  const paid = spend(save.wallet, next.cost);
  if (!paid.ok) return paid;
  save.wallet = paid.value.wallet;

  const haul = settleMine(save.mine, now);
  const changes = [...paid.value.changes, ...bank(save, haul)];
  save.mine = { ...save.mine, level: next.level };
  bumpCounter(save, 'mine.upgrades');
  return ok({ level: next.level, changes, collected: { gems: haul.gems, sigils: haul.sigils } });
}
