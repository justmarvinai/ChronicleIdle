import type { CSSProperties } from 'react';
import type { ChampionId } from '@content/champions/types';
import { profileAvatar } from '@ui/champions/art';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { frameLook } from './frame-look';
import styles from './FramedPortrait.module.css';

export interface FramedPortraitProps {
  /** The champion whose art the chronicler wears, or null for the chronicler's own. */
  avatarChampionId: ChampionId | null;
  /** The frame worn, or null for the chronicle's own gold. */
  frameId: string | null;
  width: number;
  height: number;
  /** The frame's border in stage pixels. */
  thickness?: number;
  className?: string;
  testId?: string;
}

/**
 * The chronicler's portrait in the frame it wears (docs/design/ACHIEVEMENTS.md §3): the pixel deco
 * frame tinted to the frame's colour, the light it throws, and — for the two hardest to earn — a
 * slow gleam that runs across it. The profile, the Hall and the frame picker all draw it the same.
 */
export function FramedPortrait({
  avatarChampionId,
  frameId,
  width,
  height,
  thickness = 14,
  className,
  testId,
}: FramedPortraitProps) {
  const look = frameLook(frameId);
  const avatar = profileAvatar(avatarChampionId, 512);
  const style: CSSProperties & Record<'--frame-glow', string> = {
    width,
    height,
    '--frame-glow': look.glow ?? 'transparent',
  };
  return (
    <DecoFrame
      frame={look.deco}
      tint={look.tint}
      thickness={thickness}
      className={[styles.portrait, className ?? ''].join(' ')}
      style={style}
      data-glow={look.glow !== null}
      data-frame={frameId ?? 'default'}
      data-testid={testId}
    >
      <span className={styles.art} style={{ backgroundImage: `url("${avatar.url}")` }} aria-hidden="true">
        {avatar.tint ? (
          <span
            className={styles.artTint}
            style={{
              backgroundColor: avatar.tint,
              WebkitMaskImage: `url("${avatar.url}")`,
              maskImage: `url("${avatar.url}")`,
            }}
          />
        ) : null}
      </span>
      <span className={styles.shade} aria-hidden="true" />
      {look.shimmer ? <span className={styles.gleam} aria-hidden="true" /> : null}
    </DecoFrame>
  );
}
