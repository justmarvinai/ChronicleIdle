/**
 * The Scriptorium (docs/design/UNWRITTEN.md §15): where Recovered Pages are written into folios
 * that change every expedition after. A shelf opens once two folios of the shelf below are
 * written; nothing is ever unwritten or refunded.
 *
 * Closed while an expedition is under way: a run is played under the rules it set out with, and a
 * folio read at the door (gilt, rerolls, tokens) could not reach one already walking.
 */
import type { ScriptoriumDef } from '@content/unwritten/types';
import { fail, ok, type Result } from '@engine/errors';
import type { UnwrittenSave } from '@engine/schema/unwritten-save';
import { bump, emptyReceipt, type UnwrittenReceipt } from './context';
import type { UnwrittenWorld } from './world';

/** Folios of the shelf below a shelf that must be written before it opens. */
export const SHELF_KEY = 2;

/** Whether a shelf of the Scriptorium is open to write in. */
export function shelfOpen(
  unwritten: Pick<UnwrittenSave, 'scriptorium'>,
  shelf: number,
  world: UnwrittenWorld,
): boolean {
  if (shelf <= 1) return true;
  const below = world.content.scriptorium.filter(
    (def) => def.shelf === shelf - 1 && unwritten.scriptorium.includes(def.id),
  );
  return below.length >= SHELF_KEY;
}

export type FolioState = 'written' | 'open' | 'short' | 'locked';

/** Where a folio stands: written, affordable, open but out of reach, or behind a closed shelf. */
export function folioState(
  unwritten: Pick<UnwrittenSave, 'scriptorium' | 'pages'>,
  def: ScriptoriumDef,
  world: UnwrittenWorld,
): FolioState {
  if (unwritten.scriptorium.includes(def.id)) return 'written';
  if (!shelfOpen(unwritten, def.shelf, world)) return 'locked';
  return unwritten.pages >= def.cost ? 'open' : 'short';
}

/** Writes a folio: its Pages are spent and its rules hold from the next expedition on. */
export function writeFolio(
  ctx: { unwritten: UnwrittenSave; world: UnwrittenWorld },
  id: string,
): Result<UnwrittenReceipt> {
  const { unwritten, world } = ctx;
  if (unwritten.run) return fail('locked', 'The Scriptorium is closed while an expedition is under way');
  const def = world.content.scriptorium.find((folio) => folio.id === id);
  if (!def) return fail('invalid_argument', `No folio ${id}`);
  const state = folioState(unwritten, def, world);
  if (state === 'written') return fail('invalid_argument', `${id} is already written`);
  if (state === 'locked') return fail('locked', `Shelf ${def.shelf} is not open yet`);
  if (state === 'short') return fail('insufficient_currency', `${id} needs ${def.cost} Pages`);
  unwritten.pages -= def.cost;
  unwritten.scriptorium.push(def.id);
  const receipt = emptyReceipt();
  bump(receipt, 'unwritten.scriptorium');
  bump(receipt, 'unwritten.pagesSpent', def.cost);
  return ok(receipt);
}
