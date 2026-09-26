/**
 * `achievement`, `challenge` and `counts`: the builders the Hall's content is written with
 * (docs/tech/CONTENT_AUTHORING.md §19). An achievement names its five goals and its ledger; what
 * each tier pays and the renown it adds follow from the tier and the ledger (`balance/deeds.ts`),
 * so a file of achievements is goals, and the ids and i18n keys follow from the slug.
 */
import type { GlyphKey } from '@assets/manifest.generated';
import { LEDGER_TIER_REWARDS, TIER_RENOWN, TIER_REWARDS } from '@content/balance/deeds';
import type { CurrencyAmount, CurrencyId } from '@content/currencies/types';
import type { PlaceId } from '@content/places/types';
import type { Goal } from '@content/quests/types';
import type { AchievementDef, ChallengeDef, DeedLedger } from './types';

/** Five of anything: an achievement's tiers are always I–V. */
export type Five<T> = readonly [T, T, T, T, T];

/** One entry per currency, in first-named order, so a tier's base and its ledger's pile add up. */
function merged(...lists: readonly (readonly CurrencyAmount[])[]): CurrencyAmount[] {
  const total = new Map<CurrencyId, number>();
  for (const list of lists)
    for (const { currency, amount } of list) total.set(currency, (total.get(currency) ?? 0) + amount);
  return [...total].map(([currency, amount]) => ({ currency, amount }));
}

/** Five `counter` goals on one lifetime counter — the shape most achievements have. */
export function counts(key: string, targets: Five<number>): Five<Goal> {
  const at = (count: number): Goal => ({ type: 'counter', key, count });
  return [at(targets[0]), at(targets[1]), at(targets[2]), at(targets[3]), at(targets[4])];
}

export interface AchievementInput {
  slug: string;
  ledger: DeedLedger;
  icon: GlyphKey;
  place: PlaceId | null;
  goals: Five<Goal>;
  version?: number;
}

export function achievement(input: AchievementInput): AchievementDef {
  const id = `achievement.${input.slug}`;
  return {
    id,
    ledger: input.ledger,
    name: `${id}.name`,
    line: `${id}.line`,
    icon: input.icon,
    place: input.place,
    tiers: input.goals.map((goal, index) => ({
      tier: index + 1,
      goal,
      rewards: merged(TIER_REWARDS[index] ?? [], LEDGER_TIER_REWARDS[input.ledger][index] ?? []),
      renown: TIER_RENOWN[index] ?? 0,
    })),
    version: input.version ?? 1,
  };
}

export interface ChallengeInput {
  slug: string;
  icon: GlyphKey;
  place: PlaceId | null;
  goal: Goal;
  renown: number;
  rewards: CurrencyAmount[];
  version?: number;
}

export function challenge(input: ChallengeInput): ChallengeDef {
  const id = `challenge.${input.slug}`;
  return {
    id,
    name: `${id}.name`,
    line: `${id}.line`,
    icon: input.icon,
    place: input.place,
    goal: input.goal,
    rewards: input.rewards,
    renown: input.renown,
    version: input.version ?? 1,
  };
}
