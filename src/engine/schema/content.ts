import { z } from 'zod';
import { CURRENCY_IDS } from '@content/currencies/types';

export const currencySchema = z.object({
  id: z.enum(CURRENCY_IDS),
  name: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
  tint: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  category: z.enum(['core', 'keys', 'shards', 'brews', 'tomes', 'materials']),
  topBar: z.boolean(),
  version: z.number().int().positive(),
});

export type ValidationIssue = { path: string; message: string };

/**
 * Validates every content object and its cross-references. `assetKeys` and `i18nKeys` are
 * injected so the engine stays free of asset/i18n imports.
 */
export function validateContentRegistry(
  registry: { currencies: readonly unknown[] },
  refs: { assetKeys: ReadonlySet<string>; i18nKeys: ReadonlySet<string> },
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  registry.currencies.forEach((raw, index) => {
    const parsed = currencySchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) issues.push({ path: `currencies[${index}].${issue.path.join('.')}`, message: issue.message });
      return;
    }
    const def = parsed.data;
    if (seen.has(def.id)) issues.push({ path: `currencies.${def.id}`, message: 'duplicate id' });
    seen.add(def.id);
    if (!refs.assetKeys.has(def.icon)) issues.push({ path: `currencies.${def.id}.icon`, message: `unknown asset key ${def.icon}` });
    for (const key of [def.name, def.description]) {
      if (!refs.i18nKeys.has(key)) issues.push({ path: `currencies.${def.id}`, message: `missing i18n key ${key}` });
    }
  });
  for (const id of CURRENCY_IDS) if (!seen.has(id)) issues.push({ path: `currencies.${id}`, message: 'currency id declared but not defined' });
  return issues;
}
