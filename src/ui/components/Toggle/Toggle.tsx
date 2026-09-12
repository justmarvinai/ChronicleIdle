import { useId } from 'react';
import { playSfx } from '@audio/index';
import styles from './Toggle.module.css';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

/** Stone switch with an ember knob. */
export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  const id = useId();
  return (
    <label htmlFor={id} className={[styles.row, disabled ? styles.disabled : ''].join(' ')}>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {description ? <span className={styles.description}>{description}</span> : null}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={[styles.track, checked ? styles.on : ''].join(' ')}
        onMouseEnter={() => !disabled && playSfx('ui.hover')}
        onClick={() => {
          if (disabled) return;
          playSfx('ui.tab');
          onChange(!checked);
        }}
      >
        <span className={styles.knob} />
      </button>
    </label>
  );
}
