import { playSfx } from '@audio/index';
import { t } from '@i18n/index';
import { unlockLevel } from '@engine/progression/unlocks';
import { selectFeatureUnlocked } from '@state/selectors';
import { useGameStore } from '@state/store';
import { FillRing } from '@ui/components/FillRing/FillRing';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { NotificationDot } from '@ui/components/NotificationDot/NotificationDot';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import { kitBorder } from '@ui/styles/kit';
import type { HubHotspotDef } from './hotspots';
import styles from './HubHotspot.module.css';

export interface HubHotspotProps {
  def: HubHotspotDef;
  onOpen: (def: HubHotspotDef, unlocked: boolean) => void;
  /** Overrides the level gate for a building that opens on progress instead (the Palace). */
  gate?: boolean;
  notify?: boolean;
  /** 0..1 drawn as a ring around the building — the Idle Chest's fill (`ECONOMY.md` §6). */
  progress?: number;
  /** A line under the label: a countdown, a count, a state. */
  sublabel?: string;
}

const neverUnlocked = (): boolean => false;

/** A building on the Emberhold artwork: glowing ring, glyph, banner label, lock state. */
export function HubHotspot({ def, onOpen, gate, notify, progress, sublabel }: HubHotspotProps) {
  const byLevel = useGameStore(
    def.feature === 'later-phase' ? neverUnlocked : selectFeatureUnlocked(def.feature),
  );
  const unlocked = gate ?? byLevel;
  const lockText = def.reasonKey
    ? t(def.reasonKey)
    : def.feature === 'later-phase'
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
            {progress !== undefined && unlocked ? (
              <FillRing
                fraction={progress}
                size={def.size - 10}
                thickness={5}
                color="var(--gold-3)"
                className={styles.fill ?? ''}
              />
            ) : null}
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
            {unlocked && sublabel ? <span className={`num ${styles.sublabel}`}>{sublabel}</span> : null}
          </span>
        </span>
      </button>
    </Tooltip>
  );
}
