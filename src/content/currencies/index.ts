import { defineCurrency } from '@content/define';
import type { CurrencyDef, CurrencyId } from './types';

const c = (
  def: Omit<CurrencyDef, 'name' | 'description' | 'version'> & { version?: number },
): CurrencyDef => ({
  name: `currency.${def.id}.name`,
  description: `currency.${def.id}.description`,
  version: 1,
  ...def,
});

/** Definitions in display order (docs/design/ECONOMY.md §2). */
export const CURRENCIES: readonly CurrencyDef[] = [
  defineCurrency(c({ id: 'gold', icon: 'ui.stone_vine.icon_coins', category: 'core', topBar: true })),
  defineCurrency(c({ id: 'gems', icon: 'spell.rune_radiant_gem', category: 'core', topBar: true })),
  defineCurrency(c({ id: 'energy', icon: 'spell.fx_storm_bolt', category: 'core', topBar: true })),
  defineCurrency(c({ id: 'key_daily', icon: 'ui.stone_vine.icon_key', category: 'keys', topBar: false })),
  defineCurrency(
    c({ id: 'key_weekly', icon: 'ui.stone_vine.icon_key', tint: '#9b5de5', category: 'keys', topBar: false }),
  ),
  defineCurrency(
    c({ id: 'shard_faded', icon: 'spell.earth_dark_crystal', category: 'shards', topBar: false }),
  ),
  defineCurrency(
    c({ id: 'shard_ancient', icon: 'spell.earth_sapphire_shard', category: 'shards', topBar: false }),
  ),
  defineCurrency(
    c({ id: 'shard_sacred', icon: 'spell.earth_citrine_shard', category: 'shards', topBar: false }),
  ),
  defineCurrency(
    c({ id: 'shard_primordial', icon: 'spell.earth_amethyst_cluster', category: 'shards', topBar: false }),
  ),
  defineCurrency(
    c({
      id: 'brew_justice',
      icon: 'ui.stone_vine.icon_potion',
      tint: '#e8c15a',
      category: 'brews',
      topBar: false,
    }),
  ),
  defineCurrency(
    c({
      id: 'brew_valor',
      icon: 'ui.stone_vine.icon_potion',
      tint: '#d7433f',
      category: 'brews',
      topBar: false,
    }),
  ),
  defineCurrency(
    c({
      id: 'brew_faith',
      icon: 'ui.stone_vine.icon_potion',
      tint: '#4aa3df',
      category: 'brews',
      topBar: false,
    }),
  ),
  defineCurrency(
    c({
      id: 'brew_eclipse',
      icon: 'ui.stone_vine.icon_potion',
      tint: '#9b5de5',
      category: 'brews',
      topBar: false,
    }),
  ),
  defineCurrency(
    c({
      id: 'brew_universal',
      icon: 'ui.stone_vine.icon_potion',
      tint: '#f3ecdc',
      category: 'brews',
      topBar: false,
    }),
  ),
  defineCurrency(
    c({
      id: 'tome_rare',
      icon: 'ui.stone_vine.icon_scroll',
      tint: '#3f8fe6',
      category: 'tomes',
      topBar: false,
    }),
  ),
  defineCurrency(
    c({
      id: 'tome_epic',
      icon: 'ui.stone_vine.icon_scroll',
      tint: '#a35de3',
      category: 'tomes',
      topBar: false,
    }),
  ),
  defineCurrency(
    c({
      id: 'tome_legendary',
      icon: 'ui.stone_vine.icon_scroll',
      tint: '#f2a93b',
      category: 'tomes',
      topBar: false,
    }),
  ),
  defineCurrency(
    c({
      id: 'tome_mythic',
      icon: 'ui.stone_vine.icon_scroll',
      tint: '#ff4d6d',
      category: 'tomes',
      topBar: false,
    }),
  ),
  defineCurrency(
    c({ id: 'mat_scrap_iron', icon: 'spell.earth_fractured_block', category: 'materials', topBar: false }),
  ),
  defineCurrency(
    c({ id: 'mat_ember_alloy', icon: 'spell.earth_molten_vein', category: 'materials', topBar: false }),
  ),
  defineCurrency(
    c({ id: 'mat_starsteel', icon: 'spell.earth_star_medallion', category: 'materials', topBar: false }),
  ),
  defineCurrency(
    c({ id: 'mat_arcane_dust', icon: 'spell.rune_astral_burst', category: 'materials', topBar: false }),
  ),
  defineCurrency(
    c({ id: 'mat_refining_core', icon: 'spell.earth_geode_crystal', category: 'materials', topBar: false }),
  ),
  defineCurrency(
    c({ id: 'mat_glyph_sigil', icon: 'spell.rune_gilded_script', category: 'materials', topBar: false }),
  ),
];

export const CURRENCY_BY_ID: Readonly<Record<CurrencyId, CurrencyDef>> = Object.fromEntries(
  CURRENCIES.map((def) => [def.id, def]),
) as Record<CurrencyId, CurrencyDef>;
