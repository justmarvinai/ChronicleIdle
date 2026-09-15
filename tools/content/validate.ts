/**
 * Validates every content definition and its cross-references (docs/tech/CONTENT_AUTHORING.md).
 * Exit code 1 on any issue so it can gate CI and `pnpm dev`.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AssetManifest } from '@assets/manifest-types';
import { content } from '@content/registry';
import { validateContentRegistry } from '@engine/schema/content';
import { I18N_KEYS, textOf } from '@i18n/index';

const REPO_ROOT = join(import.meta.dirname, '..', '..');

async function main(): Promise<void> {
  const manifestPath = join(REPO_ROOT, 'public', 'assets', 'generated', 'manifest.json');
  let assetKeys: Set<string>;
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as AssetManifest;
    assetKeys = new Set(Object.keys(manifest.entries));
  } catch {
    console.error('[content] asset manifest missing — run `pnpm assets:build` first.');
    process.exit(1);
  }
  const issues = validateContentRegistry(content, { assetKeys, i18nKeys: I18N_KEYS, i18nText: textOf });
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  for (const issue of warnings) console.warn(`  ! ${issue.path}: ${issue.message}`);
  if (errors.length) {
    for (const issue of errors) console.error(`  ✗ ${issue.path}: ${issue.message}`);
    console.error(`[content] ${errors.length} error(s), ${warnings.length} warning(s).`);
    process.exit(1);
  }
  console.log(
    `[content] OK — ${content.currencies.length} currencies, ${content.champions.length} champions, ` +
      `${content.enemies.length} enemies, ${content.settlements.length} settlements ` +
      `(${content.stages.length} stages), ${content.titles.length} titles and ` +
      `${content.gearSets.length} gear sets, ${content.banners.length} banners, ` +
      `${content.bosses.length} boss(es) over ${content.bosses.reduce((n, b) => n + b.tiers.length, 0)} tiers and ` +
      `${content.summonPool.length} summonable champions validated against ${assetKeys.size} assets and ` +
      `${I18N_KEYS.size} strings (${warnings.length} warning(s)).`,
  );
}

main().catch((error: unknown) => {
  console.error('[content] validation crashed:', error);
  process.exit(1);
});
