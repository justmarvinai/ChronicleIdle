/**
 * Shape of the generated asset manifest (`public/assets/generated/manifest.json`).
 * Written by `tools/assets/build.ts`, read at boot by `@assets/manifest`. This module is a leaf:
 * it imports nothing and may be imported by every layer.
 */

export type AssetGroup =
  | 'ui'
  | 'hub'
  | 'title'
  | 'models'
  | 'avatars'
  | 'backdrops'
  | 'spells'
  | 'audio'
  | 'ambience'
  | 'music'
  | 'vfx'
  | 'logos';

export interface ImageVariant {
  url: string;
  w: number;
  h: number;
}

export interface AtlasFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AtlasAnimation {
  frames: string[];
  fps: number;
  loop: boolean;
}

export interface ImageEntry {
  kind: 'image';
  group: AssetGroup;
  url: string;
  w: number;
  h: number;
}

export interface ImageSetEntry {
  kind: 'image-set';
  group: AssetGroup;
  /** e.g. `1024`, `512`, `256`, `128`, `full`, `thumb` */
  sizes: Record<string, ImageVariant>;
  /** Tiny blurred data URI used while the real image streams in. */
  placeholder?: string;
}

export interface SvgEntry {
  kind: 'svg';
  group: AssetGroup;
  url: string;
}

export interface AtlasEntry {
  kind: 'atlas';
  group: AssetGroup;
  url: string;
  json: string;
  w: number;
  h: number;
  frames: Record<string, AtlasFrame>;
  animations: Record<string, AtlasAnimation>;
  /** Which way the source art faces; the presenter flips as needed. */
  facing: 'left' | 'right';
}

export interface AudioVariant {
  url: string;
  /** seconds; 0 when unknown (MP3 sources are not decoded at build time) */
  duration: number;
  /** RMS level in dBFS of the whole file; 0 when unknown */
  rmsDb: number;
}

export interface AudioEntry {
  kind: 'audio';
  group: AssetGroup;
  loop: boolean;
  variants: AudioVariant[];
}

export interface FxEntry {
  kind: 'fx';
  group: AssetGroup;
  url: string;
  w: number;
  h: number;
  frameW: number;
  frameH: number;
  cols: number;
  frames: number;
  fps: number;
}

export type AssetEntry = ImageEntry | ImageSetEntry | SvgEntry | AtlasEntry | AudioEntry | FxEntry;

export interface AssetManifest {
  version: string;
  generatedAt: string;
  entries: Record<string, AssetEntry>;
  groups: Record<AssetGroup, string[]>;
}
