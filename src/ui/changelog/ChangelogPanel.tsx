import { useMemo, useState } from 'react';
import type { GlyphKey } from '@assets/manifest.generated';
import { RELEASES } from '@content/changelog/index';
import { CHANGE_KINDS, type ChangeDef, type ChangeKind, type ReleaseDef } from '@content/changelog/types';
import { playSfx } from '@audio/index';
import { t, translate, type I18nKey } from '@i18n/index';
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

/** The chips' plate is the kit's banner drawn thin, so all six and the order toggle share one row. */
const CHIP_KIT_SCALE = 0.17;

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

/**
 * The Chronicle of Changes: what changed in the game, newest first (UI_DESIGN.md §5.21). Loaded by
 * `ChangelogView` together with the releases' words, which the first screen does not carry.
 */
export function ChangelogPanel({ height, testId = 'changelog' }: ChangelogViewProps) {
  const [filter, setFilter] = useState<ChangeFilter>('all');
  const [order, setOrder] = useState<ChangeOrder>('newest');
  const releases = RELEASES;
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
                style={kitBorder(
                  active ? 'ui.dark_ember.banner_plain' : 'ui.dark_ember.banner_dark',
                  CHIP_KIT_SCALE,
                )}
                onMouseEnter={() => playSfx('ui.hover')}
                onClick={() => {
                  if (active) return;
                  playSfx('ui.tab');
                  setFilter(key);
                }}
              >
                <Glyph glyph={filterGlyph(key)} size={14} className={styles.chipGlyph ?? ''} />
                <span className={`display ${styles.chipLabel}`}>{filterLabel(key)}</span>
              </button>
            );
          })}
        </div>
        {/* The order is a flip of the same list, so the toggle is its mark alone, turning over. */}
        <button
          type="button"
          className={styles.order}
          style={kitBorder('ui.dark_ember.banner_dark', CHIP_KIT_SCALE)}
          aria-label={t(order === 'newest' ? 'changelog.newestFirst' : 'changelog.oldestFirst')}
          data-testid={`${testId}-order`}
          data-order={order}
          onMouseEnter={() => playSfx('ui.hover')}
          onClick={() => {
            playSfx('ui.tab');
            setOrder(order === 'newest' ? 'oldest' : 'newest');
          }}
        >
          <Glyph glyph="glyph.hourglass" size={15} className={styles.orderGlyph ?? ''} />
        </button>
      </div>
      <ScrollArea height="100%" className={styles.list}>
        {views.length === 0 ? <p className={styles.empty}>{t('changelog.empty')}</p> : null}
        {views.map((view) => (
          <Release
            key={view.release.id}
            release={view.release}
            changes={view.changes}
            latest={view.latest}
            grouped={filter === 'all'}
          />
        ))}
      </ScrollArea>
    </div>
  );
}

/**
 * One release: its version, its name, the day it shipped, and the lines it brought — grouped under
 * one heading per kind, in the order the chips list them, so the kind is said once rather than on
 * every line. With a chip picked the list is one kind already, so the heading is left out too.
 */
function Release({
  release,
  changes,
  latest,
  grouped,
}: {
  release: ReleaseDef;
  changes: readonly ChangeDef[];
  latest: boolean;
  grouped: boolean;
}) {
  const groups = CHANGE_KINDS.flatMap((kind) => {
    const lines = changes.filter((change) => change.kind === kind);
    return lines.length === 0 ? [] : [{ kind, lines }];
  });
  return (
    <section className={styles.release} data-release={release.release}>
      <header className={styles.head}>
        <span className={`num ${styles.version}`}>{release.release}</span>
        <h3 className={`display ${styles.name}`}>{translate(release.name)}</h3>
        {latest ? <span className={`display ${styles.latest}`}>{t('changelog.latest')}</span> : null}
        <span className={`num ${styles.date}`}>{readableDate(release.date)}</span>
      </header>
      {groups.map(({ kind, lines }) => (
        <div key={kind} className={[styles.group, KIND_STYLE[kind].tint ?? ''].join(' ')} data-group={kind}>
          {grouped ? (
            <div className={styles.groupHead}>
              <Glyph glyph={KIND_STYLE[kind].glyph} size={16} className={styles.groupGlyph ?? ''} />
              <span className={`display ${styles.groupLabel}`}>{t(`changelog.kind.${kind}` as I18nKey)}</span>
            </div>
          ) : null}
          <ul className={styles.lines}>
            {lines.map((change) => (
              <Line key={change.text} change={change} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/** One line: a bullet in its kind's colour and the sentence — brighter when it is a headline. */
function Line({ change }: { change: ChangeDef }) {
  return (
    <li className={[styles.line, change.highlight ? styles.lead : ''].join(' ')} data-kind={change.kind}>
      <span className={styles.bullet} aria-hidden="true" />
      <span className={styles.text}>{translate(change.text)}</span>
    </li>
  );
}
