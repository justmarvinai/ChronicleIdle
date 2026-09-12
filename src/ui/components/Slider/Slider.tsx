import { useId } from 'react';
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
}

/** Range input styled as a stone track with an ember fill and gold thumb. */
export function Slider({
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  label,
  format,
  disabled,
}: SliderProps) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={[styles.row, disabled ? styles.disabled : ''].join(' ')}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        type="range"
        className={styles.input}
        style={{
          background: `linear-gradient(to right, var(--ember-3) 0%, var(--ember-2) ${pct}%, var(--stone-1) ${pct}%, var(--stone-1) 100%)`,
        }}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className={`num ${styles.value}`}>{format ? format(value) : `${Math.round(pct)}%`}</span>
    </div>
  );
}
