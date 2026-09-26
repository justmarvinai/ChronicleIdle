import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { SHELF_KEY } from '@engine/unwritten/index';
import { numeral } from './marks';
import { line, u } from './strings';
import type { ShelfView } from './unwritten-view';

const FOLIO_CLASS: Readonly<Record<ShelfView['folios'][number]['state'], string | undefined>> = {
  written: styles.folioWritten,
  open: styles.folioOpen,
  short: styles.folioShort,
  locked: styles.folioLocked,
};
import styles from './Scriptorium.module.css';

export interface ScriptoriumProps {
  shelves: ShelfView[];
  pages: number;
  /** An expedition is under way: the Scriptorium's candles are out until it ends. */
  closed: boolean;
  onWrite: (id: string) => void;
}

/**
 * The Scriptorium (UNWRITTEN.md §15): four shelves of folios Recovered Pages are written into, each
 * changing every expedition after. A shelf opens once two of the shelf below are written; nothing
 * written is ever lost.
 */
export function Scriptorium({ shelves, pages, closed, onWrite }: ScriptoriumProps) {
  return (
    <section className={styles.scriptorium} data-testid="unwritten-scriptorium">
      <header className={styles.head}>
        <div>
          <h2 className={`display ${styles.title}`}>{u('unwritten.ui.scriptorium.title')}</h2>
          <p className={styles.sub}>{u('unwritten.ui.scriptorium.sub')}</p>
        </div>
        <span className={styles.pages} data-testid="unwritten-pages">
          <Glyph glyph="glyph.burning_scroll" size={30} color="#cbb8ff" />
          <span className={`num ${styles.pagesValue}`}>{pages}</span>
          <span className={styles.pagesLabel}>{u('unwritten.ui.scriptorium.pages')}</span>
        </span>
      </header>
      {closed ? <p className={styles.closed}>{u('unwritten.ui.scriptorium.closed')}</p> : null}
      <ScrollArea height="100%" fade className={styles.scroll ?? ''}>
        <div className={styles.shelves}>
          {shelves.map((shelf) => (
            <section
              key={shelf.shelf}
              className={[styles.shelf, shelf.open ? '' : styles.shelfShut].join(' ')}
              data-testid={`unwritten-shelf-${shelf.shelf}`}
            >
              <header className={styles.shelfHead}>
                <span className={`display ${styles.shelfName}`}>
                  {u('unwritten.ui.scriptorium.shelf', { shelf: numeral(shelf.shelf) })}
                </span>
                {shelf.open ? null : (
                  <span className={styles.shelfLock}>
                    {u('unwritten.ui.scriptorium.opensAfter', {
                      count: SHELF_KEY,
                      shelf: numeral(shelf.shelf - 1),
                    })}
                  </span>
                )}
              </header>
              <div className={styles.folios}>
                {shelf.folios.map(({ def, state }) => (
                  <article
                    key={def.id}
                    className={[styles.folio, FOLIO_CLASS[state]].join(' ')}
                    data-testid={`unwritten-folio-${def.id}`}
                    data-state={state}
                  >
                    <Glyph
                      glyph={def.icon}
                      size={42}
                      color={state === 'written' ? 'var(--gold-3)' : '#cbb8ff'}
                    />
                    <span className={`display ${styles.folioName}`}>{line(def.name, {})}</span>
                    <span className={styles.folioLine}>{line(def.text, def.show)}</span>
                    {state === 'written' ? (
                      <span className={styles.written}>{u('unwritten.ui.scriptorium.written')}</span>
                    ) : (
                      <Button
                        size="sm"
                        variant={state === 'open' ? 'primary' : 'secondary'}
                        disabled={closed || state !== 'open'}
                        onClick={() => onWrite(def.id)}
                        data-testid={`unwritten-write-${def.id}`}
                        icon={<Glyph glyph="glyph.burning_scroll" size={18} color="currentColor" />}
                      >
                        {def.cost}
                      </Button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </ScrollArea>
    </section>
  );
}
