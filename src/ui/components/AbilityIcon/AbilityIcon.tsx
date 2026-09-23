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
  /** Styling only: a passive never lights up and is never castable. */
  passive?: boolean;
  disabled?: boolean;
  selected?: boolean;
  /**
   * The chip on the icon's rim — the key that casts it on the fight's bar, `P` for a passive
   * there. A list leaves it off: its rows say which slot and what kind in their own text, and a
   * two-character chip on a 56 px circle only covers the art.
   */
  badge?: string;
  /**
   * Pressing reads the ability rather than casts it — the champion screen's kit strip, which opens
   * the Abilities tab. The icon is pressable whatever it is, a passive included; it still lights
   * up only as a castable ability would.
   */
  inspect?: boolean;
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
  badge,
  inspect = false,
  onClick,
}: AbilityIconProps) {
  const ready = cooldown === 0 && !disabled && !passive;
  const pressable = inspect ? !disabled : ready;
  // The lit frame is a filled ember disc, so it sits *behind* the art as a glow; the plain
  // frame is a transparent ring and always goes on top.
  const ring = imageUrl('ui.dark_ember.frame_round_sm');
  const glow = ready ? imageUrl('ui.dark_ember.frame_round_sm_lit') : null;
  return (
    <button
      type="button"
      aria-label={cooldown > 0 ? `${label} — ${cooldown}` : label}
      aria-disabled={!pressable || undefined}
      className={[
        styles.button,
        pressable ? styles.pressable : '',
        selected ? styles.selected : '',
        cooldown > 0 ? styles.cooling : '',
      ].join(' ')}
      style={{ width: size, height: size, ['--ability-size' as string]: `${size}px` }}
      data-cooldown={cooldown > 0 ? cooldown : undefined}
      onMouseEnter={() => pressable && playSfx('ui.hover')}
      onClick={() => pressable && onClick && (playSfx('ui.tab'), onClick())}
    >
      {glow ? (
        <span className={styles.glow} style={{ backgroundImage: `url("${glow}")` }} aria-hidden="true" />
      ) : null}
      <span className={styles.art} style={{ backgroundImage: `url("${imageUrl(icon, 'full')}")` }} />
      <span className={styles.frame} style={{ backgroundImage: `url("${ring}")` }} aria-hidden="true" />
      {cooldown > 0 ? (
        <span className={styles.cooldown} aria-hidden="true">
          <span className={`num ${styles.cooldownTurns}`}>{cooldown}</span>
        </span>
      ) : null}
      {badge ? (
        <span className={`num ${styles.badge}`} aria-hidden="true">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
