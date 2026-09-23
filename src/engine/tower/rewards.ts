/**
 * What a cleared floor pays (docs/design/ETERNAL_TOWER.md §4).
 *
 * Gold, a little energy, brews and XP are certain and derived from the floor. The shards are the
 * only rolled part, they only exist on boss floors, and their odds are the owner's own table.
 * Pure and seeded, like every other roll in the game (CLAUDE.md §5.2), so the same clear always
 * pays the same thing and a balance pass can be simulated.
 */
import type { Element } from '@content/champions/types';
import type { CurrencyId } from '@content/currencies/types';
import {
  TOWER_BREW_BOSS_ELEMENT,
  TOWER_ELEMENT_BREW,
  TOWER_SHARD_ODDS,
  towerBrews,
  towerChampionXp,
  towerEnergy,
  towerGold,
  towerPlayerXp,
} from '@content/balance/tower';
import type { Rng } from '@engine/rng/rng';
import { isBossFloor } from './encounter';

export interface TowerFloorRewards {
  floor: number;
  boss: boolean;
  championXp: number;
  playerXp: number;
  /** Gold and brews, plus any shard the boss floor rolled. */
  currencies: { currency: CurrencyId; amount: number }[];
  /** Paid through `addEnergy`, so it ignores the cap like every other reward (Q15). */
  energy: number;
}

/**
 * The shard odds in force on a boss floor, as percentages. Floors above the table's last row keep
 * that row's odds rather than extrapolating: the owner's instruction is that the chances stop
 * climbing once the printed table runs out, so floors added later roll floor 100's numbers.
 */
export function shardOdds(floor: number): { ancient: number; sacred: number } {
  if (!isBossFloor(floor)) return { ancient: 0, sacred: 0 };
  let row = TOWER_SHARD_ODDS[0] ?? { floor: 0, ancient: 0, sacred: 0 };
  for (const candidate of TOWER_SHARD_ODDS) if (candidate.floor <= floor) row = candidate;
  return { ancient: row.ancient, sacred: row.sacred };
}

/**
 * The shards a boss floor leaves. Two independent rolls: a floor deep enough can pay both, which
 * is the point of climbing past 50.
 */
export function rollTowerShards(floor: number, rng: Rng): { currency: CurrencyId; amount: number }[] {
  const odds = shardOdds(floor);
  const shards: { currency: CurrencyId; amount: number }[] = [];
  if (odds.ancient > 0 && rng.chance(odds.ancient / 100))
    shards.push({ currency: 'shard_ancient', amount: 1 });
  if (odds.sacred > 0 && rng.chance(odds.sacred / 100)) shards.push({ currency: 'shard_sacred', amount: 1 });
  return shards;
}

/**
 * What a cleared floor pays for certain — everything but the shard roll. The tower screen shows it
 * before the key is spent; `towerFloorRewards` adds the roll. `element` is the holding faction's,
 * for the boss-floor brew.
 */
export function towerFloorPayout(input: { floor: number; element: Element }): TowerFloorRewards {
  const { floor, element } = input;
  const boss = isBossFloor(floor);
  const currencies: { currency: CurrencyId; amount: number }[] = [
    { currency: 'gold', amount: towerGold(floor, boss) },
    { currency: 'brew_universal', amount: towerBrews(floor) },
  ];
  const brew = boss ? TOWER_ELEMENT_BREW[element] : undefined;
  if (brew) currencies.push({ currency: brew, amount: TOWER_BREW_BOSS_ELEMENT });
  return {
    floor,
    boss,
    championXp: towerChampionXp(floor, boss),
    playerXp: towerPlayerXp(floor, boss),
    currencies,
    energy: towerEnergy(floor),
  };
}

/** Everything a cleared floor pays: the certain payout, and on a boss floor the shard roll. */
export function towerFloorRewards(input: { floor: number; element: Element }, rng: Rng): TowerFloorRewards {
  const payout = towerFloorPayout(input);
  if (!payout.boss) return payout;
  return { ...payout, currencies: [...payout.currencies, ...rollTowerShards(input.floor, rng)] };
}
