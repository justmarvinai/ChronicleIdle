/** Zod schema for the Chronicle of Changes (docs/tech/CONTENT_AUTHORING.md §13). */
import { z } from 'zod';
import { CHANGE_KINDS } from '@content/changelog/types';

export const changeSchema = z.object({
  kind: z.enum(CHANGE_KINDS),
  text: z.string().min(1),
  highlight: z.boolean(),
});

export const releaseSchema = z.object({
  id: z.string().regex(/^release\.[0-9_]+$/),
  name: z.string().min(1),
  /** `0.4.2`, or `0.0.9.1` for a patch that shipped inside a phase. */
  release: z.string().regex(/^\d+(\.\d+){2,3}$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  changes: z.array(changeSchema).min(1),
  version: z.number().int().positive(),
});

/**
 * Orders two version strings the way a person reads them: `0.4.10` is newer than `0.4.2`, and
 * `0.0.9.1` is newer than `0.0.9`. Returns a positive number when `a` is the newer of the two.
 */
export function compareReleases(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
