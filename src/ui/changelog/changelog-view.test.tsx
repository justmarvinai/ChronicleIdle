import { readFileSync } from 'node:fs';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setManifestForTests } from '@assets/manifest';
import type { AssetManifest } from '@assets/manifest-types';
import type { ReleaseDef } from '@content/changelog/types';
import { content } from '@content/registry';
import { ChangelogView } from './ChangelogView';
import { kindCounts, releaseViews } from './changelog-view';

vi.mock('@audio/index', () => ({ playSfx: () => undefined, playMusic: () => undefined }));

setManifestForTests(
  JSON.parse(readFileSync('public/assets/generated/manifest.json', 'utf8')) as AssetManifest,
);

const line = (kind: ReleaseDef['changes'][number]['kind'], text: string, highlight = false) => ({
  kind,
  text,
  highlight,
});
const release = (version: string, changes: ReleaseDef['changes']): ReleaseDef => ({
  id: `release.${version.replace(/\./g, '_')}`,
  name: `release.${version.replace(/\./g, '_')}.name`,
  release: version,
  date: '2026-09-20',
  changes,
  version: 1,
});

const NEWEST = release('0.2.0', [line('added', 'a1', true), line('fixed', 'a2')]);
const MIDDLE = release('0.1.0', [line('fixed', 'b1')]);
const OLDEST = release('0.0.1', [line('added', 'c1')]);
const RELEASES = [NEWEST, MIDDLE, OLDEST];

describe('what the chronicle shows', () => {
  it('drops the releases a filter empties, and keeps the newest marked', () => {
    const views = releaseViews(RELEASES, 'added', 'newest');
    expect(views.map((v) => v.release.release)).toEqual(['0.2.0', '0.0.1']);
    expect(views.map((v) => v.changes.length)).toEqual([1, 1]);
    expect(views.map((v) => v.latest)).toEqual([true, false]);
  });

  it('reverses rather than sorts, and the newest stays the newest either way', () => {
    const views = releaseViews(RELEASES, 'all', 'oldest');
    expect(views.map((v) => v.release.release)).toEqual(['0.0.1', '0.1.0', '0.2.0']);
    expect(views.at(-1)?.latest).toBe(true);
  });

  it('counts every line once, and everything counts all of them', () => {
    expect(kindCounts(RELEASES)).toEqual({
      all: 4,
      added: 2,
      content: 0,
      changed: 0,
      balance: 0,
      fixed: 2,
    });
  });
});

describe('the Chronicle of Changes panel', () => {
  it('opens on everything, newest first, with the newest release badged', async () => {
    render(<ChangelogView height={400} />);
    const sections = document.querySelectorAll('[data-release]');
    expect(sections.length).toBe(content.releases.length);
    expect(sections[0]?.getAttribute('data-release')).toBe(content.releases[0]?.release);
    expect(within(sections[0] as HTMLElement).getByText('Latest')).toBeInTheDocument();
    expect(screen.getByTestId('changelog-filter-all')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('changelog-order')).toHaveAttribute('data-order', 'newest');
  });

  it('filters to one kind, and every line left is of that kind', async () => {
    render(<ChangelogView height={400} />);
    await userEvent.click(screen.getByTestId('changelog-filter-fixed'));
    const kinds = [...document.querySelectorAll('li[data-kind]')].map((li) => li.getAttribute('data-kind'));
    expect(kinds.length).toBeGreaterThan(0);
    expect([...new Set(kinds)]).toEqual(['fixed']);
    expect(screen.getByTestId('changelog-filter-fixed')).toHaveAttribute('aria-selected', 'true');
  });

  it('flips the order without losing a release', async () => {
    render(<ChangelogView height={400} />);
    const first = () => document.querySelector('[data-release]')?.getAttribute('data-release');
    const newest = first();
    await userEvent.click(screen.getByTestId('changelog-order'));
    expect(screen.getByTestId('changelog-order')).toHaveAttribute('data-order', 'oldest');
    expect(first()).toBe(content.releases.at(-1)?.release);
    expect(document.querySelectorAll('[data-release]').length).toBe(content.releases.length);
    await userEvent.click(screen.getByTestId('changelog-order'));
    expect(first()).toBe(newest);
  });

  it('only asks the stylesheet for classes the bundler will hand it', () => {
    const tsx = readFileSync('src/ui/changelog/ChangelogView.tsx', 'utf8');
    const css = readFileSync('src/ui/changelog/ChangelogView.module.css', 'utf8');
    const asked = [...tsx.matchAll(/\bstyles\.(\w+)/g)].flatMap((m) => (m[1] ? [m[1]] : []));
    expect(asked.length).toBeGreaterThan(10);
    for (const name of new Set(asked)) {
      // `localsConvention: 'camelCaseOnly'` (vite.config.ts): anything else resolves to nothing.
      expect(name, `${name} is not camelCase`).toMatch(/^[a-z][A-Za-z0-9]*$/);
      expect(new RegExp(`\\.${name}\\b`).test(css), `.${name} is missing from the stylesheet`).toBe(true);
    }
  });
});
