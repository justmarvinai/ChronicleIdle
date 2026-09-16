/**
 * Battle stage layout in 1920×1080 stage px (docs/tech/UI_DESIGN.md §5.9): allies on the left,
 * enemies on the right, a ¾ floor plane so rear slots sit higher and slightly smaller. The HUD
 * reads the same table to hang plates above the sprites.
 */
export interface SlotAnchor {
  /** Feet position. */
  x: number;
  y: number;
  /** Depth scale (rear rows smaller). */
  depth: number;
}

export const STAGE_W = 1920;
export const STAGE_H = 1080;

/** Source models are 88 px tall; drawn at this scale before depth and boss multipliers. */
export const UNIT_PIXEL_SCALE = 3;
/** Approximate sprite height at scale 1 for plate placement. */
export const UNIT_SOURCE_HEIGHT = 88;

export const ALLY_SLOTS: readonly SlotAnchor[] = [
  { x: 640, y: 760, depth: 1 },
  { x: 470, y: 640, depth: 0.94 },
  { x: 330, y: 850, depth: 1.04 },
  { x: 200, y: 720, depth: 0.96 },
];

export const ENEMY_SLOTS: readonly SlotAnchor[] = [
  { x: 1280, y: 760, depth: 1 },
  { x: 1450, y: 640, depth: 0.94 },
  { x: 1590, y: 850, depth: 1.04 },
  { x: 1720, y: 720, depth: 0.96 },
];

/**
 * Where a boss's escort stands (docs/design/BOSSES.md §3). A weekly boss is drawn at ×2.4 — some
 * 630 stage px of sprite — and the ordinary enemy marks sit inside that, so an add on one would be
 * swallowed whole. These put the escort downstage of its master, one to each side, where the
 * sprites sort in front of it and read as standing between the party and the thing behind them.
 * Slot 0 is the master's own mark, kept so the indices line up with `ENEMY_SLOTS`.
 */
export const ENEMY_ESCORT_SLOTS: readonly SlotAnchor[] = [
  { x: 1280, y: 760, depth: 1 },
  { x: 1090, y: 940, depth: 1.1 },
  { x: 1700, y: 880, depth: 1.06 },
  { x: 1840, y: 700, depth: 0.96 },
];

export function slotFor(side: 'ally' | 'enemy', slot: number, escort = false): SlotAnchor {
  const table = side === 'ally' ? ALLY_SLOTS : escort ? ENEMY_ESCORT_SLOTS : ENEMY_SLOTS;
  return table[Math.min(slot, table.length - 1)] as SlotAnchor;
}

/** On-screen sprite scale for a unit (pixel scale × depth × art scale). */
export function unitScale(side: 'ally' | 'enemy', slot: number, artScale: number, escort = false): number {
  return UNIT_PIXEL_SCALE * slotFor(side, slot, escort).depth * artScale;
}

/** Where the HUD plate's bottom-centre sits: just above the sprite's head. */
export function plateAnchor(
  side: 'ally' | 'enemy',
  slot: number,
  artScale: number,
  escort = false,
): { x: number; y: number } {
  const anchor = slotFor(side, slot, escort);
  const height = UNIT_SOURCE_HEIGHT * unitScale(side, slot, artScale, escort);
  return { x: anchor.x, y: anchor.y - height - 18 };
}

/** Centre of mass of the sprite (impact FX, numbers). */
export function bodyCentre(
  side: 'ally' | 'enemy',
  slot: number,
  artScale: number,
  escort = false,
): { x: number; y: number } {
  const anchor = slotFor(side, slot, escort);
  const height = UNIT_SOURCE_HEIGHT * unitScale(side, slot, artScale, escort);
  return { x: anchor.x, y: anchor.y - height * 0.55 };
}
