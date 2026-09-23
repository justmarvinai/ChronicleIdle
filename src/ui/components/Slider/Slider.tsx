import { useId } from 'react';
import { kitBorder } from '@ui/styles/kit';
import styles from './Slider.module.css';

export interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  format?: (value: number) => string;
  disabled?: boolean;
  /** The label is said by the row around the slider (a settings card), so it is only read aloud. */
  hideLabel?: boolean;
}

/** Track height in px; the stone channel's rim is scaled from its 103 px source to match. */
const TRACK_H = 32;

/**
 * Kit slider: the carved stone channel and the ember fill are kit textures, the knob is a gold orb
 * in the kit's round frame, and a transparent range input on top keeps native keyboard and drag.
 */
export function Slider({
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  label,
  format,
  disabled,
  hideLabel = false,
}: SliderProps) {
  const id = useId();
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div className={[styles.row, hideLabel ? styles.bare : '', disabled ? styles.disabled : ''].join(' ')}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : styles.label}>
        {label}
      </label>
      <div className={styles.control}>
        <div
          className={styles.track}
          style={{ height: TRACK_H, ...kitBorder('ui.stone_vine.bar_track_stone', TRACK_H / 103) }}
        >
          <div className={styles.groove}>
            <div className={styles.fill} style={{ width: `${pct}%` }}>
              <div className={styles.fillTexture} style={kitBorder('ui.dark_ember.bar_fill_ember', 0.25)} />
            </div>
          </div>
        </div>
        <span
          className={styles.knob}
          style={{ left: `${pct}%`, ...kitBorder('ui.dark_ember.frame_round_sm', 0.5) }}
          aria-hidden="true"
        />
        <input
          id={id}
          type="range"
          className={styles.input}
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
      <span className={`num ${styles.value}`}>{format ? format(value) : `${Math.round(pct)}%`}</span>
    </div>
  );
}
