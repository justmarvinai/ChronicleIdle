import type { HTMLAttributes, ReactNode } from 'react';
import type { KitKey } from '@ui/styles/kit';
import { KitSurface } from './KitSurface';

export interface KitFrameProps extends HTMLAttributes<HTMLDivElement> {
  kit: KitKey;
  scale?: number;
  /** Optional filled texture drawn behind the content (e.g. `ui.dark_ember.bg_wide`). */
  fill?: KitKey;
  fillScale?: number;
  padding?: number;
  children?: ReactNode;
}

/** A 9-sliced kit texture as a container (frames, panels, bars). */
export function KitFrame({ kit, scale = 0.5, fill, fillScale = 0.5, padding = 0, ...rest }: KitFrameProps) {
  return (
    <KitSurface frame={kit} scale={scale} fill={fill} fillScale={fillScale} padding={padding} {...rest} />
  );
}
