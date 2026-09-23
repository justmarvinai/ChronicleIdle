import { playSfx } from '@audio/index';
import { formatDuration } from '@engine/time/clock';
import { t, translate } from '@i18n/index';
import { idleView } from '@state/idle';
import { selectActions, selectFeatureUnlocked, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { NotificationDot } from '@ui/components/NotificationDot/NotificationDot';
import { useNow } from '@ui/hooks/useNow';
import styles from './IdleChestButton.module.css';

const selectIdleUnlocked = selectFeatureUnlocked('idle_chest');

/**
 * The chest in the top bar (docs/tech/UI_DESIGN.md §5.2): the same chest as the one at the docks,
 * reachable from any screen. It is built like the purse beside it — the chest in a bronze socket,
 * the time to full on the bar — counts down, fills a seam of light as it goes, and wears a dot once
 * it has stopped counting.
 */
export function IdleChestButton() {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const unlocked = useGameStore(selectIdleUnlocked);
  const now = useNow(30_000);
  if (!save || !unlocked) return null;

  const { fill } = idleView(save, now);
  const label = fill.full
    ? `${t('idle.title')} — ${t('hub.idleChest.full')}`
    : translate('idle.filling', { time: formatDuration(fill.msToFull) });

  return (
    <button
      type="button"
      className={styles.pill}
      aria-label={label}
      title={label}
      data-testid="topbar-idle"
      onMouseEnter={() => playSfx('ui.hover')}
      onClick={() => {
        playSfx('ui.open');
        actions.openDialog({ name: 'idle-chest' });
      }}
    >
      <span className={styles.bar} aria-hidden="true">
        <span
          className={styles.progress}
          style={{ ['--fill' as string]: `${Math.round(fill.fraction * 100)}%` }}
        />
      </span>
      <span className={styles.socket}>
        <AssetImage asset="ui.stone_vine.icon_chest" className={styles.icon} alt="" />
        {fill.full ? <NotificationDot /> : null}
      </span>
      <span className={`num ${styles.text}`} data-full={fill.full}>
        {fill.full ? t('hub.idleChest.full') : formatDuration(fill.msToFull)}
      </span>
    </button>
  );
}
