/**
 * The Unwritten's visual vocabulary (docs/tech/UI_DESIGN.md §5.32): the glyph each passage is
 * marked with on the map, and the colour each ink is written in. Inks wear their elements' colours
 * so an inscription reads the same everywhere the game shows that element.
 */
import type { GlyphKey } from '@assets/manifest.generated';
import type { InkId, InscriptionRarity, PassageKind } from '@content/unwritten/types';
import type { UnwrittenKey } from './strings';

export const PASSAGE_GLYPH: Readonly<Record<PassageKind, GlyphKey>> = {
  skirmish: 'glyph.crossed_swords',
  elite: 'glyph.spiked_cleaver',
  warden: 'glyph.skull_wreath',
  mystery: 'glyph.quill',
  shrine: 'glyph.candle',
  peddler: 'glyph.coin_purse',
  reliquary: 'glyph.chest',
  echo: 'glyph.cloaked_figure',
};

/** The tint a passage's glyph takes: fights in ember, the Warden in blood, the rest in pale ink. */
export const PASSAGE_TINT: Readonly<Record<PassageKind, string>> = {
  skirmish: '#e7cfa0',
  elite: '#ff9a5a',
  warden: '#ff5b5b',
  mystery: '#c9b6ff',
  shrine: '#9fe3c2',
  peddler: '#f0d57a',
  reliquary: '#f2a93b',
  echo: '#8ecbff',
};

export const PASSAGE_NAME: Readonly<Record<PassageKind, UnwrittenKey>> = {
  skirmish: 'unwritten.ui.passage.skirmish',
  elite: 'unwritten.ui.passage.elite',
  warden: 'unwritten.ui.passage.warden',
  mystery: 'unwritten.ui.passage.mystery',
  shrine: 'unwritten.ui.passage.shrine',
  peddler: 'unwritten.ui.passage.peddler',
  reliquary: 'unwritten.ui.passage.reliquary',
  echo: 'unwritten.ui.passage.echo',
};

export const PASSAGE_HINT: Readonly<Record<PassageKind, UnwrittenKey>> = {
  skirmish: 'unwritten.ui.passage.skirmish.hint',
  elite: 'unwritten.ui.passage.elite.hint',
  warden: 'unwritten.ui.passage.warden.hint',
  mystery: 'unwritten.ui.passage.mystery.hint',
  shrine: 'unwritten.ui.passage.shrine.hint',
  peddler: 'unwritten.ui.passage.peddler.hint',
  reliquary: 'unwritten.ui.passage.reliquary.hint',
  echo: 'unwritten.ui.passage.echo.hint',
};

export const INK_COLOUR: Readonly<Record<InkId, string>> = {
  gold: 'var(--el-justice)',
  crimson: 'var(--el-valor)',
  azure: 'var(--el-faith)',
  violet: 'var(--el-eclipse)',
};

export const INK_NAME: Readonly<Record<InkId, UnwrittenKey>> = {
  gold: 'unwritten.ink.gold.name',
  crimson: 'unwritten.ink.crimson.name',
  azure: 'unwritten.ink.azure.name',
  violet: 'unwritten.ink.violet.name',
};

export const RARITY_COLOUR: Readonly<Record<InscriptionRarity, string>> = {
  common: 'var(--r-common)',
  rare: 'var(--r-rare)',
  epic: 'var(--r-epic)',
  legendary: 'var(--r-legendary)',
};

export const RARITY_NAME: Readonly<Record<InscriptionRarity, UnwrittenKey>> = {
  common: 'unwritten.ui.rarity.common',
  rare: 'unwritten.ui.rarity.rare',
  epic: 'unwritten.ui.rarity.epic',
  legendary: 'unwritten.ui.rarity.legendary',
};

/** Roman numerals for levels, Omens and folios: I–XV is all the Unwritten counts to. */
export function numeral(n: number): string {
  const table: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  if (n <= 0) return '0';
  let rest = n;
  let out = '';
  for (const [value, mark] of table)
    while (rest >= value) {
      out += mark;
      rest -= value;
    }
  return out;
}

/** How long an expedition took: m:ss, or h:mm:ss for a long one. */
export function duration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
