import type { HTMLAttributes, ReactNode } from 'react';
import type { KitKey } from '@ui/styles/kit';
import { KitSurface } from './KitSurface';

export type PanelKind =
  'stone' | 'arch' | 'ember-wide' | 'ember-tall' | 'ornate-wide' | 'ornate-tall' | 'thin' | 'bevel';

const PANELS: Record<
  PanelKind,
  { frame: KitKey; fill?: KitKey; scale: number; fillScale: number; pad: number }
> = {
  stone: {
    frame: 'ui.stone_vine.panel_stone',
    fill: 'ui.stone_vine.panel_stone_fill',
    scale: 0.5,
    fillScale: 0.5,
    pad: 24,
  },
  arch: {
    frame: 'ui.stone_vine.panel_arch',
    fill: 'ui.stone_vine.panel_arch_fill',
    scale: 0.5,
    fillScale: 0.5,
    pad: 28,
  },
  'ember-wide': {
    frame: 'ui.dark_ember.frame_wide',
    fill: 'ui.dark_ember.bg_wide',
    scale: 0.7,
    fillScale: 0.5,
    pad: 20,
  },
  'ember-tall': {
    frame: 'ui.dark_ember.frame_tall',
    fill: 'ui.dark_ember.bg_tall',
    scale: 0.7,
    fillScale: 0.5,
    pad: 20,
  },
  'ornate-wide': { frame: 'ui.dark_ember.panel_wide_ornate', scale: 0.5, fillScale: 0.5, pad: 40 },
  'ornate-tall': { frame: 'ui.dark_ember.panel_tall_ornate', scale: 0.5, fillScale: 0.5, pad: 40 },
  thin: {
    frame: 'ui.dark_ember.frame_sm_thin',
    fill: 'ui.dark_ember.bg_tile_sm',
    scale: 0.7,
    fillScale: 0.5,
    pad: 16,
  },
  bevel: {
    frame: 'ui.dark_ember.frame_sm_bevel',
    fill: 'ui.dark_ember.bg_tile_sm',
    scale: 0.6,
    fillScale: 0.5,
    pad: 18,
  },
};

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  kind?: PanelKind;
  /** Padding inside the frame's ring (the ring's thickness is added). */
  padding?: number;
  /** Layout classes for the content box. */
  contentClassName?: string | undefined;
  children?: ReactNode;
}

/** Textured panel: a kit frame over a kit fill (docs/tech/UI_DESIGN.md §4). */
export function Panel({ kind = 'stone', padding, ...rest }: PanelProps) {
  const meta = PANELS[kind];
  return (
    <KitSurface
      frame={meta.frame}
      fill={meta.fill}
      scale={meta.scale}
      fillScale={meta.fillScale}
      padding={padding ?? meta.pad}
      {...rest}
    />
  );
}
