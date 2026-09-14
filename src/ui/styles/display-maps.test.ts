import { describe, expect, it } from 'vitest';
import { RARITIES } from '@content/champions/types';
import { RARITY_TINT } from '@render/summon/ritualScene';
import { RARITY_HEX } from './display-maps';

describe('rarity colours', () => {
  it('are the same in CSS and on the Pixi stage', () => {
    // A card's frame and the burst that reveals it must be one colour (UI_DESIGN.md §3).
    for (const rarity of RARITIES)
      expect(RARITY_HEX[rarity]).toBe(`#${RARITY_TINT[rarity].toString(16).padStart(6, '0')}`);
  });

  it('covers every rarity', () => {
    expect(Object.keys(RARITY_HEX).sort()).toEqual([...RARITIES].sort());
  });
});
