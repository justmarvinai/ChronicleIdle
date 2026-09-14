/**
 * The Tavern's Upgrade Rank track (docs/design/ECONOMY.md §3.2): `n★ → (n+1)★` consumes `n`
 * champions that are exactly `n★`, of any rarity or level, plus gold. Locked and favourite
 * champions are never eligible — the rule lives here so no screen can forget it.
 */
import { MAX_STARS, RANK_UP_GOLD, RARITY_FOOD_MULT, type ChampionDef } from '@engine/champions/imports';
import type { ChampionInstance, Roster } from '@engine/champions/instance';
import { maxStars } from '@engine/champions/stats';
import { fail, ok, type Result } from '@engine/errors';
import { isEdible, type TavernLookup } from './tavern-level';

export interface RankRequirement {
  /** Stars the champion has now, and what it would reach. */
  from: number;
  to: number;
  /** How many food champions, and the star tier every one of them must be. */
  count: number;
  foodStars: number;
  gold: number;
}

/** What `n★ → (n+1)★` asks for, or null at the last star. */
export function rankRequirement(stars: number): RankRequirement | null {
  const from = Math.round(stars);
  if (from < 1 || from >= MAX_STARS) return null;
  const gold = RANK_UP_GOLD[from as 1 | 2 | 3 | 4 | 5];
  return { from, to: from + 1, count: from, foodStars: from, gold };
}

/** Champions that may be spent on this rank-up: the exact star tier, and free to be consumed. */
export function eligibleRankFood(target: ChampionInstance, lookup: TavernLookup): ChampionInstance[] {
  const need = rankRequirement(target.stars);
  if (!need) return [];
  return Object.values(lookup.roster).filter(
    (candidate) => candidate.stars === need.foodStars && isEdible(candidate, target.instanceId),
  );
}

/**
 * The food finder (ECONOMY.md §3.2): the cheapest valid set, cheapest meaning the copies the
 * player loses least by — lowest rarity first, then lowest level, then the ones held longest.
 * Returns fewer than `count` ids when the roster cannot fill the table.
 */
export function findRankFood(target: ChampionInstance, lookup: TavernLookup): ChampionInstance[] {
  const need = rankRequirement(target.stars);
  if (!need) return [];
  const rarityOf = (instance: ChampionInstance): number => {
    const def = lookup.championById(instance.defId);
    return def ? RARITY_FOOD_MULT[def.rarity] : Number.MAX_SAFE_INTEGER;
  };
  return eligibleRankFood(target, lookup)
    .sort(
      (a, b) =>
        rarityOf(a) - rarityOf(b) ||
        a.level - b.level ||
        a.acquiredAt - b.acquiredAt ||
        a.instanceId.localeCompare(b.instanceId),
    )
    .slice(0, need.count);
}

export interface RankPlan {
  requirement: RankRequirement;
  food: readonly ChampionInstance[];
}

/** Checks a chosen set of food against the requirement; the wallet still decides affordability. */
export function planRankUp(
  target: ChampionInstance,
  foodIds: readonly string[],
  lookup: TavernLookup,
): Result<RankPlan> {
  const requirement = rankRequirement(target.stars);
  if (!requirement) return fail('invalid_argument', `${target.instanceId} is at the last star`);
  const def: ChampionDef | undefined = lookup.championById(target.defId);
  if (!def) return fail('invalid_argument', `Unknown champion ${target.defId}`);
  // Rarity sets the ceiling: a Common never passes 2★, a Rare reaches 6★ (`CHAMPIONS.md` §1).
  const ceiling = maxStars(def.rarity);
  if (target.stars >= ceiling)
    return fail('invalid_argument', `${def.id} cannot pass ${ceiling}★`, { maxStars: ceiling });

  const food: ChampionInstance[] = [];
  const seen = new Set<string>();
  for (const instanceId of foodIds) {
    if (seen.has(instanceId)) return fail('invalid_argument', `${instanceId} offered twice`);
    seen.add(instanceId);
    const instance = lookup.roster[instanceId];
    if (!instance) return fail('invalid_argument', `Unknown champion ${instanceId}`);
    if (!isEdible(instance, target.instanceId))
      return fail('locked', `${instanceId} cannot be consumed`, { instanceId });
    if (instance.stars !== requirement.foodStars)
      return fail('invalid_argument', `${instanceId} is not ${requirement.foodStars}★`, {
        instanceId,
        stars: instance.stars,
      });
    food.push(instance);
  }
  if (food.length !== requirement.count)
    return fail('invalid_argument', `Rank-up needs ${requirement.count} champions`, {
      needed: requirement.count,
      offered: food.length,
    });
  return ok({ requirement, food });
}

/**
 * The champion after the rank-up: one more star, and the level it already had — the new star tier
 * simply raises the cap it can grow to (`CHAMPIONS.md` §5).
 */
export function applyRankUp(target: ChampionInstance, plan: RankPlan): ChampionInstance {
  return { ...target, stars: plan.requirement.to };
}

/** Removes the consumed copies from a roster. */
export function consume(roster: Roster, food: readonly ChampionInstance[]): Roster {
  const next = { ...roster };
  for (const instance of food) delete next[instance.instanceId];
  return next;
}
