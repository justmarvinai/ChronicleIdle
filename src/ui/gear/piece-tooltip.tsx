import type { ReactNode } from 'react';
import type { GearInstance } from '@engine/gear/instance';
import { GEAR_TOOLTIP_WIDTH, GearTooltip } from './GearTooltip';

/**
 * The two `GearCard` props that give a card its tooltip, for a spread beside `pieceArtwork`:
 * `<GearCard {...pieceArtwork(piece)} {...pieceTooltip(piece)} … />`.
 */
export function pieceTooltip(piece: GearInstance): { tooltip: ReactNode; tooltipWidth: number } {
  return { tooltip: <GearTooltip piece={piece} />, tooltipWidth: GEAR_TOOLTIP_WIDTH };
}
