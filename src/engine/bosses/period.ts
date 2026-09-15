/**
 * The boss period (docs/design/BOSSES.md §1): a few keys, damage that accumulates across the
 * period, and chests that unlock at damage thresholds.
 *
 * The save stores the period it belongs to — the same `dailyKey`/`weeklyKey` string the rest of
 * the game resets on — and everything else is read against it: a record from an older period is a
 * spent period, so keys, damage and claims are all zero again without anything having to run at
 * midnight (the same discipline as the Idle Chest, ADR-033). Personal records are the one thing
 * that survives a reset.
 */
import { DAILY_RESET_HOUR, WEEKLY_RESET_WEEKDAY } from '@content/balance/economy';
import type { BossDef, BossPeriod, BossTierDef } from '@content/bosses/types';
import type { BattleOutcome } from '@engine/battle/types';
import { dailyKey, msUntilDailyReset, msUntilWeeklyReset, weeklyKey } from '@engine/time/clock';

/** Best damage on a tier, and the team that did it. */
export interface BossRecord {
  damage: number;
  /** When it was set. */
  at: number;
  /** Champion definition ids, in slot order. */
  team: string[];
}

/** One boss's state in the save (v9). */
export interface BossSave {
  /** The period these numbers belong to; anything older reads as a fresh period. */
  periodKey: string;
  keysUsed: number;
  /** Damage banked this period, by tier id. */
  damage: Record<string, number>;
  /** `<tierId>:<pct>` for every chest already taken this period. */
  claimed: string[];
  /** Best damage ever, by tier id — this outlives the period. */
  records: Record<string, BossRecord>;
}

/** The key of the period a boss is in right now. */
export function bossPeriodKey(period: BossPeriod, now: number): string {
  return period === 'daily'
    ? dailyKey(now, DAILY_RESET_HOUR)
    : weeklyKey(now, DAILY_RESET_HOUR, WEEKLY_RESET_WEEKDAY);
}

/** How long the period still has to run. */
export function msUntilPeriodEnd(period: BossPeriod, now: number): number {
  return period === 'daily'
    ? msUntilDailyReset(now, DAILY_RESET_HOUR)
    : msUntilWeeklyReset(now, DAILY_RESET_HOUR, WEEKLY_RESET_WEEKDAY);
}

/** An empty period, keeping the records: a reset costs progress, never history. */
export function freshPeriod(periodKey: string, records: Record<string, BossRecord> = {}): BossSave {
  return { periodKey, keysUsed: 0, damage: {}, claimed: [], records };
}

/**
 * The boss's state as it stands at `now`: the stored record when it is this period's, an empty one
 * (with the records kept) when the period has turned over. Pure — nothing is written here.
 */
export function currentPeriod(saved: BossSave, period: BossPeriod, now: number): BossSave {
  const key = bossPeriodKey(period, now);
  return saved.periodKey === key ? saved : freshPeriod(key, saved.records);
}

export function keysLeft(boss: BossDef, state: BossSave): number {
  return Math.max(0, boss.keysPerPeriod - state.keysUsed);
}

export function tierDamage(state: BossSave, tierId: string): number {
  return state.damage[tierId] ?? 0;
}

/** Damage as a percentage of the tier's pool; past the kill it stays at 100. */
export function damagePercent(tier: BossTierDef, damage: number): number {
  if (tier.stats.hp <= 0) return 0;
  return Math.min(100, (damage / tier.stats.hp) * 100);
}

/** The HP a chest's threshold asks for. */
export function chestThreshold(tier: BossTierDef, pct: number): number {
  return Math.ceil((tier.stats.hp * pct) / 100);
}

export type ChestState = 'locked' | 'claimable' | 'claimed';

export interface ChestView {
  pct: number;
  /** Damage this chest asks for. */
  threshold: number;
  state: ChestState;
}

function chestKey(tierId: string, pct: number): string {
  return `${tierId}:${pct}`;
}

/** Every chest on a tier with what the player may do about it right now. */
export function chestViews(tier: BossTierDef, state: BossSave): ChestView[] {
  const damage = tierDamage(state, tier.id);
  const taken = new Set(state.claimed);
  return tier.chests.map((chest) => {
    const threshold = chestThreshold(tier, chest.pct);
    const claimed = taken.has(chestKey(tier.id, chest.pct));
    return {
      pct: chest.pct,
      threshold,
      state: claimed ? 'claimed' : damage >= threshold ? 'claimable' : 'locked',
    };
  });
}

/** The thresholds a tier has earned and not yet taken, lowest first. */
export function claimableChests(tier: BossTierDef, state: BossSave): number[] {
  return chestViews(tier, state)
    .filter((chest) => chest.state === 'claimable')
    .map((chest) => chest.pct);
}

/** True when this exact chest has already been taken this period. */
export function isChestClaimed(state: BossSave, tierId: string, pct: number): boolean {
  return state.claimed.includes(chestKey(tierId, pct));
}

/** The chest marked taken; the caller grants what it holds. */
export function withChestClaimed(state: BossSave, tierId: string, pct: number): BossSave {
  if (isChestClaimed(state, tierId, pct)) return state;
  return { ...state, claimed: [...state.claimed, chestKey(tierId, pct)] };
}

/**
 * A key spent. Like the campaign's energy this is charged *before* the fight, so a crash or a
 * reload mid-battle cannot buy a free one (ROADMAP Phase 3 acceptance, applied to keys).
 */
export function withKeySpent(state: BossSave): BossSave {
  return { ...state, keysUsed: state.keysUsed + 1 };
}

/** The damage of one fight banked on its tier, and the record if the period's pool is a best. */
export function withDamageBanked(
  state: BossSave,
  input: { tierId: string; damage: number; team: string[]; now: number },
): BossSave {
  const banked = tierDamage(state, input.tierId) + Math.max(0, Math.round(input.damage));
  const previous = state.records[input.tierId];
  const record: BossRecord =
    !previous || banked > previous.damage ? { damage: banked, at: input.now, team: input.team } : previous;
  return {
    ...state,
    damage: { ...state.damage, [input.tierId]: banked },
    records: { ...state.records, [input.tierId]: record },
  };
}

/**
 * Damage the boss itself took over a fight. Reports are per unit, so the boss's own definition id
 * names it — the adds a phased boss brings along (BOSSES.md §3) never count towards the pool.
 */
export function damageToBoss(outcome: BattleOutcome, bossEnemyId: string): number {
  return outcome.units
    .filter((unit) => unit.side === 'enemy' && unit.defId === bossEnemyId)
    .reduce((sum, unit) => sum + unit.damageTaken, 0);
}

/**
 * The chests a period owes at the moment it turns over: everything earned and not taken, tier by
 * tier. Unclaimed chests are paid rather than lost (BOSSES.md §1), so this is what the state layer
 * grants on the first load of a new period.
 */
export function unclaimedAtReset(boss: BossDef, state: BossSave): { tierId: string; pct: number }[] {
  const owed: { tierId: string; pct: number }[] = [];
  for (const tier of boss.tiers)
    for (const pct of claimableChests(tier, state)) owed.push({ tierId: tier.id, pct });
  return owed;
}
