import type { CSSProperties } from 'react';
import { playSfx } from '@audio/index';
import { imageUrl } from '@assets/manifest';
import { t } from '@i18n/index';
import { unlockLevel } from '@engine/progression/unlocks';
import { selectFeatureUnlocked } from '@state/selectors';
import { useGameStore } from '@state/store';
import { FillRing } from '@ui/components/FillRing/FillRing';
import { FxSprite } from '@ui/components/FxSprite/FxSprite';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { NotificationDot } from '@ui/components/NotificationDot/NotificationDot';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import type { HubStatus } from './hub-status';
import type { HubHotspotDef } from './hotspots';
import styles from './HubHotspot.module.css';

export interface HubHotspotProps {
  def: HubHotspotDef;
  onOpen: (def: HubHotspotDef, unlocked: boolean) => void;
  /** Overrides the level gate for a building that opens on progress instead (the Palace). */
  gate?: boolean;
  /** What the building says about itself: a line, a count, a dot (`hub-status.ts`). */
  status?: HubStatus | undefined;
  /** 0..1 drawn as a ring around the medallion — the Idle Chest's fill (`ECONOMY.md` §6). */
  progress?: number;
}

const neverUnlocked = (): boolean => false;

/** An aura's frame against the medallion, and how slowly it turns. */
const AURA_SCALE = 1.75;
const AURA_PACE = 0.35;

/**
 * A building on the Emberhold artwork (docs/tech/UI_DESIGN.md §5.2): a medallion in the kit's
 * ring, lit in the building's colour, with its name on an ink-dark plate under it and a line that
 * says what is waiting inside — the way the reference hubs mark a town without covering it.
 */
export function HubHotspot({ def, onOpen, gate, status, progress }: HubHotspotProps) {
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
  const line = unlocked ? status?.line : undefined;
  const tone = { '--accent': def.color, '--size': `${def.size}px` } as CSSProperties;

  return (
    <Tooltip
      content={
        <span className={styles.card}>
          <strong className={`display ${styles.cardName}`}>{label}</strong>
          <span className={styles.cardHint}>{t(def.hintKey)}</span>
          {unlocked ? (
            line ? (
              <span className={`num ${styles.cardLine}`}>{line}</span>
            ) : null
          ) : (
            <span className={styles.cardLock}>{lockText}</span>
          )}
        </span>
      }
      maxWidth={300}
    >
      <button
        type="button"
        className={[
          styles.hotspot,
          unlocked ? styles.unlocked : styles.locked,
          def.labelBelow === false ? styles.plateAbove : '',
        ].join(' ')}
        style={{ left: def.x, top: def.y, ...tone }}
        aria-label={unlocked ? label : `${label}, ${lockText}`}
        data-testid={`hotspot-${def.id}`}
        onMouseEnter={() => playSfx('ui.hover')}
        onClick={() => {
          playSfx(unlocked ? 'ui.confirm' : 'ui.cancel');
          onOpen(def, unlocked);
        }}
      >
        <span className={styles.body}>
          <span
            className={[styles.medallion, unlocked && status?.ready ? styles.calling : ''].join(' ')}
            aria-hidden="true"
          >
            <span className={styles.halo} />
            {def.aura && unlocked ? (
              <FxSprite
                effect={def.aura}
                size={Math.round(def.size * AURA_SCALE)}
                loop
                speed={AURA_PACE}
                className={styles.aura}
              />
            ) : null}
            <span className={styles.disc} />
            <img
              className={styles.ring}
              src={imageUrl('ui.dark_ember.frame_round_lg')}
              alt=""
              draggable={false}
            />
            {progress !== undefined && unlocked ? (
              <FillRing
                fraction={progress}
                size={def.size - 14}
                thickness={5}
                color="var(--accent)"
                className={styles.fill ?? ''}
              />
            ) : null}
            <Glyph
              glyph={unlocked ? def.glyph : 'glyph.broken_shackle'}
              size={Math.round(def.size * 0.4)}
              color={unlocked ? 'var(--text-1)' : 'var(--text-3)'}
              className={styles.glyph}
            />
            {unlocked && status?.count ? (
              <NotificationDot count={status.count} className={styles.badge ?? ''} />
            ) : unlocked && status?.dot ? (
              <NotificationDot className={styles.badge ?? ''} />
            ) : null}
          </span>
          <span className={[styles.plate, def.labelBelow === false ? styles.above : ''].join(' ')}>
            <span className={`display ${styles.label}`}>{label}</span>
            <span className={styles.rule} aria-hidden="true" />
            {!unlocked ? <span className={styles.lock}>{lockText}</span> : null}
            {line ? (
              <span className={`num ${styles.line} ${status?.ready ? styles.ready : ''}`}>{line}</span>
            ) : null}
          </span>
        </span>
      </button>
    </Tooltip>
  );
}
