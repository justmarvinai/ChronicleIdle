/**
 * What the Forge shows: labels for the three tiers, the currency lines a recipe reads as, and
 * the quick picks the dismantle bench offers. The rules are in `@engine/forge/*`.
 */
import { CRAFT_TIERS, CRAFT_TIER, type CraftTier } from '@content/balance/forge';
import type { CurrencyAmount } from '@content/currencies/types';
import type { GearEntry } from '@engine/gear/query';
import { dismantleRefusal } from '@engine/forge/dismantle';
import { t, type I18nKey } from '@i18n/index';

export { CRAFT_TIERS, CRAFT_TIER };
export type { CraftTier };

export const tierLabel = (tier: CraftTier): string => t(`forge.craft.tier.${tier}` as I18nKey);
export const tierBody = (tier: CraftTier): string => t(`forge.craft.tier.${tier}.body` as I18nKey);
export const poolLabel = (tier: CraftTier): string =>
  t(`forge.craft.pool.${CRAFT_TIER[tier].setPool}` as I18nKey);

/** Whether the wallet covers every line of a cost. */
export function affordable(cost: readonly CurrencyAmount[], held: (id: string) => number): boolean {
  return cost.every((entry) => held(entry.currency) >= entry.amount);
}

/** The pieces a dismantle may take: on the racks, unworn and unlocked. */
export function breakable(entries: readonly GearEntry[]): GearEntry[] {
  return entries.filter((entry) => dismantleRefusal(entry.piece) === null);
}

export const QUICK_PICKS = ['common', 'unlevelled', 'lowStar'] as const;
export type QuickPick = (typeof QUICK_PICKS)[number];

export const quickPickLabel = (pick: QuickPick): string => t(`forge.dismantle.quick.${pick}` as I18nKey);

/** The quick picks of `GEAR.md` §6, applied to what is free to break. */
export function quickPick(entries: readonly GearEntry[], pick: QuickPick): string[] {
  const free = breakable(entries);
  const chosen = free.filter((entry) => {
    switch (pick) {
      case 'common':
        return entry.piece.rarity === 'common' || entry.piece.rarity === 'uncommon';
      case 'unlevelled':
        return entry.piece.level === 0;
      case 'lowStar':
        return entry.piece.stars <= 2;
    }
  });
  return chosen.map((entry) => entry.piece.instanceId);
}
