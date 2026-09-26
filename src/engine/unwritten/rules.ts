/**
 * The rules layer (docs/design/UNWRITTEN.md §7–§15): the Unwritten's own numbers, bent by every
 * source that bends them. Each rule starts at its base and combines its sources the way
 * `RULE_MODE` says — most add up, a few take the lowest or the highest — so an expedition's rules
 * are one fold over its Omens, its Scriptorium, its relics, its blots and its inscriptions.
 */
import { RULE_BASE, RULE_MODE } from '@content/balance/unwritten';
import type { RuleEffect, RuleId } from '@content/unwritten/types';
import type { Expedition, UnwrittenSave } from '@engine/schema/unwritten-save';
import type { UnwrittenWorld } from './world';

export type Rules = Readonly<Record<RuleId, number>>;

/** Folds rule effects onto the bases. */
export function combineRules(effects: Iterable<RuleEffect>): Rules {
  const rules: Record<RuleId, number> = { ...RULE_BASE };
  for (const { rule, value } of effects) {
    const mode = RULE_MODE[rule];
    rules[rule] =
      mode === 'min'
        ? Math.min(rules[rule], value)
        : mode === 'max'
          ? Math.max(rules[rule], value)
          : rules[rule] + value;
  }
  return rules;
}

/** What the Omens up to `omen` and the Scriptorium written say, before an expedition holds anything. */
export function* groundRules(
  unwritten: Pick<UnwrittenSave, 'scriptorium'>,
  omen: number,
  world: UnwrittenWorld,
): Generator<RuleEffect> {
  for (const def of world.content.omens) if (def.omen <= omen) yield* def.rules;
  for (const id of unwritten.scriptorium) {
    const def = world.content.scriptorium.find((folio) => folio.id === id);
    if (def) yield* def.rules;
  }
}

/** Every rule source an expedition carries: the ground under it, then what it holds. */
export function* heldRules(run: Expedition, world: UnwrittenWorld): Generator<RuleEffect> {
  const { content } = world;
  for (const id of run.relics) yield* content.relics.find((r) => r.id === id)?.grant.rules ?? [];
  for (const id of run.blots) yield* content.blots.find((b) => b.id === id)?.grant.rules ?? [];
  for (const held of run.inscriptions) {
    const def = content.inscriptions.find((i) => i.id === held.id);
    yield* def?.levels[held.level - 1]?.grant.rules ?? [];
  }
}

/** The rules an expedition is played under right now. */
export function expeditionRules(
  unwritten: Pick<UnwrittenSave, 'scriptorium'>,
  run: Expedition,
  world: UnwrittenWorld,
): Rules {
  return combineRules([...groundRules(unwritten, run.omen, world), ...heldRules(run, world)]);
}
