import { describe, expect, it } from 'vitest';
import { compareReleases, releaseSchema } from '@engine/schema/changelog';
import { validateContentRegistry } from '@engine/schema/content';
import { ALL_I18N_KEYS } from '@i18n/catalog';
import { content } from '@content/registry';
import { CHANGE_KINDS, type ReleaseDef } from './types';
import { LATEST_RELEASE, RELEASES } from './index';

/** The registry's own shape, with the releases swapped for whatever a case is testing. */
const registryWith = (releases: readonly unknown[]): Parameters<typeof validateContentRegistry>[0] => ({
  ...content,
  releases,
});
const refs = { assetKeys: new Set<string>(), i18nKeys: ALL_I18N_KEYS };
const releaseErrors = (releases: readonly unknown[]): string[] =>
  validateContentRegistry(registryWith(releases), refs)
    .filter((i) => i.severity === 'error' && i.path.startsWith('releases'))
    .map((i) => i.message);

describe('the Chronicle of Changes', () => {
  it('reads newest first, and the newest is the one the panel badges', () => {
    expect(RELEASES.length).toBeGreaterThan(20);
    expect(LATEST_RELEASE).toBe(RELEASES[0]);
    for (let i = 1; i < RELEASES.length; i += 1) {
      const newer = RELEASES[i - 1]?.release ?? '';
      const older = RELEASES[i]?.release ?? '';
      expect(compareReleases(newer, older), `${newer} must come before ${older}`).toBeGreaterThan(0);
    }
  });

  it('keys every line, and every key has English behind it', () => {
    for (const release of RELEASES) {
      expect(releaseSchema.safeParse(release).success, release.id).toBe(true);
      expect(release.id).toBe(`release.${release.release.replace(/\./g, '_')}`);
      expect(ALL_I18N_KEYS.has(release.name), release.name).toBe(true);
      expect(release.changes.length, release.id).toBeGreaterThan(0);
      for (const change of release.changes) {
        expect(ALL_I18N_KEYS.has(change.text), change.text).toBe(true);
        expect(CHANGE_KINDS).toContain(change.kind);
      }
      // A release where everything leads has nothing leading.
      const leads = release.changes.filter((c) => c.highlight).length;
      expect(leads, release.id).toBeLessThan(Math.max(2, release.changes.length));
    }
  });

  it('orders `0.0.9.1` after `0.0.9` and `0.4.10` after `0.4.2`', () => {
    expect(compareReleases('0.0.9.1', '0.0.9')).toBeGreaterThan(0);
    expect(compareReleases('0.4.10', '0.4.2')).toBeGreaterThan(0);
    expect(compareReleases('0.4.2', '0.4.2')).toBe(0);
  });

  describe('the validator', () => {
    const good: ReleaseDef = {
      id: 'release.9_9_9',
      name: 'changelog.title',
      release: '9.9.9',
      date: '2026-01-01',
      changes: [{ kind: 'added', text: 'changelog.latest', highlight: true }],
      version: 1,
    };

    it('accepts a well-formed release', () => {
      expect(releaseErrors([good])).toEqual([]);
    });

    it('refuses a line with no string behind it', () => {
      const changes = [{ kind: 'added' as const, text: 'release.9_9_9.nope', highlight: false }];
      expect(releaseErrors([{ ...good, changes }])).toContain('missing i18n key release.9_9_9.nope');
    });

    it('refuses a list that is not newest first', () => {
      const older = { ...good, id: 'release.9_9_8', release: '9.9.8' };
      expect(releaseErrors([older, good])).toContain('out of order: 9.9.9 must come before 9.9.8');
      expect(releaseErrors([good, older])).toEqual([]);
    });

    it('refuses an id that does not match its version', () => {
      expect(releaseErrors([{ ...good, id: 'release.9_9_8' }])).toContain('id does not match version 9.9.9');
    });
  });
});
