import { describe, expect, it } from 'vitest';
import type { GearInstance } from '@engine/gear/instance';
import { formatGearValue, mainStatLine, pieceIcon, pieceName, setLines, subStatLine } from './gear-view';

const PIECE: GearInstance = {
  instanceId: 'gear-1',
  slot: 'gauntlets',
  setId: 'gear_set.warcry',
  rarity: 'epic',
  stars: 5,
  level: 16,
  mainStat: 'atkPct',
  subs: [
    { stat: 'critRate', value: 12, rolls: 2 },
    { stat: 'hp', value: 480, rolls: 1 },
  ],
  equippedTo: null,
  locked: false,
  acquiredAt: 0,
  source: 'campaign_drop',
};

describe('how a piece reads', () => {
  it('never prints the percent sign twice', () => {
    // The stat's own name carries the "%": "ATK % +45", not "ATK % +45 %".
    expect(formatGearValue('atkPct', 45)).toBe('+45');
    expect(mainStatLine(PIECE)).toBe('ATK % +45');
    // Crit, resistance and accuracy are percentage-shaped but named without a sign.
    expect(formatGearValue('critRate', 12)).toBe('+12 %');
    expect(subStatLine({ stat: 'critRate', value: 12, rolls: 2 })).toBe('C.RATE +12 %');
    // Flat stats keep their thousands separator.
    expect(formatGearValue('hp', 1240)).toBe('+1,240');
  });

  it('names a piece by its set and slot, and wears the set’s crest', () => {
    expect(pieceName(PIECE)).toBe('Warcry Gauntlets');
    expect(pieceIcon(PIECE)).toBe('spell.crest_warmark');
  });

  it('reports how many pieces the next group of a set still needs', () => {
    const [line] = setLines([PIECE]);
    expect(line?.group.set.id).toBe('gear_set.warcry');
    expect(line?.group.groups).toBe(0);
    expect(line?.missing).toBe(1);
  });
});
