/**
 * The Glorious Palace: one core node and four identical branches, one per element
 * (docs/design/GLORIOUS_PALACE.md).
 *
 * The four branches are the same shape on purpose — the tree reads as a symmetric mandala, and a
 * Faith player and an Eclipse player are offered the same deal. So the shape is authored **once**
 * as `RING_TEMPLATE` and stamped out four times. Change a row there and every branch moves
 * together; the totals it comes to are held to `PALACE_BRANCH_TOTALS` by a test.
 *
 * Node names repeat across rings on purpose, the way a skill tree's do: nine rings of "Vigour" is
 * how a tree reads, and the tooltip carries the number. Eleven strings cover 132 nodes.
 */
import { ELEMENTS, type Element } from '@content/champions/types';
import { PALACE_CORE_HP_PCT } from '@content/balance/palace';
import type { PalaceGrants, PalaceNodeDef, PalaceTree } from './types';

/** One authored node of a branch: where it sits, what it costs, what it gives, what opens it. */
interface TemplateNode {
  /** The name it shares with every other node of its kind. */
  name: string;
  /** Slot in the ring below that opens this node; the first ring hangs off the core. */
  parent: number;
  cost: number;
  grants: PalaceGrants;
}

/**
 * Seven rings, 33 nodes, 59 points — the whole of one branch.
 *
 * Costs say what a stat is worth rather than how far out it sits: HP, ATK and DEF are the ones you
 * take on the way past (1 point), RES and ACC are worth stopping for (2), and SPD, C.RATE and
 * C.DMG are the reason to keep going (3). The three capstones cost what a whole inner ring does.
 */
const RING_TEMPLATE: readonly (readonly TemplateNode[])[] = [
  // Ring 1 — the approach.
  [
    { name: 'vigour', parent: 0, cost: 1, grants: { hp: 50 } },
    { name: 'edge', parent: 0, cost: 1, grants: { atk: 8 } },
    { name: 'bulwark', parent: 0, cost: 1, grants: { def: 8 } },
  ],
  // Ring 2 — the first stat worth stopping for.
  [
    { name: 'vigour', parent: 0, cost: 1, grants: { hp: 75 } },
    { name: 'vigour', parent: 0, cost: 1, grants: { hp: 75 } },
    { name: 'edge', parent: 1, cost: 1, grants: { atk: 10 } },
    { name: 'bulwark', parent: 2, cost: 1, grants: { def: 10 } },
    { name: 'warding', parent: 2, cost: 2, grants: { res: 5 } },
  ],
  // Ring 3 — the first point of speed, and it is dear.
  [
    { name: 'vigour', parent: 0, cost: 1, grants: { hp: 100 } },
    { name: 'vigour', parent: 1, cost: 1, grants: { hp: 100 } },
    { name: 'edge', parent: 2, cost: 1, grants: { atk: 14 } },
    { name: 'bulwark', parent: 2, cost: 1, grants: { def: 14 } },
    { name: 'focus', parent: 3, cost: 2, grants: { acc: 5 } },
    { name: 'swiftness', parent: 4, cost: 3, grants: { spd: 1 } },
  ],
  // Ring 4 — the first of the two crit-rate nodes in the whole branch.
  [
    { name: 'vigour', parent: 0, cost: 1, grants: { hp: 125 } },
    { name: 'vigour', parent: 1, cost: 1, grants: { hp: 125 } },
    { name: 'edge', parent: 2, cost: 1, grants: { atk: 18 } },
    { name: 'bulwark', parent: 3, cost: 1, grants: { def: 18 } },
    { name: 'warding', parent: 4, cost: 2, grants: { res: 10 } },
    { name: 'keenEye', parent: 5, cost: 3, grants: { critRate: 2 } },
  ],
  // Ring 5 — and the first of the two crit-damage nodes.
  [
    { name: 'vigour', parent: 0, cost: 1, grants: { hp: 150 } },
    { name: 'edge', parent: 1, cost: 1, grants: { atk: 22 } },
    { name: 'bulwark', parent: 2, cost: 1, grants: { def: 22 } },
    { name: 'focus', parent: 4, cost: 2, grants: { acc: 8 } },
    { name: 'cruelty', parent: 5, cost: 3, grants: { critDmg: 3 } },
  ],
  // Ring 6 — the outer ring, where even ATK and DEF cost two.
  [
    { name: 'vigour', parent: 0, cost: 1, grants: { hp: 200 } },
    { name: 'edge', parent: 1, cost: 2, grants: { atk: 28 } },
    { name: 'bulwark', parent: 2, cost: 2, grants: { def: 28 } },
    { name: 'swiftness', parent: 3, cost: 3, grants: { spd: 2 } },
    { name: 'keenEye', parent: 4, cost: 3, grants: { critRate: 3 } },
  ],
  // Ring 7 — three capstones, each worth a whole inner ring.
  [
    { name: 'crown', parent: 0, cost: 4, grants: { hp: 500, atk: 50, def: 50 } },
    { name: 'tempo', parent: 2, cost: 4, grants: { spd: 3, res: 10 } },
    { name: 'malice', parent: 4, cost: 5, grants: { critDmg: 5, acc: 7 } },
  ],
];

export const PALACE_CORE_ID = 'palace.core';

const CORE: PalaceNodeDef = {
  id: PALACE_CORE_ID,
  name: 'palace.node.heart',
  element: null,
  ring: 0,
  slot: 0,
  requires: [],
  cost: 1,
  grants: {},
  hpPct: PALACE_CORE_HP_PCT,
  version: 1,
};

const nodeId = (element: Element, ring: number, slot: number): string => `palace.${element}.r${ring}.${slot}`;

function branchNodes(element: Element): PalaceNodeDef[] {
  return RING_TEMPLATE.flatMap((ring, index) => {
    const ringNumber = index + 1;
    return ring.map((node, slot) => ({
      id: nodeId(element, ringNumber, slot),
      name: `palace.node.${node.name}`,
      element,
      ring: ringNumber,
      slot,
      requires: [ringNumber === 1 ? PALACE_CORE_ID : nodeId(element, ringNumber - 1, node.parent)],
      cost: node.cost,
      grants: node.grants,
      hpPct: 0,
      version: 1,
    }));
  });
}

/** Written out rather than mapped: `Record<Element, …>` then proves all four are here. */
const BRANCHES: Readonly<Record<Element, readonly PalaceNodeDef[]>> = {
  justice: branchNodes('justice'),
  valor: branchNodes('valor'),
  faith: branchNodes('faith'),
  eclipse: branchNodes('eclipse'),
};

export const PALACE_NODES: readonly PalaceNodeDef[] = [
  CORE,
  ...ELEMENTS.flatMap((element) => BRANCHES[element]),
];

const BY_ID: Readonly<Record<string, PalaceNodeDef>> = Object.fromEntries(
  PALACE_NODES.map((node) => [node.id, node]),
);

export const PALACE: PalaceTree = {
  nodes: PALACE_NODES,
  byId: BY_ID,
  core: CORE,
  branch: (element) => BRANCHES[element],
  rings: RING_TEMPLATE.length,
};
