/**
 * The Tavern's Upgrade Skills track (docs/design/ECONOMY.md §3.3): one Skill Tome of the
 * champion's rarity buys one upgrade step on one ability. Duplicates are rank-up food and never
 * touch skills (owner's answer Q8); Common and Uncommon champions have no upgrades at all.
 */
import type { AbilityDef, ChampionDef, CurrencyId, Rarity } from '@engine/champions/imports';
import type { ChampionInstance } from '@engine/champions/instance';
import { fail, ok, type Result } from '@engine/errors';

/** The tome a rarity spends, or null for the rarities that have no upgrades. */
export const TOME_OF_RARITY: Readonly<Record<Rarity, CurrencyId | null>> = {
  common: null,
  uncommon: null,
  rare: 'tome_rare',
  epic: 'tome_epic',
  legendary: 'tome_legendary',
  mythic: 'tome_mythic',
};

export function tomeFor(rarity: Rarity): CurrencyId | null {
  return TOME_OF_RARITY[rarity];
}

/** Steps an ability can take: A1 has two, the rest three or four (`CHAMPIONS.md` §3). */
export function maxSteps(ability: AbilityDef): number {
  return ability.upgrades.length;
}

export function stepsTaken(instance: ChampionInstance, abilityId: string): number {
  return instance.skillUpgrades[abilityId] ?? 0;
}

export interface SkillStatus {
  abilityId: string;
  steps: number;
  max: number;
  /** The next step's effect, or null when the ability is fully upgraded. */
  next: AbilityDef['upgrades'][number] | null;
  tome: CurrencyId | null;
}

/** Every ability's upgrade standing, for the Skills tab. */
export function skillStatuses(def: ChampionDef, instance: ChampionInstance): SkillStatus[] {
  const tome = tomeFor(def.rarity);
  return def.abilities.map((ability) => {
    const steps = stepsTaken(instance, ability.id);
    const max = maxSteps(ability);
    return {
      abilityId: ability.id,
      steps,
      max,
      next: steps < max ? (ability.upgrades[steps] ?? null) : null,
      tome,
    };
  });
}

export interface SkillPlan {
  abilityId: string;
  /** The step this upgrade buys, counting from 1. */
  step: number;
  tome: CurrencyId;
}

/** Checks one upgrade step; the wallet decides whether the tome is there to spend. */
export function planSkillUpgrade(
  def: ChampionDef,
  instance: ChampionInstance,
  abilityId: string,
): Result<SkillPlan> {
  const ability = def.abilities.find((a) => a.id === abilityId);
  if (!ability) return fail('invalid_argument', `${def.id} has no ability ${abilityId}`);
  const tome = tomeFor(def.rarity);
  if (!tome)
    return fail('invalid_argument', `${def.rarity} champions have no skill upgrades`, {
      rarity: def.rarity,
    });
  const steps = stepsTaken(instance, abilityId);
  if (steps >= maxSteps(ability))
    return fail('invalid_argument', `${abilityId} is fully upgraded`, { steps });
  return ok({ abilityId, step: steps + 1, tome });
}

/** The champion after the step: one more upgrade on that ability, nothing else. */
export function applySkillUpgrade(instance: ChampionInstance, plan: SkillPlan): ChampionInstance {
  return {
    ...instance,
    skillUpgrades: { ...instance.skillUpgrades, [plan.abilityId]: plan.step },
  };
}
