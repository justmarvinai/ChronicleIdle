/**
 * The Tavern as it touches the save (docs/design/ECONOMY.md §3).
 *
 * The rules live in `@engine/progression/tavern-*`; this module is the bookkeeping: check the
 * wallet, write the roster, take the food off the tables it was standing on. Each action is
 * all-or-nothing — a refusal leaves the save exactly as it was.
 */
import type { CurrencyAmount } from '@content/currencies/types';
import { content } from '@content/registry';
import type { ChampionInstance } from '@engine/champions/instance';
import { canAfford, spend, type CurrencyChange } from '@engine/economy/wallet';
import { fail, ok, type Result } from '@engine/errors';
import {
  applyFeed as feedChampion,
  previewFeed,
  type FeedPreview,
  type Offering,
  type TavernLookup,
} from '@engine/progression/tavern-level';
import {
  applyRankUp as rankUpChampion,
  consume,
  planRankUp,
  type RankPlan,
} from '@engine/progression/tavern-rank';
import {
  applySkillUpgrade as upgradeChampionSkill,
  planSkillUpgrade,
} from '@engine/progression/tavern-skills';
import type { SaveGame } from '@engine/schema/save';
import { bumpCounter } from '@engine/progression/counters';

/** The roster and the champion catalogue, as the Tavern engine wants them. */
export function tavernLookupOf(save: SaveGame): TavernLookup {
  return { roster: save.roster, championById: (id) => content.championById(id) };
}

/** Brew counts as a wallet cost, in a stable order so the toast reads the same every time. */
function brewCost(offering: Offering): CurrencyAmount[] {
  return Object.entries(offering.brews)
    .map(([currency, amount]) => ({
      currency: currency as CurrencyAmount['currency'],
      amount: Math.max(0, Math.floor(amount ?? 0)),
    }))
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

/** What one Upgrade press costs, before it is spent — the cost pill reads this. */
export function feedCost(preview: FeedPreview, offering: Offering): CurrencyAmount[] {
  return [{ currency: 'gold', amount: preview.gold }, ...brewCost(offering)];
}

export interface FeedSummary {
  instanceId: string;
  level: number;
  levelsGained: number;
  /** XP the offering carried, and the part of it that arrived after the cap. */
  xp: number;
  wasted: number;
  /** Instance ids the Tavern ate. */
  eaten: string[];
  changes: CurrencyChange[];
}

/** Level-up: brews and food become XP, the wallet pays the gold, the food leaves the roster. */
export function applyTavernFeed(
  save: SaveGame,
  input: { instanceId: string; offering: Offering },
): Result<FeedSummary> {
  const target = save.roster[input.instanceId];
  if (!target) return fail('invalid_argument', `Unknown champion ${input.instanceId}`);
  const preview = previewFeed(target, input.offering, tavernLookupOf(save));
  if (!preview.ok) return preview;
  if (preview.value.xp <= 0) return fail('invalid_argument', 'Nothing on the table');

  const cost = feedCost(preview.value, input.offering);
  const paid = spend(save.wallet, cost);
  if (!paid.ok) return paid;

  save.wallet = paid.value.wallet;
  const fed = feedChampion(target, preview.value);
  save.roster[input.instanceId] = fed;
  const eaten = preview.value.food.map((food) => food.instanceId);
  eatChampions(save, preview.value.food);
  bumpCounter(save, 'tavern.levelUps', preview.value.levelsGained);
  bumpCounter(save, 'tavern.foodEaten', eaten.length);
  return ok({
    instanceId: input.instanceId,
    level: fed.level,
    levelsGained: preview.value.levelsGained,
    xp: preview.value.xp,
    wasted: preview.value.wasted,
    eaten,
    changes: paid.value.changes,
  });
}

export interface RankSummary {
  instanceId: string;
  stars: number;
  eaten: string[];
  changes: CurrencyChange[];
}

/** Rank-up: `n` copies of `n★` and the gold from the table buy one more star. */
export function applyTavernRankUp(
  save: SaveGame,
  input: { instanceId: string; foodIds: readonly string[] },
): Result<RankSummary> {
  const target = save.roster[input.instanceId];
  if (!target) return fail('invalid_argument', `Unknown champion ${input.instanceId}`);
  const plan: Result<RankPlan> = planRankUp(target, input.foodIds, tavernLookupOf(save));
  if (!plan.ok) return plan;

  const cost: CurrencyAmount[] = [{ currency: 'gold', amount: plan.value.requirement.gold }];
  const paid = spend(save.wallet, cost);
  if (!paid.ok) return paid;

  save.wallet = paid.value.wallet;
  const ranked = rankUpChampion(target, plan.value);
  save.roster[input.instanceId] = ranked;
  const eaten = plan.value.food.map((food) => food.instanceId);
  eatChampions(save, plan.value.food);
  bumpCounter(save, 'tavern.rankUps');
  bumpCounter(save, 'tavern.foodEaten', eaten.length);
  return ok({ instanceId: input.instanceId, stars: ranked.stars, eaten, changes: paid.value.changes });
}

export interface SkillSummary {
  instanceId: string;
  abilityId: string;
  step: number;
  changes: CurrencyChange[];
}

/** Skill upgrade: one tome of the champion's rarity buys the next step on one ability. */
export function applyTavernSkillUpgrade(
  save: SaveGame,
  input: { instanceId: string; abilityId: string },
): Result<SkillSummary> {
  const target = save.roster[input.instanceId];
  if (!target) return fail('invalid_argument', `Unknown champion ${input.instanceId}`);
  const def = content.championById(target.defId);
  if (!def) return fail('invalid_argument', `Unknown champion ${target.defId}`);
  const plan = planSkillUpgrade(def, target, input.abilityId);
  if (!plan.ok) return plan;

  const cost: CurrencyAmount[] = [{ currency: plan.value.tome, amount: 1 }];
  const paid = spend(save.wallet, cost);
  if (!paid.ok) return paid;

  save.wallet = paid.value.wallet;
  save.roster[input.instanceId] = upgradeChampionSkill(target, plan.value);
  bumpCounter(save, 'tavern.skillUpgrades');
  return ok({
    instanceId: input.instanceId,
    abilityId: plan.value.abilityId,
    step: plan.value.step,
    changes: paid.value.changes,
  });
}

/** True when the wallet can pay for this offering right now (the Upgrade button reads this). */
export function canAffordFeed(save: SaveGame, preview: FeedPreview, offering: Offering): boolean {
  return canAfford(save.wallet, feedCost(preview, offering));
}

/** Removes eaten champions from the roster and from every team that had them on it. */
function eatChampions(save: SaveGame, food: readonly ChampionInstance[]): void {
  if (food.length === 0) return;
  save.roster = consume(save.roster, food);
  const gone = new Set(food.map((instance) => instance.instanceId));
  for (const mode of ['campaign', 'boss'] as const) {
    const team = save.teams[mode];
    team.presets = team.presets.map((preset) => preset.filter((id) => !gone.has(id)));
    team.lastUsed = team.lastUsed.filter((id) => !gone.has(id));
  }
}
