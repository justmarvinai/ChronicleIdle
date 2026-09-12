import type { AssetKey } from '@assets/manifest.generated';

/** All wallet currencies of EA-0.1 (docs/design/ECONOMY.md §2). Order = display order. */
export const CURRENCY_IDS = [
  'gold',
  'gems',
  'energy',
  'key_daily',
  'key_weekly',
  'shard_faded',
  'shard_ancient',
  'shard_sacred',
  'shard_primordial',
  'brew_justice',
  'brew_valor',
  'brew_faith',
  'brew_eclipse',
  'brew_universal',
  'tome_rare',
  'tome_epic',
  'tome_legendary',
  'tome_mythic',
  'mat_scrap_iron',
  'mat_ember_alloy',
  'mat_starsteel',
  'mat_arcane_dust',
  'mat_refining_core',
  'mat_glyph_sigil',
] as const;

export type CurrencyId = (typeof CURRENCY_IDS)[number];

export type CurrencyCategory = 'core' | 'keys' | 'shards' | 'brews' | 'tomes' | 'materials';

export interface CurrencyDef {
  id: CurrencyId;
  /** i18n key of the display name. */
  name: string;
  /** i18n key of the short description shown in tooltips. */
  description: string;
  icon: AssetKey;
  /** Optional CSS colour multiplied onto the icon (brews/tomes/keys reuse one icon). */
  tint?: string;
  category: CurrencyCategory;
  /** Shown in the top bar of every screen. */
  topBar: boolean;
  version: number;
}

export interface CurrencyAmount {
  currency: CurrencyId;
  amount: number;
}
