/**
 * The Tavern's Upgrade Level track (docs/design/ECONOMY.md §3.1). An offering of brews and food
 * champions becomes XP; the XP becomes levels up to the star tier's cap; the action costs gold.
 * Pure: the store applies the result and the screen previews it from the same numbers.
 */
import {
  BREW_MATCH_MULT,
  BREW_XP,
  FOOD_LEVEL_BONUS,
  FOOD_XP_BASE,
  RARITY_FOOD_MULT,
  TAVERN_LEVEL_GOLD_PER_LEVEL,
  type ChampionDef,
  type CurrencyId,
  type Element,
} from '@engine/champions/imports';
import type { ChampionInstance, Roster } from '@engine/champions/instance';
import { levelCap } from '@engine/champions/stats';
import { addChampionXp } from '@engine/champions/xp';
import { fail, ok, type Result } from '@engine/errors';

/** Brews by element, and the universal one that never matches (ECONOMY.md §3.1). */
export const BREW_OF_ELEMENT: Readonly<Record<Element, CurrencyId>> = {
  justice: 'brew_justice',
  valor: 'brew_valor',
  faith: 'brew_faith',
  eclipse: 'brew_eclipse',
};
export const UNIVERSAL_BREW: CurrencyId = 'brew_universal';
export const BREW_IDS: readonly CurrencyId[] = [...Object.values(BREW_OF_ELEMENT), UNIVERSAL_BREW];

export function isBrew(currency: CurrencyId): boolean {
  return BREW_IDS.includes(currency);
}

/** `BREW_XP`, times `BREW_MATCH_MULT` when the brew's element is the champion's own. */
export function brewXp(brew: CurrencyId, element: Element): number {
  if (!isBrew(brew)) return 0;
  return brew === BREW_OF_ELEMENT[element] ? Math.round(BREW_XP * BREW_MATCH_MULT) : BREW_XP;
}

/** `FOOD_XP_BASE × RARITY_FOOD_MULT × (1 + FOOD_LEVEL_BONUS × level)` (ECONOMY.md §3.1). */
export function foodXp(def: ChampionDef, food: Pick<ChampionInstance, 'level'>): number {
  return Math.round(
    FOOD_XP_BASE * RARITY_FOOD_MULT[def.rarity] * (1 + FOOD_LEVEL_BONUS * Math.max(1, food.level)),
  );
}

/** Gold for one Upgrade press: `TAVERN_LEVEL_GOLD_PER_LEVEL × the level it reaches`. */
export function levelUpGold(targetLevel: number): number {
  return TAVERN_LEVEL_GOLD_PER_LEVEL * Math.max(1, Math.round(targetLevel));
}

/** What the player puts on the table: brew counts by currency and food champions by instance id. */
export interface Offering {
  brews: Readonly<Partial<Record<CurrencyId, number>>>;
  food: readonly string[];
}

export const EMPTY_OFFERING: Offering = { brews: {}, food: [] };

export interface FeedPreview {
  /** XP the offering is worth, before the cap takes its cut. */
  xp: number;
  level: number;
  levelsGained: number;
  /** XP that arrives after the star tier's cap — the Tavern warns before it is spent. */
  wasted: number;
  gold: number;
  /** The champion is already at its star tier's cap, so every point would be wasted. */
  atCap: boolean;
  /** Food that would be consumed, resolved to instances in offering order. */
  food: readonly ChampionInstance[];
}

export interface TavernLookup {
  roster: Roster;
  championById(id: ChampionInstance['defId']): ChampionDef | undefined;
}

/** True when a champion may be eaten: not the target, not locked, not marked a favourite. */
export function isEdible(food: ChampionInstance, targetId: string): boolean {
  return food.instanceId !== targetId && !food.locked && !food.favourite;
}

/**
 * Prices an offering without spending it. Fails only on an offering that cannot be made — an
 * unknown champion, an unknown brew, food the player may not consume — never on affordability,
 * which the wallet decides.
 */
export function previewFeed(
  target: ChampionInstance,
  offering: Offering,
  lookup: TavernLookup,
): Result<FeedPreview> {
  const def = lookup.championById(target.defId);
  if (!def) return fail('invalid_argument', `Unknown champion ${target.defId}`);

  let xp = 0;
  for (const [currency, count] of Object.entries(offering.brews)) {
    const amount = Math.max(0, Math.floor(count ?? 0));
    if (amount === 0) continue;
    if (!isBrew(currency as CurrencyId)) return fail('invalid_argument', `${currency} is not a brew`);
    xp += brewXp(currency as CurrencyId, def.element) * amount;
  }

  const food: ChampionInstance[] = [];
  const seen = new Set<string>();
  for (const instanceId of offering.food) {
    if (seen.has(instanceId)) return fail('invalid_argument', `${instanceId} offered twice`);
    seen.add(instanceId);
    const instance = lookup.roster[instanceId];
    if (!instance) return fail('invalid_argument', `Unknown champion ${instanceId}`);
    if (!isEdible(instance, target.instanceId))
      return fail('locked', `${instanceId} cannot be consumed`, { instanceId });
    const foodDef = lookup.championById(instance.defId);
    if (!foodDef) return fail('invalid_argument', `Unknown champion ${instance.defId}`);
    xp += foodXp(foodDef, instance);
    food.push(instance);
  }

  const gain = addChampionXp(target, xp);
  const atCap = target.level >= levelCap(target.stars);
  return ok({
    xp,
    level: gain.level,
    levelsGained: gain.levelsGained,
    wasted: gain.wasted,
    gold: levelUpGold(gain.level),
    atCap,
    food,
  });
}

/** The champion after the offering: level, XP and nothing else changes. */
export function applyFeed(target: ChampionInstance, preview: FeedPreview): ChampionInstance {
  const gain = addChampionXp(target, preview.xp);
  return { ...target, level: gain.level, xp: gain.xp };
}
