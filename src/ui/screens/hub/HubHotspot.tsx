import { playSfx } from '@audio/index';
import { t } from '@i18n/index';
import { unlockLevel } from '@engine/progression/unlocks';
import { selectFeatureUnlocked } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { NotificationDot } from '@ui/components/NotificationDot/NotificationDot';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import { kitBorder } from '@ui/styles/kit';
import type { HubHotspotDef } from './hotspots';
import styles from './HubHotspot.module.css';

export interface HubHotspotProps {
  def: HubHotspotDef;
  onOpen: (def: HubHotspotDef, unlocked: boolean) => void;
  notify?: boolean;
}

const neverUnlocked = (): boolean => false;

/** A building on the Emberhold artwork: glowing ring, glyph, banner label, lock state. */
export function HubHotspot({ def, onOpen, notify }: HubHotspotProps) {
  const unlocked = useGameStore(
    def.feature === 'later-phase' ? neverUnlocked : selectFeatureUnlocked(def.feature),
  );
  const lockText =
    def.feature === 'later-phase'
      ? t('hub.hotspot.later')
      : t('common.unlocksAtLevel', { level: unlockLevel(def.feature) });
  const label = t(def.labelKey);
  return (
    <Tooltip content={unlocked ? label : `${label} — ${lockText}`}>
      <button
        type="button"
        className={[styles.hotspot, unlocked ? styles.unlocked : styles.locked].join(' ')}
        style={{ left: def.x, top: def.y, ['--accent' as string]: def.color }}
        aria-label={unlocked ? label : `${label}, ${lockText}`}
        data-testid={`hotspot-${def.id}`}
        onMouseEnter={() => playSfx('ui.hover')}
        onClick={() => {
          playSfx(unlocked ? 'ui.confirm' : 'ui.cancel');
          onOpen(def, unlocked);
        }}
      >
        <span className={styles.body}>
          <span className={styles.ring} style={{ width: def.size, height: def.size }} aria-hidden="true">
            <span className={styles.ringInner} />
            <Glyph
              glyph={unlocked ? def.glyph : 'glyph.broken_shackle'}
              size={def.size * 0.34}
              color={unlocked ? 'var(--text-1)' : 'var(--text-3)'}
            />
            {notify && unlocked ? <NotificationDot /> : null}
          </span>
          <span
            className={[styles.banner, def.labelBelow === false ? styles.above : ''].join(' ')}
            style={kitBorder(unlocked ? 'ui.dark_ember.banner_plain' : 'ui.dark_ember.banner_dark', 0.22)}
          >
            <span className={`display ${styles.label}`}>{label}</span>
            {!unlocked ? <span className={styles.lock}>{lockText}</span> : null}
          </span>
        </span>
      </button>
    </Tooltip>
  );
}
