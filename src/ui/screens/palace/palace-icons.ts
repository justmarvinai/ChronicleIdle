/**
 * One glyph per kind of node in the Glorious Palace.
 *
 * Written out rather than derived: eleven names cover all 133 nodes, and a lookup that guesses
 * from a stat is a lookup that silently draws the wrong icon the day a node grants two. A test
 * holds this table to the names the tree actually uses.
 */
import type { GlyphKey } from '@assets/manifest.generated';

export const NODE_GLYPH: Readonly<Record<string, GlyphKey>> = {
  'palace.node.heart': 'glyph.arcane_symbol',
  'palace.node.vigour': 'glyph.health_potion',
  'palace.node.edge': 'glyph.spiked_cleaver',
  'palace.node.bulwark': 'glyph.shield_block',
  'palace.node.swiftness': 'glyph.magic_feather',
  'palace.node.keenEye': 'glyph.bow_and_arrow',
  'palace.node.cruelty': 'glyph.exploding_bomb',
  'palace.node.warding': 'glyph.nature_shield',
  'palace.node.focus': 'glyph.magic_arrow',
  'palace.node.crown': 'glyph.trophy_cup',
  'palace.node.tempo': 'glyph.hourglass',
  'palace.node.malice': 'glyph.flaming_skull',
};

/** The glyph a node wears; the core's own is the fallback, so a new name is never a missing icon. */
export const nodeGlyph = (name: string): GlyphKey => NODE_GLYPH[name] ?? 'glyph.arcane_symbol';
