import type { FeatureId } from '@content/balance/unlocks';
import type { FxKey, GlyphKey } from '@assets/manifest.generated';
import type { I18nKey } from '@i18n/index';
import type { GlowPoint } from '@render/ambient/presets';
import type { DialogRoute, Route } from '@state/ui-types';

/** Stage-space (1920×1080) placement of Emberhold's buildings on the `bg8` artwork. */
export interface HubHotspotDef {
  id: string;
  labelKey: I18nKey;
  /** What the building is for, on the hover card under its name. */
  hintKey: I18nKey;
  x: number;
  y: number;
  /** The medallion's diameter in px: the grander the building, the larger its mark. */
  size: number;
  glyph: GlyphKey;
  feature: FeatureId | 'later-phase';
  /** Screen opened when unlocked; absent while the feature's screen is a later chapter. */
  route?: Route;
  /** Dialog opened when unlocked, for buildings that are a panel rather than a screen. */
  dialog?: DialogRoute;
  /**
   * What the lock says for a building no level opens — the Palace waits on the campaign, not on a
   * level (`isPalaceUnlocked`). The Locked screen prints the same line.
   */
  reasonKey?: I18nKey;
  /** Accent colour of the medallion's light and the plate's hairline. */
  color: string;
  /** A flipbook turning behind the medallion once the building is open: the Portal's runes. */
  aura?: FxKey;
  labelBelow?: boolean;
}

export const HUB_HOTSPOTS: readonly HubHotspotDef[] = [
  {
    id: 'campaign',
    labelKey: 'hub.campaign',
    hintKey: 'hub.hint.campaign',
    x: 1330,
    y: 262,
    size: 108,
    glyph: 'glyph.crossed_swords',
    feature: 'campaign',
    route: { name: 'game-modes' },
    color: '#e8c15a',
    labelBelow: true,
  },
  {
    id: 'portal',
    labelKey: 'hub.portal',
    hintKey: 'hub.hint.portal',
    x: 804,
    y: 545,
    size: 108,
    glyph: 'glyph.arcane_symbol',
    feature: 'summoning',
    route: { name: 'portal' },
    color: '#9b5de5',
    aura: 'fx.gen.rune_ring',
    labelBelow: false,
  },
  {
    id: 'tavern',
    labelKey: 'hub.tavern',
    hintKey: 'hub.hint.tavern',
    x: 1770,
    y: 470,
    size: 100,
    glyph: 'glyph.health_potion',
    feature: 'tavern_level',
    route: { name: 'tavern' },
    color: '#f2a93b',
    labelBelow: true,
  },
  {
    id: 'forge',
    labelKey: 'hub.forge',
    hintKey: 'hub.hint.forge',
    x: 170,
    y: 395,
    size: 96,
    glyph: 'glyph.hammer_hit',
    feature: 'forge',
    route: { name: 'forge' },
    color: '#d8552f',
    labelBelow: true,
  },
  {
    id: 'champions',
    labelKey: 'hub.champions',
    hintKey: 'hub.hint.champions',
    x: 470,
    y: 560,
    size: 96,
    glyph: 'glyph.cloaked_figure',
    feature: 'champions',
    route: { name: 'champions' },
    color: '#4aa3df',
    labelBelow: true,
  },
  {
    /* The lit keep on the hill, top right of the Emberhold artwork. */
    id: 'palace',
    labelKey: 'hub.palace',
    hintKey: 'hub.hint.palace',
    x: 1615,
    y: 232,
    size: 100,
    glyph: 'glyph.eagle_staff',
    feature: 'glorious_palace',
    route: { name: 'palace' },
    reasonKey: 'palace.locked',
    color: '#b07ae8',
    labelBelow: true,
  },
  {
    id: 'hall',
    labelKey: 'hub.chroniclersHall',
    hintKey: 'hub.hint.hall',
    x: 1030,
    y: 520,
    size: 96,
    glyph: 'glyph.spell_book',
    feature: 'missions',
    route: { name: 'missions' },
    color: '#c9a24a',
    labelBelow: true,
  },
  {
    id: 'market',
    labelKey: 'hub.market',
    hintKey: 'hub.hint.market',
    x: 1650,
    y: 690,
    size: 92,
    glyph: 'glyph.trophy_cup',
    feature: 'market',
    route: { name: 'market' },
    color: '#c9a24a',
    labelBelow: true,
  },
  {
    /*
     * The old fountain in the middle of the square: the Deepvein's shaft runs down beneath it
     * (MINE.md). Its ring fills with the store, the way the Idle Chest's fills with its hours.
     */
    id: 'mine',
    labelKey: 'hub.mine',
    hintKey: 'hub.hint.mine',
    x: 1238,
    y: 752,
    size: 96,
    glyph: 'glyph.pickaxe',
    feature: 'mine',
    dialog: { name: 'mine' },
    color: '#5cc6e0',
    labelBelow: true,
  },
  {
    /*
     * The Torn Page: a violet rift hanging over the square, where the Eclipse's torn pages fall
     * into the Unwritten (UNWRITTEN.md §2). It opens with the mode.
     */
    id: 'unwritten',
    labelKey: 'hub.unwritten',
    hintKey: 'hub.hint.unwritten',
    x: 640,
    y: 330,
    size: 96,
    glyph: 'glyph.burning_scroll',
    feature: 'unwritten',
    route: { name: 'unwritten' },
    color: '#8a6fd1',
    aura: 'fx.pixel.nebula',
    labelBelow: true,
  },
  {
    id: 'idle',
    labelKey: 'hub.idleChest',
    hintKey: 'hub.hint.idle',
    x: 250,
    y: 800,
    size: 100,
    glyph: 'glyph.hourglass',
    feature: 'idle_chest',
    dialog: { name: 'idle-chest' },
    color: '#63c96a',
    labelBelow: true,
  },
];

/** Warm lantern and window lights matching the painted light sources. */
export const HUB_GLOWS: GlowPoint[] = [
  { x: 68, y: 598, size: 160, color: 0xffb35c, flicker: 0.45 },
  { x: 236, y: 690, size: 110, color: 0xff9a3c, flicker: 0.3 },
  { x: 840, y: 700, size: 130, color: 0xffb35c, flicker: 0.5 },
  { x: 620, y: 730, size: 120, color: 0xff9a3c, flicker: 0.35 },
  { x: 1300, y: 690, size: 90, color: 0xffc06a, flicker: 0.3 },
  { x: 1580, y: 690, size: 120, color: 0xffb35c, flicker: 0.4 },
  { x: 1700, y: 520, size: 70, color: 0xffd08a, flicker: 0.2 },
  { x: 1808, y: 565, size: 70, color: 0xffd08a, flicker: 0.2 },
  { x: 1660, y: 600, size: 60, color: 0xffd08a, flicker: 0.2 },
  { x: 500, y: 610, size: 60, color: 0xffd08a, flicker: 0.25 },
  { x: 700, y: 615, size: 60, color: 0xffd08a, flicker: 0.25 },
  { x: 1080, y: 600, size: 60, color: 0xffd08a, flicker: 0.25 },
  { x: 1490, y: 250, size: 120, color: 0xa8c4ff, flicker: 0.1 },
  { x: 1245, y: 640, size: 80, color: 0x9fd8ff, flicker: 0.15 },
];
