/**
 * Writing into an expedition: an inscription (new, or its next level), a relic, a blot. Each is
 * set down in the Tale and counted for the Hall of Deeds, and writing an inscription watches the
 * inks for the moment one illuminates.
 */
import { INSCRIPTION_LEVELS } from '@content/balance/unwritten';
import { INKS } from '@content/unwritten/types';
import type { Expedition } from '@engine/schema/unwritten-save';
import { bump, type UnwrittenReceipt } from './context';
import type { Rules } from './rules';
import { illuminationTiers } from './shaping';
import type { UnwrittenWorld } from './world';

/** Writes `id` at `level` (never past the last), or its next level when no level is named. */
export function writeInscription(
  run: Expedition,
  id: string,
  receipt: UnwrittenReceipt,
  world: UnwrittenWorld,
  rules: () => Rules,
  level?: number,
): void {
  const before = illuminationTiers(run, rules(), world);
  const held = run.inscriptions.find((h) => h.id === id);
  const next = Math.min(INSCRIPTION_LEVELS, level ?? (held ? held.level + 1 : 1));
  if (held) {
    if (held.level >= next) return;
    held.level = next;
  } else run.inscriptions.push({ id, level: next });
  run.tale.push({ kind: 'inscribed', folio: run.folio, id, level: next });
  bump(receipt, 'unwritten.inscriptions');
  const after = illuminationTiers(run, rules(), world);
  for (const ink of INKS) {
    const tier = after[ink];
    if (tier > before[ink]) {
      receipt.illuminated.push({ ink, tier });
      run.tale.push({ kind: 'illuminated', folio: run.folio, ink, tier });
    }
  }
}

/** A held inscription gains a level; false if it cannot. */
export function deepenInscription(
  run: Expedition,
  id: string,
  receipt: UnwrittenReceipt,
  world: UnwrittenWorld,
  rules: () => Rules,
): boolean {
  const held = run.inscriptions.find((h) => h.id === id);
  if (!held || held.level >= INSCRIPTION_LEVELS) return false;
  writeInscription(run, id, receipt, world, rules, held.level + 1);
  return true;
}

export function addRelic(run: Expedition, id: string, receipt: UnwrittenReceipt): void {
  if (run.relics.includes(id)) return;
  run.relics.push(id);
  run.tale.push({ kind: 'relic', folio: run.folio, id });
  bump(receipt, 'unwritten.relics');
}

export function addBlot(run: Expedition, id: string): void {
  if (run.blots.includes(id)) return;
  run.blots.push(id);
  run.tale.push({ kind: 'blot', folio: run.folio, id });
}
