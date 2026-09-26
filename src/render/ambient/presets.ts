/** Ambient scene presets (docs/tech/UI_DESIGN.md §5). Positions are in 1920×1080 stage px. */
export interface GlowPoint {
  x: number;
  y: number;
  size: number;
  color: number;
  /** 0..1 flicker strength. */
  flicker: number;
}

export interface AmbientPreset {
  fog: { count: number; tint: number; alpha: number; speed: number; band: [number, number] } | null;
  embers: { count: number; area: [number, number, number, number]; tint: number[] } | null;
  fireflies: { count: number; area: [number, number, number, number]; tint: number } | null;
  motes: { count: number; tint: number } | null;
  rays: { count: number; tint: number; alpha: number } | null;
  glows: GlowPoint[];
}

export const AMBIENT_PRESETS: Record<'hub' | 'title' | 'interior' | 'unwritten' | 'none', AmbientPreset> = {
  none: { fog: null, embers: null, fireflies: null, motes: null, rays: null, glows: [] },
  hub: {
    fog: { count: 10, tint: 0x8fa3c8, alpha: 0.16, speed: 9, band: [520, 1080] },
    embers: { count: 60, area: [0, 480, 1920, 560], tint: [0xffb36b, 0xff8a3d, 0xffd08a] },
    fireflies: { count: 26, area: [200, 560, 1500, 400], tint: 0xbfff9a },
    motes: null,
    rays: null,
    glows: [],
  },
  // The title screen (UI_DESIGN.md §5.1): the Eclipse gate sits between the two columns at the
  // framing the screen gives the painting, so its light and the sparks it breathes out sit there too.
  title: {
    fog: { count: 14, tint: 0x9b5de5, alpha: 0.2, speed: 6, band: [300, 1080] },
    embers: { count: 90, area: [860, 240, 460, 700], tint: [0xc58cff, 0x9b5de5, 0xffffff] },
    fireflies: null,
    motes: { count: 80, tint: 0xd9c8ff },
    rays: { count: 5, tint: 0xb28cff, alpha: 0.08 },
    glows: [
      { x: 1075, y: 600, size: 620, color: 0x9b5de5, flicker: 0.12 },
      { x: 1075, y: 640, size: 240, color: 0xe6d6ff, flicker: 0.25 },
    ],
  },
  // The Unwritten (UNWRITTEN.md §21): violet fog low on the page, ink flecks drifting up out of it.
  unwritten: {
    fog: { count: 12, tint: 0x5f4a9a, alpha: 0.2, speed: 5, band: [260, 1080] },
    embers: { count: 46, area: [0, 260, 1920, 820], tint: [0xb89cff, 0x8a6fd1, 0xeae2ff] },
    fireflies: null,
    motes: { count: 90, tint: 0xcbb8ff },
    rays: { count: 3, tint: 0x9d85e0, alpha: 0.06 },
    glows: [],
  },
  interior: {
    fog: null,
    embers: { count: 30, area: [0, 300, 1920, 700], tint: [0xffb36b, 0xff8a3d] },
    fireflies: null,
    motes: { count: 120, tint: 0xffe6b8 },
    rays: { count: 3, tint: 0xffd59a, alpha: 0.1 },
    glows: [],
  },
};
