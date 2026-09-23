/**
 * What the Portal reads off the summon tables (docs/tech/UI_DESIGN.md §5.12): the range each shard
 * can answer with, the chance bars, and mercy as a walk towards its promise.
 */
import { describe, expect, it } from 'vitest';
import { chanceBar, mercyBars, shardRange } from './portal-view';

describe('the Portal’s view of the summon tables', () => {
  it('names what each shard can answer with, least first', () => {
    expect(shardRange('faded')).toEqual(['common', 'uncommon', 'rare']);
    expect(shardRange('ancient')).toEqual(['rare', 'epic', 'legendary']);
    expect(shardRange('sacred')).toEqual(['epic', 'legendary']);
    expect(shardRange('primordial')).toEqual(['epic', 'legendary', 'mythic']);
  });

  it('draws a 1 % chance as a mark you can see, and keeps the order of the chances', () => {
    expect(chanceBar(100)).toBe(1);
    expect(chanceBar(0)).toBe(0);
    expect(chanceBar(1)).toBeCloseTo(0.1);
    expect(chanceBar(8)).toBeGreaterThan(chanceBar(1));
    expect(chanceBar(91)).toBeGreaterThan(chanceBar(8));
  });

  it('shows mercy as the share of the promise already walked', () => {
    const [epic, legendary] = mercyBars([
      { rarity: 'epic', since: 5, within: 15, bonusPp: 0 },
      { rarity: 'legendary', since: 130, within: 70, bonusPp: 30 },
    ]);
    expect(epic?.fill).toBeCloseTo(0.25);
    expect(epic?.sentence).toContain('15');
    expect(epic?.climbing).toBeNull();
    expect(legendary?.fill).toBeCloseTo(0.65);
    expect(legendary?.climbing).toContain('30');
    // A rule with no hard promise is a count, not a bar.
    expect(mercyBars([{ rarity: 'mythic', since: 7, within: null, bonusPp: 0 }])[0]?.fill).toBeNull();
  });
});
