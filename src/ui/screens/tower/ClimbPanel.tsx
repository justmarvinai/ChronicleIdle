import type { CSSProperties } from 'react';
import { imageUrl } from '@assets/manifest';
import { TOWER_FLOORS } from '@content/balance/tower';
import { formatDuration } from '@engine/time/clock';
import { t } from '@i18n/index';
import { selectActions } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { TowerView } from '@state/tower';
import { Button } from '@ui/components/Button/Button';
import { Panel } from '@ui/components/Frame/Panel';
import { KeeperBoard } from './KeeperBoard';
import styles from './ClimbPanel.module.css';

/** The climb's ring, in stage pixels: its size, and the width of its track. */
const RING = 148;
const RING_STROKE = 12;

export interface ClimbPanelProps {
  view: TowerView;
  /** The floor the dossier is reading, which the keepers' board marks when it is a keeper's. */
  selected: number;
  onLook: (floor: number) => void;
}

/**
 * The season at a glance (docs/tech/UI_DESIGN.md §5.13a): how far this season's climb has come as a
 * ring, with the season's number, its clock and the best ever beside it; the keys as keys, one lit
 * per key held; and the tower's ten keepers, each a press away in the dossier.
 */
export function ClimbPanel({ view, selected, onLook }: ClimbPanelProps) {
  const actions = useGameStore(selectActions);
  const radius = (RING - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const climbed = Math.min(1, view.highestFloor / TOWER_FLOORS);
  const best = Math.min(1, view.bestFloor / TOWER_FLOORS);
  const held = Math.floor(view.keys);
  const keyUrl = imageUrl('ui.stone_vine.icon_key');
  return (
    <aside className={styles.side} data-testid="tower-standing">
      <Panel kind="ember-tall" padding={20} className={styles.panel} contentClassName={styles.body}>
        <h2 className={`display ${styles.heading}`}>{t('tower.standing')}</h2>
        <p className={styles.blurb}>{t('tower.blurb')}</p>

        <div className={styles.season}>
          <div className={styles.ring} style={{ width: RING, height: RING }}>
            <svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`} aria-hidden="true">
              <circle
                className={styles.track}
                cx={RING / 2}
                cy={RING / 2}
                r={radius}
                strokeWidth={RING_STROKE}
              />
              <circle
                className={styles.fill}
                cx={RING / 2}
                cy={RING / 2}
                r={radius}
                strokeWidth={RING_STROKE}
                strokeDasharray={`${climbed * circumference} ${circumference}`}
              />
              {/* The best ever, as a notch on the ring where this season has yet to reach. */}
              {best > 0 ? (
                <circle
                  className={styles.best}
                  cx={RING / 2 + radius * Math.sin(best * 2 * Math.PI)}
                  cy={RING / 2 - radius * Math.cos(best * 2 * Math.PI)}
                  r={RING_STROKE / 2 + 1}
                />
              ) : null}
            </svg>
            <span className={styles.ringText} data-testid="tower-climb">
              <span className={`num ${styles.ringFloor}`}>{view.highestFloor}</span>{' '}
              <span className={styles.ringOf}>{t('tower.climb.of', { of: TOWER_FLOORS })}</span>
            </span>
          </div>
          <dl className={styles.rows}>
            <div>
              <dt>{t('tower.season')}</dt>
              <dd className="num" data-testid="tower-season">
                {view.season === 0 ? t('tower.season.none') : t('tower.season.n', { n: view.season })}
              </dd>
            </div>
            <div>
              <dt>{t('tower.resets')}</dt>
              <dd className="num" data-testid="tower-resets">
                {view.msToSeasonEnd === null ? '—' : formatDuration(view.msToSeasonEnd)}
              </dd>
            </div>
            <div>
              <dt>{t('tower.best')}</dt>
              <dd className="num" data-testid="tower-best">
                {view.bestFloor}
              </dd>
            </div>
          </dl>
        </div>
        {view.next === null ? (
          <p className={styles.topped} data-testid="tower-topped">
            {t('tower.topped')}
          </p>
        ) : null}

        <section className={styles.keys} data-testid="tower-keys">
          <div className={styles.keysHead}>
            <h3 className={`display ${styles.subheading}`}>{t('tower.keys')}</h3>
            <span className={`num ${styles.keyCount}`} data-over={view.keys > view.keyCap}>
              {t('tower.keys.held', { held, cap: view.keyCap })}
            </span>
          </div>
          <ol className={styles.keyRow} aria-label={t('tower.keys.bar', { held, cap: view.keyCap })}>
            {Array.from({ length: view.keyCap }, (_, index) => (
              <li
                key={index}
                className={index < held ? styles.keyOn : styles.keyOff}
                style={{ backgroundImage: `url("${keyUrl}")` } as CSSProperties}
              />
            ))}
          </ol>
          <div className={styles.keysFoot}>
            <span className={`num ${styles.keyNext}`} data-testid="tower-key-next">
              {view.msToKey === null
                ? t('tower.keys.full')
                : t('tower.keys.next', { time: formatDuration(view.msToKey) })}
            </span>
            {/* The gem refill lives in the Wallet, with the price and what a key is worth. */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => actions.openDialog({ name: 'wallet', currency: 'key_eternal' })}
              data-testid="tower-keys-buy"
            >
              {t('tower.keys.buy')}
            </Button>
          </div>
        </section>

        <KeeperBoard floors={view.floors} selected={selected} onLook={onLook} />
      </Panel>
    </aside>
  );
}
