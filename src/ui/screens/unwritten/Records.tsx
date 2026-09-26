import { useState } from 'react';
import { playSfx } from '@audio/index';
import type { UnwrittenSave } from '@engine/schema/unwritten-save';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { duration, numeral } from './marks';
import { u, type UnwrittenKey } from './strings';
import { TalePanel } from './TalePanel';
import styles from './Records.module.css';

const RESULT: Readonly<Record<'victory' | 'defeat' | 'abandoned', UnwrittenKey>> = {
  victory: 'unwritten.ui.records.won',
  defeat: 'unwritten.ui.records.lost',
  abandoned: 'unwritten.ui.records.left',
};

/**
 * The Records (UNWRITTEN.md §16): the chronicle's standing in the Unwritten — expeditions, victories,
 * Wardens, the best Omen read and the quickest victory — and the last eight Tales, any of which can
 * be opened again.
 */
export function Records({ unwritten }: { unwritten: UnwrittenSave }) {
  const [open, setOpen] = useState(0);
  const { records, omen, tales } = unwritten;
  const tale = tales[open] ?? null;
  return (
    <div className={styles.records} data-testid="unwritten-records">
      <section className={styles.standing}>
        <h2 className={`display ${styles.title}`}>{u('unwritten.ui.records.title')}</h2>
        <dl className={styles.stats}>
          <div>
            <dt>{u('unwritten.ui.records.expeditions')}</dt>
            <dd className="num">{records.expeditions}</dd>
          </div>
          <div>
            <dt>{u('unwritten.ui.records.victories')}</dt>
            <dd className="num">{records.victories}</dd>
          </div>
          <div>
            <dt>{u('unwritten.ui.records.wardens')}</dt>
            <dd className="num">{records.wardens}</dd>
          </div>
          <div>
            <dt>{u('unwritten.ui.records.best')}</dt>
            <dd className="num">{omen.best === null ? '—' : numeral(omen.best) || '0'}</dd>
          </div>
          <div>
            <dt>{u('unwritten.ui.records.fastest')}</dt>
            <dd className="num">{records.fastestMs === null ? '—' : duration(records.fastestMs)}</dd>
          </div>
          <div>
            <dt>{u('unwritten.ui.records.open')}</dt>
            <dd className="num">{numeral(omen.open) || '0'}</dd>
          </div>
        </dl>
        <h3 className={`display ${styles.subtitle}`}>{u('unwritten.ui.records.tales')}</h3>
        <ScrollArea height="100%" fade className={styles.list ?? ''}>
          {tales.length ? (
            <ol className={styles.tales}>
              {tales.map((entry, index) => (
                <li key={`${entry.startedAt}-${index}`}>
                  <button
                    type="button"
                    className={[styles.row, index === open ? styles.rowOn : '', styles[entry.result]].join(
                      ' ',
                    )}
                    aria-pressed={index === open}
                    onClick={() => {
                      playSfx('ui.tab');
                      setOpen(index);
                    }}
                    data-testid={`unwritten-tale-${index}`}
                  >
                    <Glyph
                      glyph={
                        entry.result === 'victory'
                          ? 'glyph.trophy_cup'
                          : entry.result === 'defeat'
                            ? 'glyph.skull_wreath'
                            : 'glyph.spell_book'
                      }
                      size={26}
                      color={
                        entry.result === 'victory'
                          ? 'var(--gold-3)'
                          : entry.result === 'defeat'
                            ? '#ff8b8b'
                            : '#cbb8ff'
                      }
                    />
                    <span className={styles.rowText}>
                      <span className={styles.rowResult}>{u(RESULT[entry.result])}</span>
                      <span className={styles.rowMeta}>
                        {u('unwritten.ui.records.row', {
                          omen: numeral(entry.omen) || '0',
                          folio: numeral(entry.folio),
                          pages: entry.pages,
                        })}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.empty}>{u('unwritten.ui.records.none')}</p>
          )}
        </ScrollArea>
      </section>
      <div className={styles.page}>{tale ? <TalePanel tale={tale} /> : null}</div>
    </div>
  );
}
