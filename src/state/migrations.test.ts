import { describe, expect, it } from 'vitest';
import { createNewGame } from '@engine/save/new-game';
import { migrateSave } from './migrations';

describe('migrateSave', () => {
  const save = createNewGame({ name: 'Test', now: 1_700_000_000_000, seedRoot: 's' });

  it('accepts a current save unchanged', () => {
    const result = migrateSave(structuredClone(save));
    expect(result.migrated).toBe(false);
    expect(result.save).toEqual(save);
  });

  it('refuses newer versions and garbage', () => {
    expect(() => migrateSave({ ...save, saveVersion: 99 })).toThrow(/newer/);
    expect(() => migrateSave('nope')).toThrow(/not an object/);
    expect(() => migrateSave({ ...save, wallet: { gold: -1 } })).toThrow(/validation/);
  });

  it('runs migration steps in order', () => {
    const legacy = { ...structuredClone(save), saveVersion: 0, legacyName: 'Old' } as Record<string, unknown>;
    const result = migrateSave(legacy, [
      { from: 0, to: 1, migrate: (raw) => ({ ...raw, saveVersion: 1, profile: { ...(raw['profile'] as object), name: raw['legacyName'] as string } }) },
    ]);
    expect(result.migrated).toBe(true);
    expect(result.save.profile.name).toBe('Old');
  });
});
