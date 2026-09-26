/**
 * The Wallet's promise (docs/tech/UI_DESIGN.md §5.28): a currency's "where it comes from" names
 * every place that pays it, and names nothing that does not. `CURRENCY_FLOWS` is authored by hand;
 * every reward table in the game is the truth it is checked against here, in both directions, so a
 * new source that forgets the Wallet — the Tower and the Dungeons did, for a release — fails.
 */
import { describe, expect, it } from 'vitest';
import {
  FIRST_CLEAR,
  MATERIAL_DROPS,
  MILESTONE_CHESTS,
  SHARD_DROP_CHANCE,
  STAR_CHESTS,
} from '@content/balance/campaign';
import type { RewardBundle } from '@content/balance/campaign';
import {
  DUNGEON_ANCIENT_SHARD_CHANCE,
  DUNGEON_DIFFICULTIES,
  DUNGEON_FADED_SHARD_CHANCE,
} from '@content/balance/dungeon';
import { DISMANTLE_GOLD_REFUND, DISMANTLE_YIELD } from '@content/balance/gear';
import { IDLE_CHANCES, IDLE_ENERGY_PER_HOUR, IDLE_GOLD_BASE, IDLE_MATERIALS } from '@content/balance/idle';
import { MINE_LEVELS } from '@content/balance/mine';
import { GOLD_MARKET_POOL } from '@content/balance/market';
import { SHARD_CURRENCY, SHARD_EXCHANGE, SHARD_IDS } from '@content/balance/summon';
import { TOWER_FLOORS } from '@content/balance/tower';
import { PLAYER_MAX_LEVEL } from '@content/balance/unlocks';
import { ELEMENTS } from '@content/champions/types';
import type { Grant } from '@content/grants';
import { LOGIN_BOARD } from '@content/login/index';
import { GEM_SHELF } from '@content/market/index';
import { PLACE_IDS, type PlaceId } from '@content/places/types';
import { content } from '@content/registry';
import { breweryRewards } from '@engine/brewery/runs';
import { BREW_OF, CAMPAIGN_SHARD } from '@engine/campaign/rewards';
import { dungeonGold } from '@engine/dungeon/rewards';
import { levelUpReward } from '@engine/progression/level-rewards';
import { shardOdds, towerFloorPayout } from '@engine/tower/rewards';
import { CURRENCY_FLOWS } from './flows';
import { CURRENCY_IDS, type CurrencyId } from './types';

type Paid = Map<PlaceId, Set<CurrencyId>>;

function payer(): { paid: Paid; pay: (place: PlaceId, currency: CurrencyId) => void } {
  const paid: Paid = new Map();
  const pay = (place: PlaceId, currency: CurrencyId): void => {
    const set = paid.get(place) ?? new Set<CurrencyId>();
    set.add(currency);
    paid.set(place, set);
  };
  return { paid, pay };
}

/** Everything the reward tables say each place can pay. */
function whatEachPlacePays(): Paid {
  const { paid, pay } = payer();
  const bundle = (place: PlaceId, reward: RewardBundle | null): void => {
    if (!reward) return;
    if (reward.gems) pay(place, 'gems');
    if (reward.energy) pay(place, 'energy');
    for (const row of reward.currencies ?? []) pay(place, row.currency);
  };
  const grants = (place: PlaceId, list: readonly Grant[]): void => {
    for (const grant of list) if (grant.kind === 'currency') pay(place, grant.currency);
  };
  const elements = new Set(content.settlements.map((settlement) => settlement.element));

  // The campaign: every victory's gold, materials, Faded Shard and element brew; first clears,
  // star chests and the mastery chest.
  pay('campaign', 'gold');
  for (const rolls of Object.values(MATERIAL_DROPS))
    for (const roll of rolls) if (roll.max > 0) pay('campaign', roll.currency);
  if (Object.values(SHARD_DROP_CHANCE).some((chance) => chance > 0)) pay('campaign', CAMPAIGN_SHARD);
  for (const element of elements) pay('campaign', BREW_OF[element]);
  for (const row of Object.values(FIRST_CLEAR)) {
    bundle('campaign', row.stage);
    bundle('campaign', row.boss);
  }
  for (const chests of Object.values(STAR_CHESTS)) for (const chest of chests) bundle('campaign', chest);
  for (const chest of Object.values(MILESTONE_CHESTS)) bundle('campaign', chest);

  // The Idle Chest: its hourly purse, the farm tier's materials and its chance rolls.
  if (IDLE_GOLD_BASE > 0) pay('idle_chest', 'gold');
  if (IDLE_ENERGY_PER_HOUR > 0) pay('idle_chest', 'energy');
  for (const row of IDLE_MATERIALS) pay('idle_chest', row.currency);
  for (const roll of IDLE_CHANCES) {
    if (roll.currency) pay('idle_chest', roll.currency);
    if (roll.brew) for (const element of elements) pay('idle_chest', BREW_OF[element]);
  }

  // The Mine (MINE.md §3): gems at every level, Glyph Sigils from the level that first digs them.
  for (const level of MINE_LEVELS) {
    if (level.gemsPerDay > 0) pay('mine', 'gems');
    if (level.sigilsPerDay > 0) pay('mine', 'mat_glyph_sigil');
  }

  // The two bosses' chests.
  for (const boss of content.bosses) {
    const place = boss.id.replace('boss.', '') as PlaceId;
    expect(PLACE_IDS, boss.id).toContain(place);
    for (const tier of boss.tiers)
      for (const chest of tier.chests) for (const row of chest.currencies) pay(place, row.currency);
  }

  // The Eternal Tower: every floor's certain payout, the boss floors' shard rolls.
  for (let floor = 1; floor <= TOWER_FLOORS; floor += 1) {
    for (const element of ELEMENTS) {
      const payout = towerFloorPayout({ floor, element });
      for (const row of payout.currencies) if (row.amount > 0) pay('tower', row.currency);
      if (payout.energy > 0) pay('tower', 'energy');
    }
    const odds = shardOdds(floor);
    if (odds.ancient > 0) pay('tower', 'shard_ancient');
    if (odds.sacred > 0) pay('tower', 'shard_sacred');
  }

  // The Dungeons: gold every clear, and the two shard chances.
  for (const difficulty of DUNGEON_DIFFICULTIES) {
    if (dungeonGold(1, difficulty) > 0) pay('dungeons', 'gold');
    if (DUNGEON_FADED_SHARD_CHANCE[difficulty] > 0) pay('dungeons', 'shard_faded');
    if (DUNGEON_ANCIENT_SHARD_CHANCE[difficulty] > 0) pay('dungeons', 'shard_ancient');
  }

  // The Brewery's halls.
  for (const hall of content.breweries)
    for (const stage of hall.stages)
      for (const row of breweryRewards(hall, stage)) pay('brewery', row.currency);

  // Daily Rewards, and both shelves of the Market.
  for (const day of LOGIN_BOARD) grants('login', day.rewards);
  for (const row of GOLD_MARKET_POOL) pay('market', row.currency);
  for (const entry of GEM_SHELF) grants('market', entry.contents);

  // The Path's missions and chapter chests; both quest boards, their stand-ins and chests.
  for (const chapter of content.missionChapters) {
    for (const mission of chapter.missions) for (const row of mission.rewards) pay('missions', row.currency);
    for (const row of chapter.chest.currencies) pay('missions', row.currency);
  }
  for (const board of content.questBoards) {
    for (const quest of [...board.quests, board.replacement])
      for (const row of quest.rewards) pay('quests', row.currency);
    for (const chest of board.chests) {
      for (const row of chest.currencies) pay('quests', row.currency);
      for (const row of chest.cycle?.instead ?? []) pay('quests', row.currency);
    }
  }

  // Levelling up, the Forge's dismantle and the Portal's own exchange.
  for (let level = 2; level <= PLAYER_MAX_LEVEL; level += 1) {
    const reward = levelUpReward(level);
    for (const row of reward.currencies) pay('level_up', row.currency);
    if (reward.energy > 0) pay('level_up', 'energy');
  }
  for (const yields of Object.values(DISMANTLE_YIELD))
    for (const currency of Object.keys(yields)) pay('forge', currency as CurrencyId);
  if (DISMANTLE_GOLD_REFUND > 0) pay('forge', 'gold');
  for (const shard of SHARD_IDS) if (SHARD_EXCHANGE[shard]) pay('portal', SHARD_CURRENCY[shard]);

  // The clocks: energy and the Eternal Key regenerate, the boss keys return at their resets.
  pay('regeneration', 'energy');
  pay('regeneration', 'key_eternal');
  pay('daily_reset', 'key_daily');
  pay('weekly_reset', 'key_weekly');
  return paid;
}

describe('the Wallet names every source, and nothing else (UI_DESIGN.md §5.28)', () => {
  const paid = whatEachPlacePays();

  it.each(CURRENCY_IDS.map((currency) => [currency]))('%s', (currency) => {
    const truth = PLACE_IDS.filter((place) => paid.get(place)?.has(currency));
    expect([...CURRENCY_FLOWS[currency].sources].sort()).toEqual([...truth].sort());
  });
});
