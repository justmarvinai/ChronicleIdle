import { useMemo, useState } from 'react';
import type { GlyphKey } from '@assets/manifest.generated';
import { content } from '@content/registry';
import type { ChangeDef, ChangeKind, ReleaseDef } from '@content/changelog/types';
import { playSfx } from '@audio/index';
import { t, type I18nKey } from '@i18n/index';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { kitBorder } from '@ui/styles/kit';
import {
  CHANGE_FILTERS,
  kindCounts,
  releaseViews,
  type ChangeFilter,
  type ChangeOrder,
} from './changelog-view';
import styles from './ChangelogView.module.css';

/**
 * How each kind of line is drawn: the glyph that opens it and the class that tints it. The five
 * kinds are the five things a release can be, and a reader picks one off the chips above the list.
 */
const KIND_STYLE: Record<ChangeKind, { glyph: GlyphKey; tint: string | undefined }> = {
  added: { glyph: 'glyph.shooting_stars', tint: styles.kindAdded },
  content: { glyph: 'glyph.spell_book', tint: styles.kindContent },
  changed: { glyph: 'glyph.spirit_vortex', tint: styles.kindChanged },
  balance: { glyph: 'glyph.crossed_swords', tint: styles.kindBalance },
  fixed: { glyph: 'glyph.hammer_hit', tint: styles.kindFixed },
};

/** The everything chip has no kind of its own, so it wears the chronicle's own mark. */
const ALL_GLYPH: GlyphKey = 'glyph.burning_scroll';

const filterGlyph = (filter: ChangeFilter): GlyphKey =>
  filter === 'all' ? ALL_GLYPH : KIND_STYLE[filter].glyph;
const filterTint = (filter: ChangeFilter): string | undefined =>
  filter === 'all' ? styles.kindAll : KIND_STYLE[filter].tint;
const filterLabel = (filter: ChangeFilter): string =>
  filter === 'all' ? t('changelog.all') : t(`changelog.kind.${filter}` as I18nKey);

/** `2026-09-20` as a reader writes it. Dates are display only; nothing is computed from them. */
function readableDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export interface ChangelogViewProps {
  /**
   * Height of the whole view, chips included — the list takes what is left of it and scrolls.
   * `100%` inside a frame that is already the right size; a number inside a dialog, which is not.
   */
  height: number | string;
  /** Prefix for the test ids, so the title screen and the dialog can be told apart. */
  testId?: string;
}

/** The Chronicle of Changes: what changed in the game, newest first (UI_DESIGN.md §5.21). */
export function ChangelogView({ height, testId = 'changelog' }: ChangelogViewProps) {
  const [filter, setFilter] = useState<ChangeFilter>('all');
  const [order, setOrder] = useState<ChangeOrder>('newest');
  const releases = content.releases;
  const counts = useMemo(() => kindCounts(releases), [releases]);
  const views = useMemo(() => releaseViews(releases, filter, order), [releases, filter, order]);

  return (
    <div className={styles.root} style={{ height }} data-testid={testId}>
      <div className={styles.controls}>
        <div className={styles.chips} role="tablist" aria-label={t('changelog.title')}>
          {CHANGE_FILTERS.map((key) => {
            const active = key === filter;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={counts[key] === 0}
                data-testid={`${testId}-filter-${key}`}
                className={[styles.chip, filterTint(key) ?? '', active ? styles.chipOn : ''].join(' ')}
                style={kitBorder(active ? 'ui.dark_ember.banner_plain' : 'ui.dark_ember.banner_dark', 0.28)}
                onMouseEnter={() => playSfx('ui.hover')}
                onClick={() => {
                  if (active) return;
                  playSfx('ui.tab');
                  setFilter(key);
                }}
              >
                <Glyph glyph={filterGlyph(key)} size={15} className={styles.chipGlyph ?? ''} />
                <span className={`display ${styles.chipLabel}`}>{filterLabel(key)}</span>
                <span className={`num ${styles.chipCount}`}>{counts[key]}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={styles.order}
          style={kitBorder('ui.dark_ember.banner_dark', 0.28)}
          data-testid={`${testId}-order`}
          data-order={order}
          onMouseEnter={() => playSfx('ui.hover')}
          onClick={() => {
            playSfx('ui.tab');
            setOrder(order === 'newest' ? 'oldest' : 'newest');
          }}
        >
          <Glyph glyph="glyph.hourglass" size={14} className={styles.orderGlyph ?? ''} />
          <span className={`display ${styles.orderLabel}`}>
            {t(order === 'newest' ? 'changelog.newestFirst' : 'changelog.oldestFirst')}
          </span>
        </button>
      </div>
      <ScrollArea height="100%" className={styles.list}>
        {views.length === 0 ? <p className={styles.empty}>{t('changelog.empty')}</p> : null}
        {views.map((view) => (
          <Release key={view.release.id} release={view.release} changes={view.changes} latest={view.latest} />
        ))}
      </ScrollArea>
    </div>
  );
}

/** One release: its version, its name, the day it shipped, and the lines it brought. */
function Release({
  release,
  changes,
  latest,
}: {
  release: ReleaseDef;
  changes: readonly ChangeDef[];
  latest: boolean;
}) {
  return (
    <section className={styles.release} data-release={release.release}>
      <header className={styles.head}>
        <span className={`num ${styles.version}`}>{release.release}</span>
        <h3 className={`display ${styles.name}`}>{t(release.name as I18nKey)}</h3>
        {latest ? <span className={`display ${styles.latest}`}>{t('changelog.latest')}</span> : null}
        <span className={`num ${styles.date}`}>{readableDate(release.date)}</span>
      </header>
      <ul className={styles.lines}>
        {changes.map((change) => (
          <Line key={change.text} change={change} />
        ))}
      </ul>
    </section>
  );
}

/** One line: its kind's icon and tag, then the sentence — brighter when it is a headline. */
function Line({ change }: { change: ChangeDef }) {
  const kind = KIND_STYLE[change.kind];
  return (
    <li
      className={[styles.line, kind.tint ?? '', change.highlight ? styles.lead : ''].join(' ')}
      data-kind={change.kind}
    >
      <Glyph glyph={kind.glyph} size={18} className={styles.lineGlyph ?? ''} />
      <span className={styles.lineBody}>
        <span className={`display ${styles.tag}`}>{t(`changelog.kind.${change.kind}` as I18nKey)}</span>
        <span className={styles.text}>{t(change.text as I18nKey)}</span>
      </span>
    </li>
  );
}
