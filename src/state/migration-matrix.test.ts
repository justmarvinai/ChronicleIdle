/**
 * The migration matrix (ROADMAP Phase 15): every save version this game has ever written must
 * still open, and must arrive at the current schema without losing what a player would notice.
 *
 * The per-version tests in `migrations.test.ts` say what each single step *does*. This file says
 * the chain is complete: one fixture per version from 1 to `SAVE_VERSION`, every hop covered by
 * exactly one step, and nothing dropped along the way. It is exhaustive by construction — a
 * version bumped without its fixture fails here rather than going quietly untested.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from '@engine/schema/save';
import { MIGRATIONS, migrateSave } from './migrations';

const DIR = join('tests', 'fixtures', 'saves');

/** Every version a fixture exists for, from the files themselves. */
function fixtureVersions(): number[] {
  return readdirSync(DIR)
    .map((name) => /^v(\d+)\.json$/.exec(name)?.[1])
    .filter((digits): digits is string => digits !== undefined)
    .map(Number)
    .sort((a, b) => a - b);
}

function readFixture(version: number): Record<string, unknown> {
  return JSON.parse(readFileSync(join(DIR, `v${version}.json`), 'utf8')) as Record<string, unknown>;
}

/** The versions the matrix must cover: every one the game has written. */
const VERSIONS = Array.from({ length: SAVE_VERSION }, (_, index) => index + 1);

function record(raw: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = raw[key];
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

describe('the migration chain', () => {
  it('has exactly one step for every hop, each moving one version', () => {
    const froms = MIGRATIONS.map((step) => step.from);
    expect(froms).toEqual([...new Set(froms)]);
    for (const step of MIGRATIONS) expect(step.to).toBe(step.from + 1);
    // Every version below the current one can take a step; the current one is the destination.
    for (let version = 1; version < SAVE_VERSION; version += 1)
      expect(froms, `no migration from v${version}`).toContain(version);
    expect(Math.max(...MIGRATIONS.map((step) => step.to))).toBe(SAVE_VERSION);
  });

  it('has a fixture for every version the game has written, and none from the future', () => {
    expect(fixtureVersions()).toEqual(VERSIONS);
  });
});

describe.each(VERSIONS)('a v%i chronicle', (version) => {
  it('opens at the current schema', () => {
    const result = migrateSave(readFixture(version));
    expect(result.save.saveVersion).toBe(SAVE_VERSION);
    expect(result.fromVersion).toBe(version);
    expect(result.migrated).toBe(version !== SAVE_VERSION);
  });

  it('keeps its identity, its purse and everything it collected', () => {
    const raw = readFixture(version);
    const { save } = migrateSave(raw);

    // Identity: the chronicle is the same chronicle afterwards.
    expect(save.createdAt).toBe(raw['createdAt']);
    expect(save.seedRoot).toBe(raw['seedRoot']);
    expect(save.profile.name).toBe(record(raw, 'profile')['name']);

    // The purse: no currency silently loses its amount.
    const purse: Record<string, number> = { ...save.wallet };
    for (const [currency, amount] of Object.entries(record(raw, 'wallet')))
      expect(purse[currency], `wallet.${currency}`).toBe(amount);

    // The collection: no champion, no piece of gear and no earned star goes missing.
    for (const instanceId of Object.keys(record(raw, 'roster')))
      expect(save.roster, `roster.${instanceId}`).toHaveProperty(instanceId);
    for (const instanceId of Object.keys(record(raw, 'inventory')))
      expect(save.inventory, `inventory.${instanceId}`).toHaveProperty(instanceId);
    for (const [stageKey, stars] of Object.entries(record(record(raw, 'campaign'), 'stars')))
      expect(save.campaign.stars[stageKey], `stars.${stageKey}`).toBe(stars);

    // What it has counted is what the quests and the Path are measured against.
    for (const [key, value] of Object.entries(record(raw, 'stats')))
      expect(save.stats[key], `stats.${key}`).toBe(value);
  });
});
