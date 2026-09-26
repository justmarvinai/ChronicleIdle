import type { CSSProperties } from 'react';
import { translate } from '@i18n/index';
import { INKS, type PassageKind } from '@content/unwritten/types';
import type { Tale, TaleEntry } from '@engine/schema/unwritten-save';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { duration, INK_COLOUR, INK_NAME, numeral } from './marks';
import { u, type UnwrittenKey } from './strings';
import styles from './TalePanel.module.css';

/** A champion's or a foe's name from its id (the Tale keeps ids, never names). */
const named = (id: string): string => translate(`${id}.name`);

/** How a fall is told: by what felled them. A fight a mystery started is told as such. */
const FELL: Readonly<Partial<Record<PassageKind, UnwrittenKey>>> = {
  skirmish: 'unwritten.ui.tale.fell.skirmish',
  elite: 'unwritten.ui.tale.fell.elite',
  warden: 'unwritten.ui.tale.fell.warden',
};

function entryLine(entry: TaleEntry): string {
  switch (entry.kind) {
    case 'fell':
      return u(FELL[entry.at] ?? 'unwritten.ui.tale.fell.other', { who: named(entry.who) });
    case 'rekindled':
      return u('unwritten.ui.tale.rekindled', { who: named(entry.who) });
    case 'inscribed':
      return u(entry.level > 1 ? 'unwritten.ui.tale.deepened' : 'unwritten.ui.tale.inscribed', {
        name: translate(`unwritten.${entry.id}.name`),
        level: numeral(entry.level),
      });
    case 'relic':
      return u('unwritten.ui.tale.relic', { name: translate(`unwritten.${entry.id}.name`) });
    case 'blot':
      return u('unwritten.ui.tale.blot', { name: translate(`unwritten.${entry.id}.name`) });
    case 'echo':
      return u('unwritten.ui.tale.echo', { who: named(entry.who) });
    case 'illuminated':
      return u(entry.tier > 1 ? 'unwritten.ui.tale.illuminatedFully' : 'unwritten.ui.tale.illuminated', {
        ink: u(INK_NAME[entry.ink]),
      });
    case 'warden':
      return u('unwritten.ui.tale.warden', { name: named(entry.id) });
  }
}

/** The entries a Tale marks in their own colour: a fall in blood, a Warden or a lit ink in gold. */
const ENTRY_CLASS: Readonly<Partial<Record<TaleEntry['kind'], string | undefined>>> = {
  fell: styles.entryFell,
  warden: styles.entryWarden,
  illuminated: styles.entryIlluminated,
  blot: styles.entryBlot,
};

const RESULT_TITLE: Readonly<Record<Tale['result'], UnwrittenKey>> = {
  victory: 'unwritten.ui.tale.victory',
  defeat: 'unwritten.ui.tale.defeat',
  abandoned: 'unwritten.ui.tale.abandoned',
};

/**
 * An expedition's Tale (UNWRITTEN.md §16): how it ended, under which Omen, how far it went, what it
 * brought home — then what happened in it, folio by folio, in the order it happened.
 */
export function TalePanel({ tale, testId = 'unwritten-tale' }: { tale: Tale; testId?: string }) {
  const folios = [...new Set(tale.entries.map((entry) => entry.folio))].sort((a, b) => a - b);
  return (
    <article
      className={[styles.tale, styles[tale.result]].join(' ')}
      data-testid={testId}
      data-result={tale.result}
    >
      <header className={styles.head}>
        <Glyph
          glyph={
            tale.result === 'victory'
              ? 'glyph.trophy_cup'
              : tale.result === 'defeat'
                ? 'glyph.skull_wreath'
                : 'glyph.spell_book'
          }
          size={58}
          color={
            tale.result === 'victory' ? 'var(--gold-3)' : tale.result === 'defeat' ? '#ff8b8b' : '#cbb8ff'
          }
        />
        <div className={styles.headText}>
          <span className={styles.kicker}>
            {u('unwritten.ui.tale.kicker', { omen: numeral(tale.omen) || '0' })}
          </span>
          <h2 className={`display ${styles.title}`}>{u(RESULT_TITLE[tale.result])}</h2>
        </div>
      </header>
      <dl className={styles.facts}>
        <div>
          <dt>{u('unwritten.ui.tale.reached')}</dt>
          <dd className="num">{numeral(tale.folio)}</dd>
        </div>
        <div>
          <dt>{u('unwritten.ui.tale.wardens')}</dt>
          <dd className="num">{tale.wardens}</dd>
        </div>
        <div>
          <dt>{u('unwritten.ui.tale.pages')}</dt>
          <dd className="num">{tale.pages}</dd>
        </div>
        <div>
          <dt>{u('unwritten.ui.tale.relics')}</dt>
          <dd className="num">{tale.relics}</dd>
        </div>
        <div>
          <dt>{u('unwritten.ui.tale.time')}</dt>
          <dd className="num">{duration(tale.endedAt - tale.startedAt)}</dd>
        </div>
      </dl>
      <div className={styles.inks}>
        {INKS.map((ink) => (
          <span key={ink} className={styles.ink} style={{ '--ink': INK_COLOUR[ink] } as CSSProperties}>
            <span className={styles.inkName}>{u(INK_NAME[ink])}</span>
            <span className={`num ${styles.inkCount}`}>{tale.inks[ink] ?? 0}</span>
          </span>
        ))}
      </div>
      <p className={styles.company}>
        {u('unwritten.ui.tale.company', { names: tale.company.map(named).join(', ') })}
      </p>
      <ScrollArea height="100%" fade className={styles.scroll ?? ''}>
        {folios.length ? (
          folios.map((folio) => (
            <section key={folio} className={styles.folio}>
              <h3 className={`display ${styles.folioTitle}`}>
                {u('unwritten.ui.tale.folio', { folio: numeral(folio) })}
              </h3>
              <ul className={styles.entries}>
                {tale.entries
                  .filter((entry) => entry.folio === folio)
                  .map((entry, index) => (
                    <li key={index} className={[styles.entry, ENTRY_CLASS[entry.kind] ?? ''].join(' ')}>
                      {entryLine(entry)}
                    </li>
                  ))}
              </ul>
            </section>
          ))
        ) : (
          <p className={styles.quiet}>{u('unwritten.ui.tale.quiet')}</p>
        )}
      </ScrollArea>
    </article>
  );
}
