import type { CSSProperties } from 'react';
import { playSfx } from '@audio/index';
import type { ChapterView } from '@engine/missions/path';
import { t, translate } from '@i18n/index';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { NotificationDot } from '@ui/components/NotificationDot/NotificationDot';
import { kitBorder } from '@ui/styles/kit';
import { chapterShare, chapterState } from './mission-view';
import styles from './ChapterTabs.module.css';

export interface ChapterTabsProps {
  chapters: readonly ChapterView[];
  value: number;
  onChange: (chapter: number) => void;
}

/**
 * The ten chapters across the top of the Path (docs/tech/UI_DESIGN.md §5.15), each saying how far
 * it is walked without being opened: a trophy on a finished one, the ember mark on the one being
 * walked, a shackle on those still to come, and a thin gold bar of its twelve under every one. A
 * chapter whose chest is waiting wears a dot. Every tab opens, even a locked one — the Path is a
 * promise as much as a task list.
 */
export function ChapterTabs({ chapters, value, onChange }: ChapterTabsProps) {
  return (
    <div role="tablist" aria-label={t('missions.chapters')} className={styles.tabs}>
      {chapters.map((view) => {
        const index = view.chapter.index;
        const state = chapterState(view);
        const active = index === value;
        return (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={active}
            className={styles.tab}
            data-state={state}
            data-active={active}
            style={
              {
                ...kitBorder(active ? 'ui.dark_ember.banner_plain' : 'ui.dark_ember.banner_dark', 0.28),
                '--share': chapterShare(view),
              } as CSSProperties
            }
            onMouseEnter={() => playSfx('ui.hover')}
            onClick={() => {
              if (active) return;
              playSfx('ui.tab');
              onChange(index);
            }}
            data-testid={`missions-tab-${index}`}
          >
            <span className={styles.row}>
              <Glyph
                glyph={
                  state === 'done'
                    ? 'glyph.trophy_cup'
                    : state === 'current'
                      ? 'glyph.magic_flame'
                      : 'glyph.broken_shackle'
                }
                size={16}
                className={styles.mark ?? ''}
              />
              <span className={`display ${styles.label}`}>{translate('missions.chapter', { index })}</span>
            </span>
            <span className={styles.bar} aria-hidden="true">
              <span className={styles.fill} />
            </span>
            {view.chestClaimable ? <NotificationDot /> : null}
          </button>
        );
      })}
    </div>
  );
}
