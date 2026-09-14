import { useMemo } from 'react';
import { content } from '@content/registry';
import { playSfx } from '@audio/index';
import { t, translate } from '@i18n/index';
import { selectActions, selectSave, selectWornTitle } from '@state/selectors';
import { titlesOf } from '@state/progression';
import { useGameStore } from '@state/store';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { Glyph } from '@ui/components/Glyph/Glyph';
import styles from './TitlePickerDialog.module.css';

/** Every title, earned or not: what the chronicle has been called, and what it could be called. */
export function TitlePickerDialog() {
  const actions = useGameStore(selectActions);
  // The picker is opened from the profile, so both exits go back to it rather than to the game.
  const back = (): void => actions.openDialog({ name: 'profile' });
  const save = useGameStore(selectSave);
  const worn = useGameStore(selectWornTitle);
  const earned = useMemo(() => new Set(save ? titlesOf(save) : []), [save]);

  const choose = (id: string | null): void => {
    if (!actions.setTitle(id).ok) return;
    playSfx('ui.confirm');
    back();
  };

  return (
    <Dialog title={t('profile.worn')} onClose={back} width={820} testId="dialog-title-picker">
      <p className={styles.hint}>
        {t('profile.titles.earnedCount', { earned: earned.size, total: content.titles.length })}
      </p>
      <ul className={styles.list}>
        <li>
          <button
            type="button"
            className={[styles.entry, worn === null ? styles.selected : ''].join(' ')}
            aria-pressed={worn === null}
            data-testid="title-none"
            onMouseEnter={() => playSfx('ui.hover')}
            onClick={() => choose(null)}
          >
            <Glyph glyph="glyph.hourglass" size={28} color="var(--text-3)" />
            <span className={styles.text}>
              <strong className="display">{t('profile.worn.none')}</strong>
            </span>
          </button>
        </li>
        {content.titles.map((def) => {
          const has = earned.has(def.id);
          return (
            <li key={def.id}>
              <button
                type="button"
                className={[
                  styles.entry,
                  worn === def.id ? styles.selected : '',
                  has ? '' : styles.locked,
                ].join(' ')}
                aria-pressed={worn === def.id}
                disabled={!has}
                data-testid={`title-${def.id}`}
                onMouseEnter={() => has && playSfx('ui.hover')}
                onClick={() => choose(def.id)}
              >
                <Glyph
                  glyph={has ? 'glyph.trophy_cup' : 'glyph.broken_shackle'}
                  size={28}
                  color={has ? 'var(--gold-3)' : 'var(--text-3)'}
                />
                <span className={styles.text}>
                  <strong className="display">{translate(def.name)}</strong>
                  <em>{translate(def.description)}</em>
                </span>
                {has ? null : <span className={styles.lockTag}>{t('profile.titles.locked')}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
