import { describe, expect, it } from 'vitest';
import { PALACE_BRANCH_DIRECTIONS, PALACE_TREE_COST } from '@content/balance/palace';
import { type ELEMENTS } from '@content/champions/types';
import { PALACE, PALACE_CORE_ID } from '@content/palace/index';
import { NODE_GLYPH, nodeGlyph } from './palace-icons';
import { PALACE_NODE_SIZE, palaceView, canvasPoint } from './palace-view';

/** Every node of one branch, in the order the tree lists them. */
const branchIds = (element: (typeof ELEMENTS)[number]): string[] =>
  PALACE.branch(element).map((node) => node.id);

describe('laying out the Glorious Palace', () => {
  it('puts the core at the centre and grows each branch along its compass point', () => {
    const view = palaceView(PALACE, [], 0);
    const core = view.nodes.find((n) => n.node.id === PALACE_CORE_ID);
    expect(core).toBeDefined();
    expect(core?.x).toBe(0);
    expect(core?.y).toBe(0);

    // North is -y, east is +x: the outermost node of each branch must lie that way.
    const tip = (element: (typeof ELEMENTS)[number]) =>
      view.nodes
        .filter((n) => n.element === element)
        .reduce((far, n) => (Math.hypot(n.x, n.y) > Math.hypot(far.x, far.y) ? n : far));
    expect(PALACE_BRANCH_DIRECTIONS.justice).toBe(0);
    expect(tip('justice').y).toBeLessThan(-400);
    expect(tip('valor').x).toBeGreaterThan(400);
    expect(tip('eclipse').y).toBeGreaterThan(400);
    expect(tip('faith').x).toBeLessThan(-400);
  });

  it('never overlaps two nodes, in a branch or between branches', () => {
    const view = palaceView(PALACE, [], 0);
    let closest = { gap: Number.POSITIVE_INFINITY, pair: '' };
    for (let i = 0; i < view.nodes.length; i += 1) {
      for (let j = i + 1; j < view.nodes.length; j += 1) {
        const a = view.nodes[i];
        const b = view.nodes[j];
        if (!a || !b) continue;
        // What is left between their rims once each node's own disc is taken off.
        const gap = Math.hypot(a.x - b.x, a.y - b.y) - (a.size + b.size) / 2;
        if (gap < closest.gap) closest = { gap, pair: `${a.node.id} / ${b.node.id}` };
      }
    }
    // Rims, not centres: a capstone is drawn larger and the layout has to have made room for it.
    expect(closest.gap, `${closest.pair} are ${closest.gap.toFixed(1)}px apart`).toBeGreaterThan(10);
  });

  it('draws one link per node, from the node that opens it', () => {
    const view = palaceView(PALACE, [], 0);
    expect(view.links).toHaveLength(view.nodes.length - 1);
    const core = view.links.filter((link) => link.id.startsWith(`${PALACE_CORE_ID}>`));
    // The core opens the first ring of all four branches.
    expect(core).toHaveLength(4 * 3);
    for (const link of view.links) expect(link.state).toBe('dim');
  });

  it('fits every node and label inside the canvas it reports', () => {
    const view = palaceView(PALACE, [], 0);
    const half = view.size / 2;
    for (const node of view.nodes) {
      const point = canvasPoint(view, node);
      expect(point.x).toBeGreaterThan(PALACE_NODE_SIZE / 2);
      expect(point.x).toBeLessThan(view.size - PALACE_NODE_SIZE / 2);
      expect(Math.abs(node.y) + PALACE_NODE_SIZE / 2).toBeLessThan(half);
    }
    for (const branch of view.branches) expect(Math.hypot(branch.x, branch.y)).toBeLessThan(half);
    /*
     * The field under the top bar is about 984 stage px tall and the screen opens on the whole
     * mandala, so the tree has to fit that at a zoom a player can still read — a 44 px node drawn
     * below about two thirds is a blur. A ring grown past this is a design decision, not an
     * accident, and this is where it gets made.
     */
    expect(984 / view.size).toBeGreaterThan(0.65);
  });

  it('marks what the points can reach and what they cannot', () => {
    const empty = palaceView(PALACE, [], 0);
    expect(empty.nodes.filter((n) => n.state === 'ready')).toHaveLength(0);
    expect(empty.nodes.find((n) => n.node.id === PALACE_CORE_ID)?.state).toBe('tooShort');

    const withPoint = palaceView(PALACE, [], 1);
    expect(withPoint.nodes.find((n) => n.node.id === PALACE_CORE_ID)?.state).toBe('ready');
    // Nothing else is within reach until the core is bought.
    expect(withPoint.nodes.filter((n) => n.state === 'ready')).toHaveLength(1);

    const core = palaceView(PALACE, [PALACE_CORE_ID], 1);
    expect(core.nodes.find((n) => n.node.id === PALACE_CORE_ID)?.state).toBe('owned');
    expect(core.ledger).toEqual({ earned: 1, spent: 1, available: 0 });
    // Reachable, but there is nothing left to pay with.
    expect(core.nodes.filter((n) => n.state === 'tooShort')).toHaveLength(4 * 3);
  });

  it('counts what each branch has taken against the whole of it', () => {
    const justice = branchIds('justice');
    const bought = [PALACE_CORE_ID, ...justice.slice(0, 3)];
    const view = palaceView(PALACE, bought, 10);
    const branch = view.branches.find((b) => b.element === 'justice');
    expect(branch?.owned).toBe(3);
    expect(branch?.spent).toBe(3);
    expect(branch?.nodes).toBe(justice.length);
    expect(view.branches.filter((b) => b.owned === 0)).toHaveLength(3);
    expect(view.ledger).toEqual({ earned: 10, spent: 4, available: 6 });
    expect(view.branches.reduce((sum, b) => sum + b.total, 0) + 1).toBe(PALACE_TREE_COST);
    expect(view.links.filter((link) => link.state === 'owned')).toHaveLength(3);
  });

  it('has a glyph for every kind of node the tree grows', () => {
    const names = [...new Set(PALACE.nodes.map((node) => node.name))].sort();
    expect(Object.keys(NODE_GLYPH).sort()).toEqual(names);
    for (const name of names) expect(nodeGlyph(name)).toMatch(/^glyph\./);
  });
});
