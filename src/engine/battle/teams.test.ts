import { describe, expect, it } from 'vitest';
import type { Roster } from '@engine/champions/instance';
import { sanitizeTeam, suggestTeam, validateTeam } from './teams';

const roster = {
  'a-1': { instanceId: 'a-1' },
  'b-2': { instanceId: 'b-2' },
  'c-3': { instanceId: 'c-3' },
  'd-4': { instanceId: 'd-4' },
} as unknown as Roster;

describe('teams', () => {
  it('validates ownership, duplicates and size', () => {
    expect(validateTeam(roster, ['a-1', 'b-2', 'c-3'], 3).ok).toBe(true);
    expect(validateTeam(roster, [], 3).ok).toBe(false);
    expect(validateTeam(roster, ['a-1', 'a-1'], 3).ok).toBe(false);
    expect(validateTeam(roster, ['a-1', 'zz-9'], 3).ok).toBe(false);
    expect(validateTeam(roster, ['a-1', 'b-2', 'c-3', 'd-4'], 3).ok).toBe(false);
    expect(validateTeam(roster, ['a-1', 'b-2', 'c-3', 'd-4'], 4).ok).toBe(true);
  });

  it('sanitises presets and suggests the strongest fill', () => {
    expect(sanitizeTeam(roster, ['zz-9', 'a-1', 'a-1', 'b-2', 'c-3', 'd-4'], 3)).toEqual([
      'a-1',
      'b-2',
      'c-3',
    ]);
    const power: Record<string, number> = { 'a-1': 10, 'b-2': 40, 'c-3': 30, 'd-4': 20 };
    expect(suggestTeam(roster, [], 3, (id) => power[id] ?? 0)).toEqual(['b-2', 'c-3', 'd-4']);
    expect(suggestTeam(roster, ['a-1', 'gone-0'], 3, (id) => power[id] ?? 0)).toEqual(['a-1', 'b-2', 'c-3']);
    expect(suggestTeam(roster, ['d-4', 'a-1', 'c-3'], 3, (id) => power[id] ?? 0)).toEqual([
      'd-4',
      'a-1',
      'c-3',
    ]);
  });
});
