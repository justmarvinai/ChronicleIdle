/**
 * The Glorious Palace's nodes (docs/design/GLORIOUS_PALACE.md, `balance/palace.ts`).
 *
 * A node is a position and a price: which ring of which branch it sits on, what it costs in skill
 * points, what it grants, and which node must already be bought to reach it. The polar maths that
 * turns `ring`/`slot` into pixels belongs to the screen, not here — content says the shape of the
 * tree, the UI says how wide it is drawn.
 */
import type { Element, StatId } from '@content/champions/types';

/** Flat additions to a champion's stats. C.RATE and C.DMG are already denominated in percent. */
export type PalaceGrants = Readonly<Partial<Record<StatId, number>>>;

export interface PalaceNodeDef {
  /** `palace.core`, or `palace.<element>.r<ring>.<slot>`. */
  id: string;
  /** i18n key for the node's name. */
  name: string;
  /**
   * `null` on the core, which grants to every champion; an element on every other node, which
   * grants only to champions of that element.
   */
  element: Element | null;
  /** 0 is the core; 1 is the ring closest to it. */
  ring: number;
  /** Position within the ring, left to right as the branch is drawn. */
  slot: number;
  /** Nodes in the ring below that open this one; empty on the core. */
  requires: readonly string[];
  cost: number;
  grants: PalaceGrants;
  /**
   * Percent of the champion's own HP, added on top of the flat grants. Only the core carries one
   * (`PALACE_CORE_HP_PCT`) — every other node is flat, so the Palace can never scale with itself.
   */
  hpPct: number;
  version: number;
}

/** The core and the four branches, indexed for the screen and the engine. */
export interface PalaceTree {
  nodes: readonly PalaceNodeDef[];
  byId: Readonly<Record<string, PalaceNodeDef>>;
  core: PalaceNodeDef;
  /** Every node of one branch, ring by ring. */
  branch(element: Element): readonly PalaceNodeDef[];
  /** How many rings a branch has, which is how far the screen has to reach. */
  rings: number;
}
