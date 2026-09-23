/** The tiles a result draws its spoils as (docs/tech/UI_DESIGN.md §5.10), built from what a fight paid. */
import type { ReactNode } from 'react';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyId } from '@content/currencies/types';
import { t, translate } from '@i18n/index';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { BOOST_GLYPH, BOOST_TINT } from '@ui/styles/display-maps';

/** A tile's icon, in stage pixels. */
const TILE_ICON = 44;

/** A currency's gold, the XPs' blue, and a prize worth its own light (a shard). */
export type TileTone = 'gold' | 'xp' | 'rare';

export interface RewardTile {
  id: string;
  icon: ReactNode;
  amount: string;
  label: string;
  tone: TileTone;
}

/** A currency as a tile: its icon, what came in, its name. */
export function currencyTile(currency: CurrencyId, amount: number, tone: TileTone = 'gold'): RewardTile {
  const def = CURRENCY_BY_ID[currency];
  return {
    id: currency,
    icon: <TintedIcon asset={def.icon} tint={def.tint} size={TILE_ICON} label="" />,
    amount: `+${amount.toLocaleString('en-US')}`,
    label: translate(def.name),
    tone,
  };
}

/** Champion XP (paid to each fielded champion) or the chronicle's own, under its boost's mark. */
export function xpTile(kind: 'champion' | 'player', amount: number): RewardTile {
  const boost = kind === 'champion' ? 'champion_xp' : 'player_xp';
  return {
    id: boost,
    icon: <Glyph glyph={BOOST_GLYPH[boost]} size={TILE_ICON - 8} color={BOOST_TINT[boost]} />,
    amount: `+${amount.toLocaleString('en-US')}`,
    label: t(kind === 'champion' ? 'battleResult.championXpLabel' : 'battleResult.playerXpLabel'),
    tone: 'xp',
  };
}
