import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { playSfx, type SoundKey } from '@audio/index';
import { kitBorder, type KitKey } from '@ui/styles/kit';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'square';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Sound on click; `null` for silent. */
  sound?: SoundKey | null;
  /** Square/toggle buttons: pressed state uses the "-on" texture. */
  active?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
}

const KIT: Record<Exclude<ButtonVariant, 'ghost'>, { off: KitKey; on: KitKey; scale: number }> = {
  primary: { off: 'ui.dark_ember.btn_ember_wide', on: 'ui.dark_ember.btn_ember_wide_on', scale: 0.32 },
  danger: { off: 'ui.dark_ember.btn_ember_wide', on: 'ui.dark_ember.btn_ember_wide_on', scale: 0.32 },
  secondary: { off: 'ui.stone_vine.btn_stone_wide', on: 'ui.stone_vine.btn_stone_wide', scale: 0.4 },
  square: { off: 'ui.dark_ember.btn_ember_square', on: 'ui.dark_ember.btn_ember_square_on', scale: 0.28 },
};

/** Kit-textured button with hover lift, press squash and click/hover sounds (docs/tech/UI_DESIGN.md §4). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    sound = 'ui.confirm',
    active = false,
    icon,
    iconRight,
    loading = false,
    className,
    children,
    onClick,
    onMouseEnter,
    disabled,
    style,
    ...rest
  },
  ref,
) {
  const kit = variant === 'ghost' ? null : KIT[variant];
  const border = kit ? kitBorder(active ? kit.on : kit.off, kit.scale) : {};
  return (
    <button
      ref={ref}
      type="button"
      className={[
        styles.button,
        styles[variant],
        styles[size],
        active ? styles.active : '',
        loading ? styles.loading : '',
        className ?? '',
      ].join(' ')}
      style={{ ...border, ...style }}
      disabled={disabled || loading}
      aria-pressed={variant === 'square' ? active : undefined}
      aria-busy={loading || undefined}
      onMouseEnter={(e) => {
        if (!disabled) playSfx('ui.hover');
        onMouseEnter?.(e);
      }}
      onClick={(e) => {
        if (disabled || loading) return;
        if (sound) playSfx(sound);
        onClick?.(e);
      }}
      {...rest}
    >
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      {children !== undefined && children !== null ? (
        <span className={`display ${styles.label}`}>{children}</span>
      ) : null}
      {iconRight ? <span className={styles.icon}>{iconRight}</span> : null}
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
    </button>
  );
});
