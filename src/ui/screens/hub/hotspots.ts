import type { FeatureId } from '@content/balance/unlocks';
import type { GlyphKey } from '@assets/manifest.generated';
import type { I18nKey } from '@i18n/index';
import type { GlowPoint } from '@render/ambient/presets';
import type { Route } from '@state/ui-types';

/** Stage-space (1920×1080) placement of Emberhold's buildings on the `bg8` artwork. */
export interface HubHotspotDef {
  id: string;
  labelKey: I18nKey;
  x: number;
  y: number;
  /** Ring diameter in px. */
  size: number;
  glyph: GlyphKey;
  feature: FeatureId | 'later-phase';
  /** Screen opened when unlocked; absent while the feature's screen is a later chapter. */
  route?: Route;
  /** Accent colour of the ring/glow. */
  color: string;
  labelBelow?: boolean;
}

export const HUB_HOTSPOTS: readonly HubHotspotDef[] = [
  {
    id: 'campaign',
    labelKey: 'hub.campaign',
    x: 1330,
    y: 262,
    size: 150,
    glyph: 'glyph.crossed_swords',
    feature: 'campaign',
    route: { name: 'game-modes' },
    color: '#e8c15a',
    labelBelow: true,
  },
  {
    id: 'portal',
    labelKey: 'hub.portal',
    x: 804,
    y: 545,
    size: 150,
    glyph: 'glyph.arcane_symbol',
    feature: 'summoning',
    color: '#9b5de5',
    labelBelow: false,
  },
  {
    id: 'tavern',
    labelKey: 'hub.tavern',
    x: 1770,
    y: 470,
    size: 140,
    glyph: 'glyph.health_potion',
    feature: 'tavern_level',
    color: '#f2a93b',
    labelBelow: true,
  },
  {
    id: 'forge',
    labelKey: 'hub.forge',
    x: 170,
    y: 395,
    size: 130,
    glyph: 'glyph.hammer_hit',
    feature: 'forge',
    color: '#d8552f',
    labelBelow: true,
  },
  {
    id: 'champions',
    labelKey: 'hub.champions',
    x: 470,
    y: 560,
    size: 130,
    glyph: 'glyph.cloaked_figure',
    feature: 'champions',
    route: { name: 'champions' },
    color: '#4aa3df',
    labelBelow: true,
  },
  {
    id: 'hall',
    labelKey: 'hub.chroniclersHall',
    x: 1030,
    y: 520,
    size: 130,
    glyph: 'glyph.spell_book',
    feature: 'missions',
    color: '#c9a24a',
    labelBelow: true,
  },
  {
    id: 'market',
    labelKey: 'hub.market',
    x: 1650,
    y: 690,
    size: 120,
    glyph: 'glyph.trophy_cup',
    feature: 'later-phase',
    color: '#8d8577',
    labelBelow: true,
  },
  {
    id: 'idle',
    labelKey: 'hub.idleChest',
    x: 250,
    y: 800,
    size: 130,
    glyph: 'glyph.hourglass',
    feature: 'idle_chest',
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
