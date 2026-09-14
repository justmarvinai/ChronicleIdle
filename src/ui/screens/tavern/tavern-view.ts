/**
 * Display helpers for the Tavern (docs/tech/UI_DESIGN.md §5.5). Everything here is derived from
 * the roster and the engine's own numbers — the screen never invents a cost or a rule.
 */
import type { AbilityUpgrade, ChampionDef, Rarity } from '@content/champions/types';
import type { CurrencyId } from '@content/currencies/types';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import { content } from '@content/registry';
import type { ChampionInstance, Roster } from '@engine/champions/instance';
import {
  BREW_OF_ELEMENT,
  UNIVERSAL_BREW,
  foodXp,
  isEdible,
  type Offering,
} from '@engine/progression/tavern-level';
import { rankRequirement } from '@engine/progression/tavern-rank';
import { t, translate, type I18nKey } from '@i18n/index';

export interface FoodEntry {
  instance: ChampionInstance;
  def: ChampionDef;
  name: string;
  /** What this companion is worth on the Level track. */
  xp: number;
}

/** Companions that may be spent, most worthless first — the order the table fills in. */
export function foodEntries(roster: Roster, targetId: string, mode: 'level' | 'rank'): FoodEntry[] {
  const target = roster[targetId];
  const need = target && mode === 'rank' ? rankRequirement(target.stars) : null;
  const entries: FoodEntry[] = [];
  for (const instance of Object.values(roster)) {
    if (!isEdible(instance, targetId)) continue;
    if (need && instance.stars !== need.foodStars) continue;
    const def = content.championById(instance.defId);
    if (!def) continue;
    entries.push({ instance, def, name: translate(def.name), xp: foodXp(def, instance) });
  }
  return entries.sort(
    (a, b) => a.xp - b.xp || a.instance.acquiredAt - b.instance.acquiredAt || a.name.localeCompare(b.name),
  );
}

/** The brew the champion drinks best, then the rest — the order the brew row is laid out in. */
export function brewOrder(def: ChampionDef | undefined): CurrencyId[] {
  const own = def ? BREW_OF_ELEMENT[def.element] : undefined;
  const rest = [...Object.values(BREW_OF_ELEMENT), UNIVERSAL_BREW].filter((id) => id !== own);
  return own ? [own, ...rest] : rest;
}

export function brewName(currency: CurrencyId): string {
  return translate(CURRENCY_BY_ID[currency].name);
}

/** Rarities worth a second thought before they are eaten (`UI_DESIGN.md` §5.5). */
const PRECIOUS: readonly Rarity[] = ['rare', 'epic', 'legendary', 'mythic'];

/** Reasons to stop and ask: a rare guest, or one somebody has already spent brews on. */
export function foodWarnings(roster: Roster, foodIds: readonly string[]): string[] {
  const warnings: string[] = [];
  for (const id of foodIds) {
    const instance = roster[id];
    const def = instance ? content.championById(instance.defId) : undefined;
    if (!instance || !def) continue;
    const name = translate(def.name);
    if (PRECIOUS.includes(def.rarity))
      warnings.push(t('tavern.confirm.rare', { name, rarity: t(`rarity.${def.rarity}` as I18nKey) }));
    if (instance.level > 1) warnings.push(t('tavern.confirm.levelled', { name, level: instance.level }));
  }
  return warnings;
}

/** One line of plain English for an upgrade step. */
export function upgradeLabel(step: AbilityUpgrade): string {
  return t(`tavern.skills.effect.${step.type}` as I18nKey, { value: step.value });
}

export const EMPTY_TABLE: Offering = { brews: {}, food: [] };

/** Brew counts as a plain list, in the row's order, for the cost pill. */
export function brewList(offering: Offering): { currency: CurrencyId; amount: number }[] {
  return Object.entries(offering.brews)
    .map(([currency, amount]) => ({ currency: currency as CurrencyId, amount: amount ?? 0 }))
    .filter((entry) => entry.amount > 0);
}
