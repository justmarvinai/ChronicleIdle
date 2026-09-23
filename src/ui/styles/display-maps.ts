/**
 * Display mappings shared by cards, badges and lists: rarity/element/role colours and glyphs
 * (docs/tech/UI_DESIGN.md §3 tokens). Gameplay meaning lives in content; this is presentation only.
 */
import type { GlyphKey } from '@assets/manifest.generated';
import type { BoostId } from '@content/balance/boosts';
import type { ShardId } from '@content/balance/summon';
import type { Element, GearSlot, Rarity, Role, StatId } from '@content/champions/types';

export type { Element, GearSlot, Rarity, Role, StatId };

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
/**
 * The light inside each shard, as the gate draws it (`SHARD_CRYSTALS` in the ritual scene): the
 * Portal's rail, nameplate and card backs glow in it. `display-maps.test.ts` keeps them in step.
 */
export const SHARD_HEX: Record<ShardId, string> = {
  faded: '#7fe05a',
  ancient: '#ffb640',
  sacred: '#ffe27a',
  primordial: '#4ff0c0',
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

/**
 * A mark for each of the eight stats, beside its name wherever a champion's stats are listed. They
 * are the Glorious Palace's marks for the nodes that grant each stat — Vigour's potion for HP, Keen
 * Eye's bow for crit rate — so a stat reads the same on the champion as on the tree that raises it;
 * a test holds the two tables together.
 */
export const STAT_GLYPH: Record<StatId, GlyphKey> = {
  hp: 'glyph.health_potion',
  atk: 'glyph.spiked_cleaver',
  def: 'glyph.shield_block',
  spd: 'glyph.magic_feather',
  critRate: 'glyph.bow_and_arrow',
  critDmg: 'glyph.exploding_bomb',
  res: 'glyph.nature_shield',
  acc: 'glyph.magic_arrow',
};

/** Deco-frame tints for mode/feature cards (gold when open, ash when gated). */
export const CARD_TINT = { unlocked: '#c9a24a', locked: '#5a554e' } as const;
export const CARD_FRAME = { unlocked: 13, locked: 16 } as const;

/**
 * The three boosts (docs/design/MARKET.md §4), for the header pills and the Bag.
 *
 * Each takes a colour it does not share with a rarity or an element, so a live boost is never
 * mistaken for a piece of gear or a champion's affinity at a glance.
 */
export const BOOST_GLYPH: Record<BoostId, GlyphKey> = {
  champion_xp: 'glyph.shooting_stars',
  player_xp: 'glyph.celestial_body',
  brewery: 'glyph.health_potion',
};

export const BOOST_TINT: Record<BoostId, string> = {
  champion_xp: '#6fc3e8',
  player_xp: '#e8c76f',
  brewery: '#8fd48a',
};
