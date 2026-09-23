import { t } from '@i18n/index';
import type { TowerFloorView } from '@state/tower';
import { Glyph } from '@ui/components/Glyph/Glyph';
import styles from './KeeperBoard.module.css';

/** A keeper as the board reads it: beaten this season, the next to face, or still above the climb. */
type KeeperState = 'beaten' | 'next' | 'sealed';

export interface KeeperBoardProps {
  floors: readonly TowerFloorView[];
  selected: number;
  onLook: (floor: number) => void;
}

/**
 * The tower's ten keepers at a glance (docs/tech/UI_DESIGN.md §5.13a): each keeper's floor and the
 * shard odds it rolls. The keepers beaten this season are lit and may be fought again, the next
 * one burns, and the rest wait dark above the climb. A press reads that floor in the dossier,
 * however far up the tower it stands.
 */
export function KeeperBoard({ floors, selected, onLook }: KeeperBoardProps) {
  const keepers = floors.filter((floor) => floor.boss);
  const next = keepers.find((floor) => floor.state !== 'repeatable')?.floor ?? null;
  return (
    <section className={styles.board} data-testid="tower-keepers">
      <h3 className={`display ${styles.heading}`}>{t('tower.keepers')}</h3>
      <ol className={styles.grid}>
        {keepers.map((keeper) => {
          const state: KeeperState =
            keeper.state === 'repeatable' ? 'beaten' : keeper.floor === next ? 'next' : 'sealed';
          const pressed = keeper.floor === selected;
          return (
            <li key={keeper.floor}>
              <button
                type="button"
                className={[styles.keeper, styles[state], pressed ? styles.selected : ''].join(' ')}
                aria-pressed={pressed}
                onClick={() => onLook(keeper.floor)}
                data-state={state}
                data-testid={`tower-keeper-${keeper.floor}`}
              >
                <span className={styles.head}>
                  <Glyph
                    glyph={state === 'beaten' ? 'glyph.trophy_cup' : 'glyph.flaming_skull'}
                    size={15}
                    color={
                      state === 'beaten'
                        ? 'var(--gold-3)'
                        : state === 'next'
                          ? 'var(--ember-3)'
                          : 'var(--text-3)'
                    }
                  />
                  <span className={`display ${styles.floor}`}>
                    {t('tower.keeper.floor', { floor: keeper.floor })}
                  </span>
                </span>
                <span className={`num ${styles.odds}`}>
                  {t('tower.keeper.ancient', { ancient: keeper.shards.ancient })}
                </span>
                {keeper.shards.sacred > 0 ? (
                  <span className={`num ${styles.odds} ${styles.sacred}`}>
                    {t('tower.keeper.sacred', { sacred: keeper.shards.sacred })}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
