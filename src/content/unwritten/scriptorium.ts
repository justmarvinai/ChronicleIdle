/**
 * The Scriptorium (docs/design/UNWRITTEN.md §15): sixteen folios in four shelves, bought with
 * Recovered Pages and never lost. A shelf opens when two folios of the shelf below are written.
 */
import { folio, rule } from './dsl';
import type { ScriptoriumDef } from './types';

export const SCRIPTORIUM: readonly ScriptoriumDef[] = [
  folio({
    slug: 'deeper_purse',
    shelf: 1,
    cost: 80,
    icon: 'glyph.coin_purse',
    rules: [rule('start_gilt', 30)],
  }),
  folio({
    slug: 'field_dressing',
    shelf: 1,
    cost: 80,
    icon: 'glyph.health_potion',
    rules: [rule('heal_after_victory', 0.04)],
  }),
  folio({
    slug: 'steady_hand',
    shelf: 1,
    cost: 100,
    icon: 'glyph.magic_feather',
    rules: [rule('rerolls_per_folio', 1)],
  }),
  folio({
    slug: 'keen_reader',
    shelf: 1,
    cost: 120,
    icon: 'glyph.evil_eye',
    rules: [rule('keen_reader', 1)],
  }),
  folio({
    slug: 'echo_calling',
    shelf: 2,
    cost: 200,
    icon: 'glyph.cloaked_figure',
    rules: [rule('echo_passages', 1)],
  }),
  folio({
    slug: 'wider_company',
    shelf: 2,
    cost: 250,
    icon: 'glyph.shield_block',
    rules: [rule('company_cap', 1)],
  }),
  folio({
    slug: 'rekindling',
    shelf: 2,
    cost: 250,
    icon: 'glyph.phoenix',
    rules: [rule('rekindle_tokens', 1)],
  }),
  folio({
    slug: 'reliquary_rights',
    shelf: 2,
    cost: 300,
    icon: 'glyph.chest',
    rules: [rule('reliquary_choice', 1)],
  }),
  folio({
    slug: 'gilded_margins',
    shelf: 3,
    cost: 400,
    icon: 'glyph.burning_scroll',
    rules: [rule('pages_mult', 0.2)],
  }),
  folio({
    slug: 'second_volume',
    shelf: 3,
    cost: 450,
    icon: 'glyph.spell_book',
    rules: [rule('volume_inscriptions', 2)],
  }),
  folio({
    slug: 'illuminators_eye',
    shelf: 3,
    cost: 500,
    icon: 'glyph.shooting_stars',
    rules: [rule('offer_size', 1)],
  }),
  folio({
    slug: 'blended_inks',
    shelf: 3,
    cost: 600,
    icon: 'glyph.spirit_vortex',
    rules: [rule('blends', 1)],
  }),
  folio({
    slug: 'veterans_start',
    shelf: 4,
    cost: 800,
    icon: 'glyph.trophy_cup',
    rules: [rule('start_rare_inscriptions', 1)],
  }),
  folio({
    slug: 'third_volume',
    shelf: 4,
    cost: 900,
    icon: 'glyph.arcane_symbol',
    rules: [rule('volume_relics', 3)],
  }),
  folio({
    slug: 'larger_company',
    shelf: 4,
    cost: 1_000,
    icon: 'glyph.holy_totem',
    rules: [rule('company_cap', 1)],
  }),
  folio({
    slug: 'masters_hand',
    shelf: 4,
    cost: 1_200,
    icon: 'glyph.quill',
    rules: [rule('offer_legendary_skirmish', 1)],
  }),
];
