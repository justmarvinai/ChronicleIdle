/**
 * The period bosses as they touch the save (docs/design/BOSSES.md).
 *
 * The rules are in `@engine/bosses/period`; this is the bookkeeping — what the screen shows, what
 * a key costs, what a finished fight banks, and what a chest pays. A key is charged before the
 * fight (like the campaign's energy) so a reload mid-battle cannot buy a free one, and a chest is
 * paid once per period, by its own threshold.
 */
import { GEAR_SLOTS, type GearSlot } from '@content/champions/types';
import type { BossChestDef, BossDef, BossTierDef } from '@content/bosses/types';
import type { CurrencyAmount } from '@content/currencies/types';
import { content } from '@content/registry';
import { grantBossPoints } from './palace';
import type { BattleOutcome } from '@engine/battle/types';
import { bossEncounterId } from '@engine/bosses/encounter';
import {
  bossPeriodKey,
  chestViews,
  claimableChests,
  currentPeriod,
  damagePercent,
  damageToBoss,
  freshPeriod,
  isChestClaimed,
  keysLeft,
  msUntilPeriodEnd,
  tierDamage,
  unclaimedAtReset,
  withChestClaimed,
  withDamageBanked,
  withKeySpent,
  type BossRecord,
  type BossSave,
  type ChestView,
} from '@engine/bosses/period';
import { grant, type CurrencyChange } from '@engine/economy/wallet';
import { fail, ok, type Result } from '@engine/errors';
import { generateGear } from '@engine/gear/generate';
import { isFeatureUnlocked } from '@engine/progression/unlocks';
import type { GearInstance } from '@engine/gear/instance';
import { createRng, type Rng } from '@engine/rng/rng';
import type { SaveGame } from '@engine/schema/save';
import { inventoryRoom } from './gear';
import { applyPlayerXp, NO_LEVEL_UP, type LevelUpResult } from './progression';
import { bumpCounter, bumpCounterId } from '@engine/progression/counters';

/** The stored record for a boss, read against the period it is in now. */
export function bossStateOf(save: SaveGame, boss: BossDef, now: number): BossSave {
  const stored = save.bosses[boss.id];
  return stored ? currentPeriod(stored, boss.period, now) : freshPeriod(bossPeriodKey(boss.period, now));
}

export interface BossTierView {
  tier: BossTierDef;
  damage: number;
  /** 0..100 of the tier's pool. */
  percent: number;
  chests: ChestView[];
  /** Best ever on this tier, or null before the first key. */
  record: BossRecord | null;
  /** Thresholds earned and waiting. */
  claimable: number[];
}

export interface BossView {
  boss: BossDef;
  state: BossSave;
  unlocked: boolean;
  keysLeft: number;
  /** Time until the keys and the pools come back. */
  msUntilReset: number;
  tiers: BossTierView[];
  /** Chests waiting across every tier — what the hub card puts a dot on. */
  claimable: number;
}

/** The boss as the screen shows it. */
export function bossView(save: SaveGame, bossId: string, now: number): BossView | null {
  const boss = content.bossById(bossId);
  if (!boss) return null;
  const state = bossStateOf(save, boss, now);
  const tiers = boss.tiers.map((tier): BossTierView => {
    const damage = tierDamage(state, tier.id);
    return {
      tier,
      damage,
      percent: damagePercent(tier, damage),
      chests: chestViews(tier, state),
      record: state.records[tier.id] ?? null,
      claimable: claimableChests(tier, state),
    };
  });
  return {
    boss,
    state,
    unlocked: isFeatureUnlocked(boss.feature, save.profile.level),
    keysLeft: keysLeft(boss, state),
    msUntilReset: msUntilPeriodEnd(boss.period, now),
    tiers,
    claimable: tiers.reduce((sum, tier) => sum + tier.claimable.length, 0),
  };
}

export interface BossFightStarted {
  bossId: string;
  tierId: string;
  /** The derived encounter (`@engine/bosses/encounter`). */
  encounterId: string;
  /** Keys left after this one. */
  keysLeft: number;
}

/** Spends a key and points the save at the fight it bought. */
export function applyBossFightStart(
  save: SaveGame,
  input: { bossId: string; tierId: string; now: number },
): Result<BossFightStarted> {
  const boss = content.bossById(input.bossId);
  if (!boss) return fail('invalid_argument', `No boss ${input.bossId}`);
  const tier = content.bossTier(input.bossId, input.tierId);
  if (!tier) return fail('invalid_argument', `No tier ${input.tierId}`);
  if (!isFeatureUnlocked(boss.feature, save.profile.level))
    return fail('invalid_argument', 'The gate is still closed');
  const state = bossStateOf(save, boss, input.now);
  if (keysLeft(boss, state) <= 0) return fail('invalid_argument', 'No keys left this period');

  const next = withKeySpent(state);
  save.bosses[boss.id] = next;
  return ok({
    bossId: boss.id,
    tierId: tier.id,
    encounterId: bossEncounterId(boss.id, tier.id),
    keysLeft: keysLeft(boss, next),
  });
}

export interface BossFightSummary {
  bossId: string;
  tierId: string;
  /** Damage this fight did to the boss. */
  damage: number;
  /** The period's pool after it. */
  total: number;
  percent: number;
  /** The pool is a personal best for this tier. */
  newRecord: boolean;
  /** Thresholds this fight crossed, lowest first. */
  unlocked: number[];
  /** The boss went down. */
  killed: boolean;
  playerXp: number;
  levelUp: LevelUpResult;
  changes: CurrencyChange[];
  /** Skill points the Glorious Palace paid for putting the boss down (GLORIOUS_PALACE.md §3). */
  palacePoints: number;
}

/** Banks a finished fight: the damage, the record, and the tier's chronicle XP. */
export function applyBossFightFinish(
  save: SaveGame,
  input: {
    bossId: string;
    tierId: string;
    outcome: BattleOutcome;
    /** Champion definition ids in slot order — the record remembers who did it. */
    team: readonly string[];
    now: number;
  },
): Result<BossFightSummary> {
  const boss = content.bossById(input.bossId);
  const tier = content.bossTier(input.bossId, input.tierId);
  if (!boss || !tier) return fail('invalid_argument', 'No such boss tier');

  const before = bossStateOf(save, boss, input.now);
  const earnedBefore = new Set(claimableChests(tier, before));
  const damage = damageToBoss(input.outcome, tier.enemy.id);
  const state = withDamageBanked(before, {
    tierId: tier.id,
    damage,
    team: [...input.team],
    now: input.now,
  });
  save.bosses[boss.id] = state;

  const total = tierDamage(state, tier.id);
  const unlocked = claimableChests(tier, state).filter((pct) => !earnedBefore.has(pct));
  const levelUp = tier.playerXp > 0 ? applyPlayerXp(save, tier.playerXp, input.now) : NO_LEVEL_UP;

  bumpCounter(save, 'boss.fights');
  bumpCounterId(save, 'boss.fights.', boss.id);
  // Per tier as well, for the missions that ask for a key spent on one of them.
  bumpCounterId(save, 'boss.fights.', `${boss.id}.${tier.id}`);
  bumpCounter(save, 'boss.damage', Math.round(damage));
  if (input.outcome.kind === 'victory') bumpCounter(save, 'boss.kills');

  /*
   * The Palace pays for putting a boss down (GLORIOUS_PALACE.md §3): one point for the daily, three
   * for the weekly, keyed on the period — so however many keys it took and whichever tier fell, a
   * day pays once and a week pays once.
   */
  const palacePoints =
    input.outcome.kind === 'victory' ? grantBossPoints(save, boss.id, state.periodKey, boss.period) : 0;

  return ok({
    palacePoints,
    bossId: boss.id,
    tierId: tier.id,
    damage: Math.round(damage),
    total,
    percent: damagePercent(tier, total),
    newRecord: state.records[tier.id]?.at === input.now && total > (before.records[tier.id]?.damage ?? 0),
    unlocked,
    killed: input.outcome.kind === 'victory',
    playerXp: tier.playerXp,
    levelUp,
    changes: levelUp.changes,
  });
}

export interface BossChestSummary {
  bossId: string;
  tierId: string;
  pct: number;
  currencies: CurrencyAmount[];
  changes: CurrencyChange[];
  /** The piece the chest minted, if it holds one and the racks had room. */
  gear: GearInstance | null;
  /** The racks were too full to keep the piece. */
  gearLost: boolean;
}

/** Pays one earned chest and marks it taken for this period. */
export function applyBossChestClaim(
  save: SaveGame,
  input: { bossId: string; tierId: string; pct: number; now: number; rng: Rng },
): Result<BossChestSummary> {
  const boss = content.bossById(input.bossId);
  const tier = content.bossTier(input.bossId, input.tierId);
  if (!boss || !tier) return fail('invalid_argument', 'No such boss tier');
  const chest = tier.chests.find((entry) => entry.pct === input.pct);
  if (!chest) return fail('invalid_argument', `No chest at ${input.pct} %`);

  const state = bossStateOf(save, boss, input.now);
  if (isChestClaimed(state, tier.id, chest.pct))
    return fail('invalid_argument', 'That chest has already been taken');
  if (!claimableChests(tier, state).includes(chest.pct))
    return fail('invalid_argument', 'The damage for that chest is not in yet');

  const paid = payChest(save, chest, input);
  save.bosses[boss.id] = withChestClaimed(state, tier.id, chest.pct);
  bumpCounter(save, 'boss.chests');
  return ok({ bossId: boss.id, tierId: tier.id, pct: chest.pct, ...paid });
}

/** What one chest hands over: the currencies into the wallet, and a piece onto the racks. */
function payChest(
  save: SaveGame,
  chest: BossChestDef,
  input: { now: number; rng: Rng },
): Pick<BossChestSummary, 'currencies' | 'changes' | 'gear' | 'gearLost'> {
  const granted = grant(save.wallet, chest.currencies);
  save.wallet = granted.wallet;
  if (!chest.gear)
    return { currencies: chest.currencies, changes: granted.changes, gear: null, gearLost: false };
  if (inventoryRoom(save) <= 0)
    return { currencies: chest.currencies, changes: granted.changes, gear: null, gearLost: true };

  // A boss piece is exactly the rarity and the stars the chest promises, from any set (BOSSES.md).
  const serial = save.counters.gear + 1;
  const setId = input.rng.pick(content.gearSets.map((set) => set.id));
  const piece = generateGear(
    {
      serial,
      slot: input.rng.pick(GEAR_SLOTS) as GearSlot,
      setId,
      rarity: chest.gear.rarity,
      stars: chest.gear.stars,
      source: 'boss_chest',
      now: input.now,
    },
    input.rng,
  );
  save.counters.gear = serial;
  save.inventory[piece.instanceId] = piece;
  return { currencies: chest.currencies, changes: granted.changes, gear: piece, gearLost: false };
}

/** One tier's tribute: what an unclaimed chest paid out when the period turned over. */
export interface BossTribute {
  bossId: string;
  tierId: string;
  pct: number;
  currencies: CurrencyAmount[];
  gear: GearInstance | null;
  gearLost: boolean;
}

/**
 * Pays what a spent period still owed. Unclaimed chests are not lost at the reset (BOSSES.md §1):
 * the first load of a new period grants them and the screen says what arrived. Idempotent — the
 * record is replaced with the new period's, so a second call has nothing left to pay.
 */
export function applyBossRollover(save: SaveGame, now: number): BossTribute[] {
  const tributes: BossTribute[] = [];
  for (const boss of content.bosses) {
    const stored = save.bosses[boss.id];
    if (!stored) continue;
    const key = bossPeriodKey(boss.period, now);
    if (stored.periodKey === key) continue;

    // Seeded from the period that earned them, so what arrives cannot be re-rolled by reloading.
    const rng = createRng(`boss:${save.seedRoot}:${boss.id}:${stored.periodKey}`);
    for (const owed of unclaimedAtReset(boss, stored)) {
      const tier = content.bossTier(boss.id, owed.tierId);
      const chest = tier?.chests.find((entry) => entry.pct === owed.pct);
      if (!tier || !chest) continue;
      const paid = payChest(save, chest, { now, rng });
      tributes.push({
        bossId: boss.id,
        tierId: tier.id,
        pct: chest.pct,
        currencies: paid.currencies,
        gear: paid.gear,
        gearLost: paid.gearLost,
      });
      bumpCounter(save, 'boss.chests');
    }
    save.bosses[boss.id] = freshPeriod(key, stored.records);
  }
  return tributes;
}
