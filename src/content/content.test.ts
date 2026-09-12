import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { validateContentRegistry } from '@engine/schema/content';
import { I18N_KEYS } from '@i18n/index';
import { content } from './registry';

describe('content registry', () => {
  it('validates against the generated asset manifest and the string table', () => {
    const manifest = JSON.parse(
      readFileSync('public/assets/generated/manifest.json', 'utf8'),
    ) as AssetManifest;
    const issues = validateContentRegistry(content, {
      assetKeys: new Set(Object.keys(manifest.entries)),
      i18nKeys: I18N_KEYS,
    });
    expect(issues).toEqual([]);
    expect(content.currencies).toHaveLength(24);
    expect(content.currencies.filter((c) => c.topBar).map((c) => c.id)).toEqual(['gold', 'gems', 'energy']);
  });
});
