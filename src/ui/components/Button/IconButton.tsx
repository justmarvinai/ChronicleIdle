import { type ButtonHTMLAttributes } from 'react';
import { playSfx, type SoundKey } from '@audio/index';
import { imageUrl } from '@assets/manifest';
import type { UiKey } from '@assets/manifest.generated';
import styles from './IconButton.module.css';

export type IconButtonKind = 'close' | 'back' | 'settings';

const TEXTURE: Record<IconButtonKind, UiKey> = {
  close: 'ui.stone_vine.btn_icon_close',
  back: 'ui.stone_vine.btn_icon_back',
  settings: 'ui.stone_vine.btn_icon_settings',
};

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  kind: IconButtonKind;
  label: string;
  size?: number;
  sound?: SoundKey | null;
  onClick?: () => void;
}

/** Stone icon buttons from the stone-vine kit (close, back, settings). */
export function IconButton({
  kind,
  label,
  size = 64,
  sound = 'ui.tab',
  onClick,
  className,
  disabled,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={[styles.button, className ?? ''].join(' ')}
      style={{ width: size, height: size, backgroundImage: `url("${imageUrl(TEXTURE[kind])}")` }}
      disabled={disabled}
      onMouseEnter={() => !disabled && playSfx('ui.hover')}
      onClick={() => {
        if (disabled) return;
        if (sound) playSfx(sound);
        onClick?.();
      }}
      {...rest}
    />
  );
}
