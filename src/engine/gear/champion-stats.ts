/**
 * A champion's stats once its gear is on (docs/design/CHAMPIONS.md §6:
 * `base(star, level) → + gear flat → × (1 + gear % + set %)`).
 *
 * Two functions, deliberately: `gearedStats` stops at the gear itself and is what a battle unit
 * is built from — the battle applies set bonuses through the passive engine like any other
 * `stat_mod`, so baking them in here would count them twice. `totalStats` adds the set bonuses
 * and is what the screens show, where there is no passive engine to do it.
 */
import type { ChampionDef, ChampionStats, StatId } from '@content/champions/types';
import type { GearSetDef } from '@content/sets/types';
import type { ChampionInstance } from '@engine/champions/instance';
import { baseStats, power } from '@engine/champions/stats';
import type { GearInstance } from './instance';
import { setGroups } from './sets';
import { contributionOf, mergeContributions, type GearContribution } from './stats';

function applied(base: ChampionStats, contribution: GearContribution): ChampionStats {
  const out = { ...base };
  for (const stat of Object.keys(out) as StatId[]) {
    const flat = contribution.flat[stat] ?? 0;
    const percent = contribution.percent[stat] ?? 0;
    out[stat] = Math.round((base[stat] + flat) * (1 + percent / 100));
  }
  return out;
}

/** Base stats at the champion's star and level, plus everything the worn pieces carry. */
export function gearedStats(
  def: ChampionDef,
  instance: Pick<ChampionInstance, 'stars' | 'level'>,
  worn: readonly GearInstance[],
): ChampionStats {
  const base = baseStats(def.stats, instance.stars, instance.level);
  if (worn.length === 0) return base;
  return applied(base, mergeContributions(worn.map(contributionOf)));
}

/** The static stat bonuses a build's complete set groups grant (GEAR.md §5). */
export function setContribution(
  worn: readonly GearInstance[],
  setById: (id: string) => GearSetDef | undefined,
): GearContribution {
  const out: GearContribution = { flat: {}, percent: {} };
  for (const group of setGroups(worn, setById)) {
    if (group.groups === 0) continue;
    for (const passive of group.set.passives) {
      if (passive.trigger !== 'static') continue;
      for (const effect of passive.effects) {
        if (effect.kind !== 'stat_mod') continue;
        const times = group.groups;
        if (effect.percent !== undefined)
          out.percent[effect.stat] = (out.percent[effect.stat] ?? 0) + effect.percent * times;
        if (effect.flat !== undefined)
          out.flat[effect.stat] = (out.flat[effect.stat] ?? 0) + effect.flat * times;
      }
    }
  }
  return out;
}

/** What the screens show: gear and the set bonuses its complete groups have earned. */
export function totalStats(
  def: ChampionDef,
  instance: Pick<ChampionInstance, 'stars' | 'level'>,
  worn: readonly GearInstance[],
  setById: (id: string) => GearSetDef | undefined,
): ChampionStats {
  const base = baseStats(def.stats, instance.stars, instance.level);
  const contribution = mergeContributions([...worn.map(contributionOf), setContribution(worn, setById)]);
  return applied(base, contribution);
}

/** The power number the roster and the compare panel rank by. */
export function totalPower(
  def: ChampionDef,
  instance: Pick<ChampionInstance, 'stars' | 'level'>,
  worn: readonly GearInstance[],
  setById: (id: string) => GearSetDef | undefined,
): number {
  return power(totalStats(def, instance, worn, setById));
}
