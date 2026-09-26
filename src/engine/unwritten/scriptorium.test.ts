import { describe, expect, it } from 'vitest';
import { START_GILT } from '@content/balance/unwritten';
import { emptyUnwritten } from '@engine/schema/unwritten-save';
import { UNWRITTEN_WORLD } from '@state/unwritten/world';
import { begin, setup } from './expedition.test-support';
import { SHELF_KEY, folioState, shelfOpen, writeFolio } from './scriptorium';

const world = UNWRITTEN_WORLD;
const shelf = (n: number) => world.content.scriptorium.filter((def) => def.shelf === n);

describe('the Scriptorium (UNWRITTEN.md §15)', () => {
  it('spends Pages on a folio, and its rules hold from the next expedition', () => {
    const unwritten = emptyUnwritten();
    unwritten.pages = 100;
    const written = writeFolio({ unwritten, world }, 'scriptorium.deeper_purse');
    expect(written.ok && written.value.counters).toEqual({
      'unwritten.scriptorium': 1,
      'unwritten.pagesSpent': 80,
    });
    expect(unwritten.pages).toBe(20);
    expect(unwritten.scriptorium).toEqual(['scriptorium.deeper_purse']);
    // Never twice, never on credit.
    expect(writeFolio({ unwritten, world }, 'scriptorium.deeper_purse').ok).toBe(false);
    const short = writeFolio({ unwritten, world }, 'scriptorium.field_dressing');
    expect(!short.ok && short.error.code).toBe('insufficient_currency');
    const { ctx } = setup(unwritten);
    expect(begin(ctx).gilt).toBe(START_GILT + 30);
  });

  it('opens a shelf once two folios of the one below are written', () => {
    const unwritten = emptyUnwritten();
    unwritten.pages = 10_000;
    const [upper] = shelf(2);
    if (!upper) throw new Error('no second shelf');
    expect(shelfOpen(unwritten, 2, world)).toBe(false);
    expect(folioState(unwritten, upper, world)).toBe('locked');
    expect(writeFolio({ unwritten, world }, upper.id).ok).toBe(false);
    for (const def of shelf(1).slice(0, SHELF_KEY))
      expect(writeFolio({ unwritten, world }, def.id).ok).toBe(true);
    expect(shelfOpen(unwritten, 2, world)).toBe(true);
    expect(folioState(unwritten, upper, world)).toBe('open');
    expect(writeFolio({ unwritten, world }, upper.id).ok).toBe(true);
  });

  it('is closed while an expedition is under way', () => {
    const { ctx } = setup();
    ctx.unwritten.pages = 500;
    begin(ctx);
    const closed = writeFolio(ctx, 'scriptorium.deeper_purse');
    expect(!closed.ok && closed.error.code).toBe('locked');
    expect(ctx.unwritten.pages).toBe(500);
  });
});
