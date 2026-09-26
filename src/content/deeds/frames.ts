/**
 * Portrait frames (docs/design/ACHIEVEMENTS.md §3): the pixel deco set's frames, tinted and lit,
 * hung up by a rank or a challenge. A frame that throws more light is harder to earn; the two that
 * shimmer are the last rank's and the Titan's.
 *
 * A chronicle that has chosen none wears `DEFAULT_FRAME`, the gold the profile has always drawn.
 */
import type { PortraitFrameDef } from './types';

/** The frame every chronicle wears until it chooses one — never earned, never lost. */
export const DEFAULT_FRAME = {
  deco: 13,
  tint: '#d9a53c',
  glow: null,
  shimmer: false,
} as const satisfies Pick<PortraitFrameDef, 'deco' | 'tint' | 'glow' | 'shimmer'>;

const frame = (
  slug: string,
  look: Pick<PortraitFrameDef, 'deco' | 'tint' | 'glow' | 'shimmer'>,
  source: PortraitFrameDef['source'],
): PortraitFrameDef => ({
  id: `frame.${slug}`,
  name: `frame.${slug}.name`,
  ...look,
  source,
  version: 1,
});

export const PORTRAIT_FRAMES: readonly PortraitFrameDef[] = [
  frame('bronze', { deco: 16, tint: '#b8733a', glow: null, shimmer: false }, { kind: 'rank', rank: 2 }),
  frame('silver', { deco: 10, tint: '#c9d3dc', glow: '#9fb4c9', shimmer: false }, { kind: 'rank', rank: 4 }),
  frame('gold', { deco: 7, tint: '#f2c14e', glow: '#f2c14e', shimmer: false }, { kind: 'rank', rank: 6 }),
  frame('ember', { deco: 17, tint: '#ff7a2e', glow: '#ff5a1f', shimmer: false }, { kind: 'rank', rank: 8 }),
  frame('void', { deco: 30, tint: '#9a6bff', glow: '#7a3cff', shimmer: true }, { kind: 'rank', rank: 10 }),
  frame(
    'verdant',
    { deco: 29, tint: '#5fd38a', glow: '#3fb86c', shimmer: false },
    { kind: 'challenge', id: 'challenge.master_hard' },
  ),
  frame(
    'amethyst',
    { deco: 9, tint: '#c77dff', glow: '#b35cff', shimmer: true },
    { kind: 'challenge', id: 'challenge.titan_falls' },
  ),
];
