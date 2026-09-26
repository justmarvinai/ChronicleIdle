/**
 * The Unwritten through the store (docs/design/UNWRITTEN.md, ADR-050).
 *
 * Loaded with the mode's screen, never with the first one. Every command runs one engine step on a
 * plain copy of the slice inside the store's `transact`, then commits the copy, pays what the
 * receipt pays into the wallet and bumps what it counts. The engine never writes into an immer
 * draft, so nothing it hands back — the Tale an ending writes, above all — can be revoked under
 * the screen that shows it.
 */
import { current } from 'immer';
import type { BattleOutcome } from '@engine/battle/types';
import type { CurrencyChange } from '@engine/economy/wallet';
import { fail, ok, type Result } from '@engine/errors';
import { bumpCounter, type CounterKey } from '@engine/progression/counters';
import { isFeatureUnlocked, unlockLevel } from '@engine/progression/unlocks';
import type { SaveGame } from '@engine/schema/save';
import {
  abandonExpedition,
  beginExpedition,
  chooseEcho,
  chooseMystery,
  chooseOffer,
  chooseRelic,
  enterPassage,
  planFight,
  rerollOffer,
  settleFight,
  usePeddler,
  useRekindleToken,
  useShrine,
  writeFolio,
  type FightPlan,
  type PeddlerAction,
  type ShrineAction,
  type UnwrittenCtx,
  type UnwrittenReceipt,
} from '@engine/unwritten/index';
import { payCurrencies } from '@state/payout';
import { gameActions, gameEvents, useGameStore } from '@state/store';
import { unwrittenWeekKey } from '@state/unwritten-glance';
import { UNWRITTEN_WORLD } from './world';

/** What a committed step hands the screen: the engine's receipt, and what it moved in the wallet. */
export interface UnwrittenStep {
  receipt: UnwrittenReceipt;
  changes: CurrencyChange[];
}

/** A context to read from: the committed save, never written into. */
export function readCtx(save: SaveGame, now: number): UnwrittenCtx {
  return {
    unwritten: save.unwritten,
    world: UNWRITTEN_WORLD,
    roster: save.roster,
    now,
    weekKey: unwrittenWeekKey(now),
  };
}

/** Runs one engine step against a plain copy of the slice and commits it with what it paid. */
function commit(step: (ctx: UnwrittenCtx) => Result<UnwrittenReceipt>): Result<UnwrittenStep> {
  const result = gameActions().transact<UnwrittenStep>((save, now) => {
    // A deep, writable copy: `current` alone hands back the frozen base for untouched subtrees.
    const unwritten = structuredClone(current(save.unwritten));
    const done = step({
      unwritten,
      world: UNWRITTEN_WORLD,
      roster: current(save.roster),
      now,
      weekKey: unwrittenWeekKey(now),
    });
    if (!done.ok) return done;
    save.unwritten = unwritten;
    const changes = done.value.paid.length ? payCurrencies(save, done.value.paid, now) : [];
    for (const [key, by] of Object.entries(done.value.counters))
      if (by) bumpCounter(save, key as CounterKey, by);
    // The Omens won are a maximum, like the tower's best floor: the ladder's highest rung won, + 1.
    if (unwritten.omen.best !== null)
      save.stats['unwritten.omens'] = Math.max(save.stats['unwritten.omens'] ?? 0, unwritten.omen.best + 1);
    return ok({ receipt: done.value, changes });
  });
  if (result.ok && result.value.changes.length)
    gameEvents.emit({ type: 'currency.changed', changes: result.value.changes, reason: 'unwritten' });
  return result;
}

export const unwrittenCommands = {
  /** Sets out: an Omen that is open, and one to the company's cap of the roster. */
  begin(omen: number, company: readonly string[]): Result<UnwrittenStep> {
    const save = useGameStore.getState().save;
    if (save && !isFeatureUnlocked('unwritten', save.profile.level))
      return fail('locked', `The Unwritten opens at level ${unlockLevel('unwritten')}`);
    const seedRoot = save?.seedRoot ?? 'unwritten';
    return commit((ctx) => beginExpedition(ctx, { omen, company, seedRoot }));
  },
  enter(passageId: string): Result<UnwrittenStep> {
    return commit((ctx) => enterPassage(ctx, passageId));
  },
  /** Writes the offer's card at `index`, or leaves the offer unwritten for its gilt (`null`). */
  chooseOffer(index: number | null): Result<UnwrittenStep> {
    return commit((ctx) => chooseOffer(ctx, index));
  },
  reroll(): Result<UnwrittenStep> {
    return commit((ctx) => rerollOffer(ctx));
  },
  chooseRelic(index: number): Result<UnwrittenStep> {
    return commit((ctx) => chooseRelic(ctx, index));
  },
  shrine(action: ShrineAction): Result<UnwrittenStep> {
    return commit((ctx) => useShrine(ctx, action));
  },
  peddler(action: PeddlerAction): Result<UnwrittenStep> {
    return commit((ctx) => usePeddler(ctx, action));
  },
  /** Takes the Echo at `index` into the company, or its gilt instead (`null`). */
  chooseEcho(index: number | null): Result<UnwrittenStep> {
    return commit((ctx) => chooseEcho(ctx, index));
  },
  chooseMystery(index: number): Result<UnwrittenStep> {
    return commit((ctx) => chooseMystery(ctx, index));
  },
  rekindle(member: string): Result<UnwrittenStep> {
    return commit((ctx) => useRekindleToken(ctx, member));
  },
  abandon(): Result<UnwrittenStep> {
    return commit((ctx) => abandonExpedition(ctx));
  },
  writeFolio(id: string): Result<UnwrittenStep> {
    return commit((ctx) => writeFolio(ctx, id));
  },
  /** Banks a finished fight of the passage in hand: wounds on both sides, and a victory's spoils. */
  settle(outcome: BattleOutcome): Result<UnwrittenStep> {
    return commit((ctx) => settleFight(ctx, outcome));
  },
};

/**
 * What the passage in hand's battle is started from, with these members sent in. A read: the plan
 * closes over the committed (frozen) save, which is safe to hold for as long as the fight lasts.
 */
export function planUnwrittenFight(fielded: readonly string[], now: number): Result<FightPlan> {
  const save = useGameStore.getState().save;
  if (!save) return fail('invalid_argument', 'No chronicle loaded');
  return planFight(readCtx(save, now), fielded);
}
