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

/** Kit progress bar: stone track with a masked textured fill that eases towards the value. */
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
  return (
    <div
      className={[styles.bar, className ?? ''].join(' ')}
      style={{ height, width, ...kitBorder(track, kind === 'ember' ? 0.4 : 0.25) }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
    >
      <div className={styles.inner}>
        <div className={styles.fill} style={{ width: `${pct}%` }}>
          <div className={styles.texture} style={kitBorder(FILL[kind], 0.25)} />
        </div>
        {label || showNumbers ? (
          <div className={styles.text}>
            {label ? <span className={styles.label}>{label}</span> : null}
            {showNumbers ? <span className="num">{`${Math.round(value)} / ${Math.round(max)}`}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
