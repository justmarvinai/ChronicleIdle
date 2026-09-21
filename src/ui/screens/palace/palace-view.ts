/**
 * Laying the Glorious Palace out (docs/tech/UI_DESIGN.md §5.22).
 *
 * Content says the *shape* of the tree — which ring a node sits on, which slot in that ring, and
 * which node opens it — and this turns that into pixels: the core at the origin, and four petals
 * growing along the compass `PALACE_BRANCH_DIRECTIONS` names. Keeping it a pure function of the
 * tree and the bought list means the geometry can be tested without a browser, and the screen only
 * has to draw what comes back.
 *
 * The one rule the whole layout hangs on: a branch owns the 90° lane around its own compass point
 * and never leans into its neighbour's. Rings are pushed outward until their nodes fit that lane
 * with a gap to spare, so a ring that grows a node — or a capstone drawn larger — moves itself out
 * of trouble instead of colliding with the branch next door.
 */
import { PALACE_BRANCH_COST, PALACE_BRANCH_DIRECTIONS } from '@content/balance/palace';
import { ELEMENTS, type Element } from '@content/champions/types';
import type { PalaceNodeDef, PalaceTree } from '@content/palace/types';
import { nodeState, palaceLedger, type PalaceLedger, type PalaceNodeState } from '@engine/palace/index';

/** Diameter of an ordinary node, of a capstone, and of the core, in stage px. */
export const PALACE_NODE_SIZE = 44;
export const PALACE_CAPSTONE_SIZE = 58;
export const PALACE_CORE_SIZE = 76;
/** A node costing this much is a capstone: drawn larger, and given the room for it. */
const CAPSTONE_COST = 4;
/** Clear space the layout keeps between the rims of two neighbouring nodes. */
const NODE_GAP = 18;
/** How far the first ring sits from the core, and how much further each ring after it. */
const FIRST_RING_RADIUS = 118;
const RING_STEP = 66;
/** Each of the four branches owns this much of the circle. */
const LANE_RAD = Math.PI / 2;
/**
 * Where a branch's name sits: past its last ring, on the branch's own axis — which is exactly
 * where a capstone sits too, so the offset clears a whole node and then the label's own height.
 */
const LABEL_OFFSET = 100;
/** Clear space around the outermost thing drawn, so a hover halo is never clipped. */
const CANVAS_MARGIN = 48;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/** How big a node is drawn: the core, a capstone, or one of the many. */
export function nodeSize(node: PalaceNodeDef): number {
  if (node.requires.length === 0) return PALACE_CORE_SIZE;
  return node.cost >= CAPSTONE_COST ? PALACE_CAPSTONE_SIZE : PALACE_NODE_SIZE;
}

export interface PalacePoint {
  x: number;
  y: number;
}

export interface PalaceNodeView extends PalacePoint {
  node: PalaceNodeDef;
  state: PalaceNodeState;
  /** The branch it belongs to, or `null` on the core — which is what colours it. */
  element: Element | null;
  size: number;
}

export interface PalaceLinkView {
  id: string;
  from: PalacePoint;
  to: PalacePoint;
  /** Lit once both ends are bought, warm while the far end can be bought, dark otherwise. */
  state: 'owned' | 'open' | 'dim';
  element: Element | null;
}

export interface PalaceBranchView extends PalacePoint {
  element: Element;
  /** Points sunk into this branch, and what the whole of it costs. */
  spent: number;
  total: number;
  nodes: number;
  owned: number;
}

export interface PalaceView {
  nodes: readonly PalaceNodeView[];
  links: readonly PalaceLinkView[];
  branches: readonly PalaceBranchView[];
  ledger: PalaceLedger;
  /** The square the tree is drawn on, with the core at its centre. */
  size: number;
}

/** One ring's shape: how many nodes it holds and how much room each of them wants. */
interface RingPlan {
  count: number;
  spacing: number;
  radius: number;
}

/**
 * Radius and spacing for every ring of a branch.
 *
 * A ring sits `RING_STEP` beyond the one before it, unless that is too close to fit its nodes in
 * the branch's lane — then it is pushed out until it does. `count` gaps for `count` nodes is
 * deliberate: the spare gap is the clear sky at the lane's edges, which is what keeps two branches
 * from touching where they are widest.
 */
function ringPlans(nodes: readonly PalaceNodeDef[], rings: number): RingPlan[] {
  const plans: RingPlan[] = [{ count: 1, spacing: 0, radius: 0 }];
  for (let ring = 1; ring <= rings; ring += 1) {
    const inRing = nodes.filter((node) => node.ring === ring);
    const spacing = Math.max(...inRing.map(nodeSize), PALACE_NODE_SIZE) + NODE_GAP;
    const needed = (inRing.length * spacing) / LANE_RAD;
    const previous = plans[ring - 1]?.radius ?? 0;
    plans.push({
      count: inRing.length,
      spacing,
      radius: Math.max(previous + RING_STEP, needed, FIRST_RING_RADIUS),
    });
  }
  return plans;
}

/**
 * Where one node sits, in px from the core.
 *
 * The ring opens as wide as its nodes ask for and no wider than its lane allows, so the inner
 * rings — which need every degree they have — open to the edge of the lane, and the outer ones,
 * with room to spare, narrow back towards the branch's axis. That is what gives a branch the shape
 * of a petal rather than a wedge, and why the capstones read as the tip of something.
 */
export function nodePoint(direction: number, plan: RingPlan, slot: number): PalacePoint {
  if (plan.radius === 0) return { x: 0, y: 0 };
  const wanted = toDeg(((plan.count - 1) * plan.spacing) / 2 / plan.radius);
  const lane = toDeg(LANE_RAD) / 2 - toDeg(plan.spacing / 2 / plan.radius);
  const half = Math.min(wanted, Math.max(0, lane));
  const step = plan.count > 1 ? (half * 2) / (plan.count - 1) : 0;
  const angle = toRad(direction - half + step * slot);
  // Degrees run clockwise from north, the way a compass does.
  return { x: Math.sin(angle) * plan.radius, y: -Math.cos(angle) * plan.radius };
}

/**
 * The whole tree, positioned and priced against what a chronicle has earned and bought.
 *
 * `bought` is the save's list; everything else is derived, so the screen never has to keep a
 * second copy of the truth.
 */
export function palaceView(tree: PalaceTree, bought: readonly string[], earned: number): PalaceView {
  const owned = new Set(bought);
  const byId = (id: string): PalaceNodeDef | undefined => tree.byId[id];
  const ledger = palaceLedger(earned, bought, byId);

  const nodes: PalaceNodeView[] = [];
  const at = new Map<string, PalacePoint>();

  nodes.push({
    node: tree.core,
    state: nodeState(tree.core, owned, ledger.available),
    element: null,
    size: nodeSize(tree.core),
    x: 0,
    y: 0,
  });
  at.set(tree.core.id, { x: 0, y: 0 });

  const branches: PalaceBranchView[] = [];
  let outermost = 0;
  for (const element of ELEMENTS) {
    const direction = PALACE_BRANCH_DIRECTIONS[element];
    const branch = tree.branch(element);
    const plans = ringPlans(branch, tree.rings);
    let spent = 0;
    let ownedCount = 0;
    for (const node of branch) {
      const plan = plans[node.ring];
      if (!plan) continue;
      const point = nodePoint(direction, plan, node.slot);
      at.set(node.id, point);
      nodes.push({
        node,
        state: nodeState(node, owned, ledger.available),
        element,
        size: nodeSize(node),
        ...point,
      });
      if (owned.has(node.id)) {
        spent += node.cost;
        ownedCount += 1;
      }
    }
    const last = plans[tree.rings]?.radius ?? 0;
    outermost = Math.max(outermost, last);
    const labelRadius = last + LABEL_OFFSET;
    branches.push({
      element,
      spent,
      total: PALACE_BRANCH_COST,
      nodes: branch.length,
      owned: ownedCount,
      x: Math.sin(toRad(direction)) * labelRadius,
      y: -Math.cos(toRad(direction)) * labelRadius,
    });
  }

  const links: PalaceLinkView[] = [];
  for (const view of nodes) {
    for (const parentId of view.node.requires) {
      const from = at.get(parentId);
      if (!from) continue;
      const lit = owned.has(view.node.id);
      links.push({
        id: `${parentId}>${view.node.id}`,
        from,
        to: { x: view.x, y: view.y },
        state: lit ? 'owned' : view.state === 'ready' ? 'open' : 'dim',
        element: view.element,
      });
    }
  }

  const reach = outermost + LABEL_OFFSET + PALACE_CAPSTONE_SIZE / 2 + CANVAS_MARGIN;
  return { nodes, links, branches, ledger, size: Math.round(reach * 2) };
}

/** Stage-space centre of a node on the canvas `palaceView` describes. */
export function canvasPoint(view: PalaceView, point: PalacePoint): PalacePoint {
  return { x: view.size / 2 + point.x, y: view.size / 2 + point.y };
}
