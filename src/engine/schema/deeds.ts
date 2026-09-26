/**
 * The Hall of Deeds' content, validated (docs/design/ACHIEVEMENTS.md, CONTENT_AUTHORING.md §19).
 *
 * Four promises a content edit could break without a type error: every tier and challenge asks
 * for something the game can count and pays something real; an achievement's tiers climb; the
 * last rank stands on renown the Hall can actually pay; and every frame and title that names a
 * rank or a challenge names one that exists.
 */
import { z } from 'zod';
import { ACHIEVEMENT_TIERS, TIER_RENOWN } from '@content/balance/deeds';
import { CURRENCY_IDS } from '@content/currencies/types';
import { DEED_LEDGERS } from '@content/deeds/types';
import type { AchievementDef, ChallengeDef, HallRankDef, PortraitFrameDef } from '@content/deeds/types';
import { PLACE_IDS } from '@content/places/types';
import type { Goal } from '@content/quests/types';
import type { TitleDef } from '@content/titles/types';
import { goalIssues, tiersByBoss, type GoalLimits } from './goal-issues';
import { goalSchema } from './quest';
import type { ContentRefs, ValidationIssue } from './content';

/** Frames of the pixel deco set a portrait frame may name. */
const DECO_FRAMES = 32;

const rewards = z
  .array(z.object({ currency: z.enum(CURRENCY_IDS), amount: z.number().int().positive() }))
  .min(1);
const place = z.enum(PLACE_IDS).nullable();
const colour = z.string().regex(/^#[0-9a-f]{6}$/i);

export const achievementSchema = z.object({
  id: z.string().regex(/^achievement\.[a-z0-9_]+$/),
  ledger: z.enum(DEED_LEDGERS),
  name: z.string().min(1),
  line: z.string().min(1),
  icon: z.string().min(1),
  place,
  tiers: z
    .array(
      z.object({
        tier: z.number().int().min(1).max(ACHIEVEMENT_TIERS),
        goal: goalSchema,
        rewards,
        renown: z.number().int().positive(),
      }),
    )
    .length(ACHIEVEMENT_TIERS),
  version: z.number().int().positive(),
});

export const challengeSchema = z.object({
  id: z.string().regex(/^challenge\.[a-z0-9_]+$/),
  name: z.string().min(1),
  line: z.string().min(1),
  icon: z.string().min(1),
  place,
  goal: goalSchema,
  rewards,
  renown: z.number().int().positive(),
  version: z.number().int().positive(),
});

export const hallRankSchema = z.object({
  id: z.string().regex(/^hall_rank\.\d{2}$/),
  rank: z.number().int().positive(),
  name: z.string().min(1),
  renown: z.number().int().positive(),
  rewards,
  version: z.number().int().positive(),
});

export const portraitFrameSchema = z.object({
  id: z.string().regex(/^frame\.[a-z0-9_]+$/),
  name: z.string().min(1),
  deco: z.number().int().min(1).max(DECO_FRAMES),
  tint: colour,
  glow: colour.nullable(),
  shimmer: z.boolean(),
  source: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('rank'), rank: z.number().int().positive() }),
    z.object({ kind: z.literal('challenge'), id: z.string().min(1) }),
  ]),
  version: z.number().int().positive(),
});

/**
 * The placeholders a deed's line may use — the numbers the Hall fills in from the goal it reads
 * (`@ui/screens/deeds/deed-text`). A line naming anything else would print its braces.
 */
export const DEED_LINE_TOKENS: ReadonlySet<string> = new Set([
  'count',
  'level',
  'stars',
  'missions',
  'pct',
  'settlement',
  'difficulty',
]);

/**
 * A comparable size for goals that grow along one number, so a later tier can be checked to ask
 * for more than an earlier one. Goals that move along two axes at once (a settlement *and* a
 * difficulty, a rank *and* a count) are left to the content's author.
 */
function sizeOf(goal: Goal): { family: string; size: number } | null {
  switch (goal.type) {
    case 'counter':
      return { family: `counter:${goal.key}`, size: goal.count };
    case 'own_champions':
      return { family: `own:${goal.rarity ?? ''}:${goal.distinct ? 'distinct' : 'all'}`, size: goal.count };
    case 'boss_fights':
      return { family: `boss:${goal.boss}:${goal.tier ?? ''}`, size: goal.count };
    case 'palace_nodes':
      return { family: 'palace', size: goal.count };
    case 'path_walked':
      return { family: 'path', size: goal.missions };
    case 'mine_level':
      return { family: 'mine', size: goal.level };
    default:
      return null;
  }
}

export interface DeedsContent {
  achievements: readonly unknown[];
  challenges: readonly unknown[];
  hallRanks: readonly unknown[];
  frames: readonly unknown[];
  titles: readonly unknown[];
  bosses: readonly unknown[];
  limits: GoalLimits;
}

export function validateDeeds(input: DeedsContent, refs: ContentRefs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const tiers = tiersByBoss(input.bosses);
  const ids = new Set<string>();
  const unique = (path: string, id: string): void => {
    if (ids.has(id)) error(path, 'duplicate id');
    ids.add(id);
  };
  const strings = (path: string, keys: readonly string[]): void => {
    for (const key of keys) if (!refs.i18nKeys.has(key)) error(path, `missing i18n key ${key}`);
  };
  const lineTokens = (path: string, key: string): void => {
    const text = refs.i18nText?.(key);
    if (!text) return;
    for (const match of text.matchAll(/\{(\w+)\}/g))
      if (match[1] && !DEED_LINE_TOKENS.has(match[1])) error(path, `line ${key} uses {${match[1]}}`);
  };
  const goalChecks = (path: string, goal: Goal): void => {
    for (const problem of goalIssues(goal, tiers, input.limits)) error(path, `goal ${problem}`);
  };

  let renownAvailable = 0;
  input.achievements.forEach((raw, index) => {
    const parsed = achievementSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        error(`achievements[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = parsed.data as AchievementDef;
    const path = `achievements.${def.id}`;
    unique(path, def.id);
    strings(path, [def.name, def.line]);
    lineTokens(path, def.line);
    if (!refs.assetKeys.has(def.icon)) error(path, `missing icon ${def.icon}`);
    def.tiers.forEach((tier, position) => {
      const tierPath = `${path}.tier${position + 1}`;
      if (tier.tier !== position + 1) error(tierPath, `is numbered ${tier.tier}`);
      if (tier.renown !== TIER_RENOWN[position])
        error(tierPath, `is worth ${tier.renown} renown, not the tier's`);
      goalChecks(tierPath, tier.goal);
      renownAvailable += tier.renown;
      const before = def.tiers[position - 1];
      const now = sizeOf(tier.goal);
      const then = before ? sizeOf(before.goal) : null;
      if (now && then && now.family === then.family && now.size <= then.size)
        error(tierPath, `asks for ${now.size}, no more than the tier before it`);
    });
  });

  const challengeIds = new Set<string>();
  input.challenges.forEach((raw, index) => {
    const parsed = challengeSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        error(`challenges[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = parsed.data as ChallengeDef;
    const path = `challenges.${def.id}`;
    unique(path, def.id);
    challengeIds.add(def.id);
    strings(path, [def.name, def.line]);
    lineTokens(path, def.line);
    if (!refs.assetKeys.has(def.icon)) error(path, `missing icon ${def.icon}`);
    goalChecks(path, def.goal);
    renownAvailable += def.renown;
  });

  const ranks: HallRankDef[] = [];
  input.hallRanks.forEach((raw, index) => {
    const parsed = hallRankSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        error(`hallRanks[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = parsed.data as HallRankDef;
    const path = `hallRanks.${def.id}`;
    unique(path, def.id);
    strings(path, [def.name]);
    if (def.rank !== index + 1) error(path, `is rank ${def.rank} in position ${index + 1}`);
    const before = ranks[ranks.length - 1];
    if (before && def.renown <= before.renown)
      error(path, `stands on ${def.renown} renown, no more than the rank before`);
    ranks.push(def);
  });
  const last = ranks[ranks.length - 1];
  if (last && last.renown > renownAvailable)
    error(`hallRanks.${last.id}`, `stands on ${last.renown} renown; the whole Hall pays ${renownAvailable}`);

  input.frames.forEach((raw, index) => {
    const parsed = portraitFrameSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        error(`frames[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = parsed.data as PortraitFrameDef;
    const path = `frames.${def.id}`;
    unique(path, def.id);
    strings(path, [def.name]);
    if (def.source.kind === 'rank' && def.source.rank > ranks.length)
      error(path, `hangs on rank ${def.source.rank}; the Hall has ${ranks.length}`);
    if (def.source.kind === 'challenge' && !challengeIds.has(def.source.id))
      error(path, `hangs on ${def.source.id}, which is not a challenge`);
  });

  for (const raw of input.titles) {
    const def = raw as Partial<TitleDef>;
    const condition = def.condition;
    if (!def.id || !condition) continue;
    if (condition.kind === 'hall_rank' && condition.rank > ranks.length)
      error(`titles.${def.id}`, `needs rank ${condition.rank}; the Hall has ${ranks.length}`);
    if (condition.kind === 'challenge' && !challengeIds.has(condition.id))
      error(`titles.${def.id}`, `needs ${condition.id}, which is not a challenge`);
  }
  return issues;
}
