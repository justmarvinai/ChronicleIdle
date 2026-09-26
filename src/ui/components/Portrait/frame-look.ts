/**
 * What a portrait frame looks like (docs/design/ACHIEVEMENTS.md §3): the frame worn, or the
 * chronicle's own gold when none is — one shape for the profile, the Hall and the header ring.
 */
import { DEFAULT_FRAME } from '@content/deeds/index';
import type { PortraitFrameDef } from '@content/deeds/types';
import { content } from '@content/registry';

export type FrameLook = Pick<PortraitFrameDef, 'deco' | 'tint' | 'glow' | 'shimmer'>;

export function frameLook(frameId: string | null): FrameLook {
  const frame = frameId ? content.frameById(frameId) : undefined;
  return frame ?? DEFAULT_FRAME;
}
