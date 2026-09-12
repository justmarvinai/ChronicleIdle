/**
 * Display mappings shared by cards, badges and lists: rarity/element/role colours and glyphs
 * (docs/tech/UI_DESIGN.md §3 tokens). Gameplay meaning lives in content; this is presentation only.
 */
import type { GlyphKey } from '@assets/manifest.generated';
import type { Element, GearSlot, Rarity, Role } from '@content/champions/types';

export type { Element, GearSlot, Rarity, Role };

export const RARITY_COLOR: Record<Rarity, string> = {
  common: 'var(--r-common)',
  uncommon: 'var(--r-uncommon)',
  rare: 'var(--r-rare)',
  epic: 'var(--r-epic)',
  legendary: 'var(--r-legendary)',
  mythic: 'var(--r-mythic)',
};
/** Literal hex values for places that cannot read CSS variables (canvas tints, Pixi). */
export const RARITY_HEX: Record<Rarity, string> = {
  common: '#9a9a9a',
  uncommon: '#4fc267',
  rare: '#3f8fe6',
  epic: '#a35de3',
  legendary: '#f2a93b',
  mythic: '#ff4d6d',
};
export const ELEMENT_COLOR: Record<Element, string> = {
  justice: 'var(--el-justice)',
  valor: 'var(--el-valor)',
  faith: 'var(--el-faith)',
  eclipse: 'var(--el-eclipse)',
};
export const ELEMENT_GLYPH: Record<Element, GlyphKey> = {
  justice: 'glyph.holy_cross',
  valor: 'glyph.flaming_skull',
  faith: 'glyph.peace_dove',
  eclipse: 'glyph.celestial_body',
};
export const ROLE_GLYPH: Record<Role, GlyphKey> = {
  attack: 'glyph.crossed_swords',
  defense: 'glyph.shield_block',
  health: 'glyph.health_potion',
  support: 'glyph.holy_totem',
};
export const SLOT_GLYPH: Record<GearSlot, GlyphKey> = {
  weapon: 'glyph.spiked_cleaver',
  helmet: 'glyph.cloaked_figure',
  shield: 'glyph.shield_block',
  gauntlets: 'glyph.fist_punch',
  chestplate: 'glyph.ribcage_armor',
  boots: 'glyph.stomp_impact',
};

/** Deco-frame tints for mode/feature cards (gold when open, ash when gated). */
export const CARD_TINT = { unlocked: '#c9a24a', locked: '#5a554e' } as const;
export const CARD_FRAME = { unlocked: 13, locked: 16 } as const;
