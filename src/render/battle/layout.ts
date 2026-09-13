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

export function slotFor(side: 'ally' | 'enemy', slot: number): SlotAnchor {
  const table = side === 'ally' ? ALLY_SLOTS : ENEMY_SLOTS;
  return table[Math.min(slot, table.length - 1)] as SlotAnchor;
}

/** On-screen sprite scale for a unit (pixel scale × depth × art scale). */
export function unitScale(side: 'ally' | 'enemy', slot: number, artScale: number): number {
  return UNIT_PIXEL_SCALE * slotFor(side, slot).depth * artScale;
}

/** Where the HUD plate's bottom-centre sits: just above the sprite's head. */
export function plateAnchor(
  side: 'ally' | 'enemy',
  slot: number,
  artScale: number,
): { x: number; y: number } {
  const anchor = slotFor(side, slot);
  const height = UNIT_SOURCE_HEIGHT * unitScale(side, slot, artScale);
  return { x: anchor.x, y: anchor.y - height - 18 };
}

/** Centre of mass of the sprite (impact FX, numbers). */
export function bodyCentre(side: 'ally' | 'enemy', slot: number, artScale: number): { x: number; y: number } {
  const anchor = slotFor(side, slot);
  const height = UNIT_SOURCE_HEIGHT * unitScale(side, slot, artScale);
  return { x: anchor.x, y: anchor.y - height * 0.55 };
}
