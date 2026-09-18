import { useEffect, useMemo, useRef } from 'react';
import { playSfx } from '@audio/index';
import { TOWER_FLOORS } from '@content/balance/tower';
import { content } from '@content/registry';
import { formatDuration } from '@engine/time/clock';
import { towerEncounterId } from '@engine/tower/encounter';
import { t, translate } from '@i18n/index';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { Route } from '@state/ui-types';
import { towerView, type TowerFloorView } from '@state/tower';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useNow } from '@ui/hooks/useNow';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import styles from './TowerScreen.module.css';

type TowerRoute = Extract<Route, { name: 'tower' }>;

/**
 * The Eternal Tower (docs/tech/UI_DESIGN.md §5.16): the climb on the right as a ladder of floors,
 * the season and the keys on the left. A hundred rows is a list, not a grid, so it scrolls rather
 * than windowing — and it opens on the floor the player is about to fight.
 */
export default function TowerScreen({ route }: ScreenProps) {
  const params = route as TowerRoute;
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  // The key and the season both count down, so the screen ticks once a second like the top bar.
  const now = useNow(1000);
  useSceneAudio('hub', 'interior');
  const view = useMemo(() => (save ? towerView(save, now) : null), [save, now]);
  const ladder = useRef<HTMLDivElement>(null);
  const focus = params.floor ?? view?.next ?? view?.highestFloor ?? 1;

  // Open on the floor that matters: the next one to climb, or the one the route named.
  useEffect(() => {
    const node = ladder.current?.querySelector(`[data-floor="${focus}"]`);
    node?.scrollIntoView({ block: 'center' });
  }, [focus]);

  if (!save || !view) return null;

  const climb = (floor: number): void => {
    playSfx('ui.open');
    actions.push({ name: 'battle-setup', encounterId: towerEncounterId(floor) });
  };

  return (
    <div className={styles.root} data-testid="screen-tower">
      <Backdrop asset="bg.bg1" grade="rgba(16, 14, 28, 0.55)" parallax={10} />
      <AmbientLayer preset="interior" />
      <TopBar title={t('tower.title')} onBack={() => actions.pop()} />

      <aside className={styles.side} data-testid="tower-standing">
        <Panel kind="ember-tall" padding={18} className={styles.panel} contentClassName={styles.panelBody}>
          <h2 className={`display ${styles.heading}`}>{t('tower.standing')}</h2>
          <p className={styles.blurb}>{t('tower.blurb')}</p>

          <dl className={styles.rows}>
            <div className={styles.row}>
              <dt>{t('tower.season')}</dt>
              <dd className="num" data-testid="tower-season">
                {view.season === 0 ? t('tower.season.none') : t('tower.season.n', { n: view.season })}
              </dd>
            </div>
            <div className={styles.row}>
              <dt>{t('tower.resets')}</dt>
              <dd className="num" data-testid="tower-resets">
                {view.msToSeasonEnd === null ? '—' : formatDuration(view.msToSeasonEnd)}
              </dd>
            </div>
            <div className={styles.row}>
              <dt>{t('tower.climb')}</dt>
              <dd className="num" data-testid="tower-climb">
                {t('tower.climb.n', { floor: view.highestFloor, of: TOWER_FLOORS })}
              </dd>
            </div>
            <div className={styles.row}>
              <dt>{t('tower.best')}</dt>
              <dd className="num" data-testid="tower-best">
                {view.bestFloor}
              </dd>
            </div>
          </dl>

          <div className={styles.keys} data-testid="tower-keys">
            <Glyph glyph="glyph.broken_shackle" size={22} color="var(--gold-3)" />
            <span className={`num ${styles.keyCount}`} data-over={view.keys > view.keyCap}>
              {t('tower.keys.held', { held: Math.floor(view.keys), cap: view.keyCap })}
            </span>
            <span className={styles.keyNext} data-testid="tower-key-next">
              {view.msToKey === null
                ? t('tower.keys.full')
                : t('tower.keys.next', { time: formatDuration(view.msToKey) })}
            </span>
          </div>
          <Bar
            value={Math.min(view.keys, view.keyCap)}
            max={view.keyCap}
            kind="stamina"
            height={20}
            width="100%"
            label={t('tower.keys.bar', { held: Math.floor(view.keys), cap: view.keyCap })}
          />

          {view.next === null ? (
            <p className={styles.topped} data-testid="tower-topped">
              {t('tower.topped')}
            </p>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className={styles.enter}
              disabled={view.keys < 1}
              onClick={() => climb(view.next ?? 1)}
              data-testid="tower-climb-next"
            >
              {t('tower.enter', { floor: view.next })}
            </Button>
          )}
        </Panel>
      </aside>

      <section className={styles.ladderWrap} aria-label={t('tower.title')}>
        <ScrollArea height={880} className={styles.ladder} data-testid="tower-ladder">
          <div ref={ladder} className={styles.floors}>
            {[...view.floors].reverse().map((floor) => (
              <FloorRow key={floor.floor} floor={floor} onClimb={climb} keys={view.keys} />
            ))}
          </div>
        </ScrollArea>
      </section>
    </div>
  );
}

/** One rung: its number, who holds it, what it is worth and whether a key may be spent on it. */
function FloorRow({
  floor,
  keys,
  onClimb,
}: {
  floor: TowerFloorView;
  keys: number;
  onClimb: (floor: number) => void;
}) {
  const settlement = content.settlementByIndex(floor.settlement);
  const open = floor.state === 'next' || floor.state === 'repeatable';
  const label =
    floor.state === 'next'
      ? t('tower.floor.next')
      : floor.state === 'repeatable'
        ? t('tower.floor.repeatable')
        : floor.state === 'cleared'
          ? t('tower.floor.cleared')
          : t('tower.floor.locked');
  return (
    <div
      className={[styles.floor, floor.boss ? styles.bossFloor : '', styles[floor.state] ?? ''].join(' ')}
      data-floor={floor.floor}
      data-state={floor.state}
      data-testid={`tower-floor-${floor.floor}`}
    >
      <span className={`num ${styles.number}`}>{floor.floor}</span>
      {floor.boss ? (
        <Glyph glyph="glyph.flaming_skull" size={20} color="var(--ember-3)" label={t('tower.floor.boss')} />
      ) : (
        <span className={styles.spacer} />
      )}
      <span className={styles.who}>{settlement ? translate(settlement.name) : ''}</span>
      {floor.boss ? (
        <span className={`num ${styles.odds}`} data-testid={`tower-odds-${floor.floor}`}>
          {floor.shards.sacred > 0
            ? t('tower.odds.both', { ancient: floor.shards.ancient, sacred: floor.shards.sacred })
            : t('tower.odds.ancient', { ancient: floor.shards.ancient })}
        </span>
      ) : (
        <span className={styles.odds} />
      )}
      <span className={styles.state}>{label}</span>
      {open ? (
        <Button
          variant={floor.state === 'next' ? 'primary' : 'secondary'}
          size="sm"
          disabled={keys < 1}
          onClick={() => onClimb(floor.floor)}
          data-testid={`tower-fight-${floor.floor}`}
        >
          {t('tower.fight')}
        </Button>
      ) : (
        <span className={styles.noButton} />
      )}
    </div>
  );
}
