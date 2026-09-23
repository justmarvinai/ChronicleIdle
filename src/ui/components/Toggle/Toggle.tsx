import { useId } from 'react';
import { playSfx } from '@audio/index';
import { t } from '@i18n/index';
import styles from './Toggle.module.css';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  /** The label is said by the row around the switch (a settings card), so it is only read aloud. */
  hideLabel?: boolean;
}

/** A bevelled stone switch: dark and marked *Off*, or ember-lit with a gold knob and marked *On*. */
export function Toggle({ checked, onChange, label, description, disabled, hideLabel = false }: ToggleProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={[styles.row, hideLabel ? styles.bare : '', disabled ? styles.disabled : ''].join(' ')}
    >
      <span className={hideLabel ? 'sr-only' : styles.text}>
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
        <span className={styles.state} aria-hidden="true">
          {checked ? t('common.on') : t('common.off')}
        </span>
        <span className={styles.knob} />
      </button>
    </label>
  );
}
