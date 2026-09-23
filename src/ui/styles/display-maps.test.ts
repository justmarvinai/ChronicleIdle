import { describe, expect, it } from 'vitest';
import { RARITIES, STAT_IDS, type StatId } from '@content/champions/types';
import { PALACE_NODES } from '@content/palace/index';
import { SHARD_IDS } from '@content/balance/summon';
import { SHARD_CRYSTALS } from '@render/summon/crystal';
import { RARITY_TINT } from '@render/summon/ritualScene';
import { NODE_GLYPH } from '@ui/screens/palace/palace-icons';
import { RARITY_HEX, SHARD_HEX, STAT_GLYPH } from './display-maps';

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

describe('shard colours', () => {
  it('are the light the gate draws inside each crystal', () => {
    // The rail card, the nameplate and the card backs glow with the crystal hanging in the ring.
    for (const shard of SHARD_IDS)
      expect(SHARD_HEX[shard]).toBe(`#${SHARD_CRYSTALS[shard].light.toString(16).padStart(6, '0')}`);
  });
});

describe('stat marks', () => {
  it('are the Palace’s marks for the nodes that grant each stat', () => {
    // A node that grants one stat and nothing else is that stat's node; its mark is the stat's.
    const isStat = (key: string): key is StatId => (STAT_IDS as readonly string[]).includes(key);
    const seen = new Set<StatId>();
    for (const node of PALACE_NODES) {
      const stats = Object.keys(node.grants).filter(isStat);
      const [only] = stats;
      if (stats.length !== 1 || !only) continue;
      expect(NODE_GLYPH[node.name], node.name).toBe(STAT_GLYPH[only]);
      seen.add(only);
    }
    // Every stat has such a node, so the table above is checked end to end.
    expect([...seen].sort()).toEqual([...STAT_IDS].sort());
  });
});
