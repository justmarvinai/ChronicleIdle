import { kitBorder, type KitKey } from '@ui/styles/kit';
import styles from './Bar.module.css';

export type BarKind = 'health' | 'mana' | 'stamina' | 'ember' | 'xp';

const FILL: Record<BarKind, KitKey> = {
  health: 'ui.stone_vine.bar_fill_health',
  mana: 'ui.stone_vine.bar_fill_mana',
  stamina: 'ui.stone_vine.bar_fill_stamina',
  ember: 'ui.dark_ember.bar_fill_ember',
  xp: 'ui.stone_vine.bar_fill_mana',
};

/**
 * The kit's stone and ember tracks are carved grooves with a thick rim (30–40 source px): below
 * this height the rim would swallow the groove and the progress would read as a hairline, so
 * shorter bars get a hairline frame in the same materials instead.
 */
const TRACK_MIN_HEIGHT = 40;
/** Below this there is no room for a legible label inside the bar. */
const TEXT_MIN_HEIGHT = 20;

export interface BarProps {
  value: number;
  max: number;
  kind?: BarKind;
  height?: number;
  width?: number | string;
  label?: string;
  showNumbers?: boolean;
  className?: string;
}

/** Kit progress bar: a carved track with a masked textured fill that eases towards the value. */
export function Bar({
  value,
  max,
  kind = 'health',
  height = 26,
  width = '100%',
  label,
  showNumbers = false,
  className,
}: BarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const track: KitKey = kind === 'ember' ? 'ui.dark_ember.bar_track_ember' : 'ui.stone_vine.bar_track_stone';
  const chunky = height >= TRACK_MIN_HEIGHT;
  // Scale the track so its carved rim keeps the proportions it was drawn with.
  const trackScale = kind === 'ember' ? height / 64 : height / 103;
  const withText = height >= TEXT_MIN_HEIGHT && (!!label || showNumbers);
  return (
    <div
      className={[styles.bar, chunky ? '' : styles.thin, className ?? ''].join(' ')}
      style={{ height, width, ...(chunky ? kitBorder(track, trackScale) : {}) }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
    >
      {/* The rim is the element's own border, so the padding box is exactly the groove. */}
      <div className={styles.groove}>
        <div className={styles.fill} style={{ width: `${pct}%` }}>
          <div className={styles.texture} style={kitBorder(FILL[kind], chunky ? 0.35 : 0.2)} />
        </div>
      </div>
      {withText ? (
        <div className={[styles.text, chunky ? styles.textLarge : ''].join(' ')}>
          {label ? <span className={`display ${styles.label}`}>{label}</span> : <span />}
          {showNumbers ? (
            <span className={`num ${styles.value}`}>{`${Math.round(value)} / ${Math.round(max)}`}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
