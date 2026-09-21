/**
 * What the Glorious Palace adds to a champion (docs/design/GLORIOUS_PALACE.md §4).
 *
 * The Palace is the **last** layer of a champion's stats: `base → + gear flat → × (1 + gear %) →
 * + palace`. Adding it before the percentages would let gear multiply it, which is how a "small
 * permanent floor" quietly turns into a second set of gear. It stays a flat sum, and that is
 * exactly the number the purple line on the champion's sheet prints.
 *
 * The one percentage in the tree — the core node's HP — is taken off the champion's **base** HP
 * for the same reason: a Palace that scaled with gear would scale with itself.
 */
import { STAT_IDS, type ChampionStats, type Element, type StatId } from '@content/champions/types';
import type { PalaceGrants, PalaceNodeDef } from '@content/palace/types';

/** The tree, resolved once from the nodes a chronicle has bought. */
export interface PalaceBonus {
  /** Flat stats a champion of each element gets from its own branch. */
  readonly flat: Readonly<Record<Element, PalaceGrants>>;
  /** Percent of base HP the core node grants every champion, whatever its element. */
  readonly hpPct: number;
  /** How many nodes are bought, so callers can skip the work when nothing is. */
  readonly nodes: number;
}

const EMPTY: Readonly<Record<Element, PalaceGrants>> = {
  justice: {},
  valor: {},
  faith: {},
  eclipse: {},
};

/** A chronicle with nothing bought, and what every caller outside a save passes. */
export const NO_PALACE: PalaceBonus = { flat: EMPTY, hpPct: 0, nodes: 0 };

/**
 * Sums the bought nodes into one bonus per element.
 *
 * `nodeById` is injected rather than imported: the engine may read content *types* but not the
 * content tables (CLAUDE.md §5.1), the same way gear sets are looked up through a function.
 */
export function palaceBonus(
  bought: readonly string[],
  nodeById: (id: string) => PalaceNodeDef | undefined,
): PalaceBonus {
  if (bought.length === 0) return NO_PALACE;
  const flat: Record<Element, Partial<Record<StatId, number>>> = {
    justice: {},
    valor: {},
    faith: {},
    eclipse: {},
  };
  let hpPct = 0;
  let nodes = 0;
  for (const id of bought) {
    const node = nodeById(id);
    if (!node) continue;
    nodes += 1;
    hpPct += node.hpPct;
    if (node.element === null) continue;
    const branch = flat[node.element];
    for (const stat of STAT_IDS) {
      const grant = node.grants[stat];
      if (grant !== undefined) branch[stat] = (branch[stat] ?? 0) + grant;
    }
  }
  return { flat, hpPct, nodes };
}

/**
 * The flat stats one champion gains: its own element's branch, plus the core's percentage of the
 * HP it would have at this star and level without any of this.
 */
export function palaceStats(
  bonus: PalaceBonus,
  element: Element,
  baseHp: number,
): Partial<Record<StatId, number>> {
  if (bonus.nodes === 0) return {};
  const out: Partial<Record<StatId, number>> = { ...bonus.flat[element] };
  if (bonus.hpPct > 0) out.hp = (out.hp ?? 0) + Math.round((baseHp * bonus.hpPct) / 100);
  return out;
}

/** Adds those stats onto a champion's geared stats — the last step, after every multiplier. */
export function withPalace(
  stats: ChampionStats,
  bonus: PalaceBonus,
  element: Element,
  baseHp: number,
): ChampionStats {
  if (bonus.nodes === 0) return stats;
  const gained = palaceStats(bonus, element, baseHp);
  const out = { ...stats };
  for (const stat of STAT_IDS) out[stat] += gained[stat] ?? 0;
  return out;
}
