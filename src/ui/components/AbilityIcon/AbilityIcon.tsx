import { imageUrl } from '@assets/manifest';
import type { SpellKey } from '@assets/manifest.generated';
import { playSfx } from '@audio/index';
import styles from './AbilityIcon.module.css';

export interface AbilityIconProps {
  icon: SpellKey;
  label: string;
  size?: number;
  /** Turns remaining; 0 = ready. */
  cooldown?: number;
  passive?: boolean;
  disabled?: boolean;
  selected?: boolean;
  hotkey?: string;
  onClick?: () => void;
}

/** Round ember frame around a painted ability icon with cooldown overlay and passive tag. */
export function AbilityIcon({
  icon,
  label,
  size = 96,
  cooldown = 0,
  passive = false,
  disabled = false,
  selected = false,
  hotkey,
  onClick,
}: AbilityIconProps) {
  const ready = cooldown === 0 && !disabled && !passive;
  const frame = imageUrl(ready ? 'ui.dark_ember.frame_round_sm_lit' : 'ui.dark_ember.frame_round_sm');
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={!ready || undefined}
      className={[styles.button, ready ? styles.ready : '', selected ? styles.selected : ''].join(' ')}
      style={{ width: size, height: size }}
      onMouseEnter={() => ready && playSfx('ui.hover')}
      onClick={() => ready && onClick && (playSfx('ui.tab'), onClick())}
    >
      <span className={styles.art} style={{ backgroundImage: `url("${imageUrl(icon, 'full')}")` }} />
      <span className={styles.frame} style={{ backgroundImage: `url("${frame}")` }} aria-hidden="true" />
      {cooldown > 0 ? (
        <span className={styles.cooldown}>
          <span className="num">{cooldown}</span>
        </span>
      ) : null}
      {passive ? <span className={`display ${styles.passive}`}>P</span> : null}
      {hotkey ? <span className={`num ${styles.hotkey}`}>{hotkey}</span> : null}
    </button>
  );
}
