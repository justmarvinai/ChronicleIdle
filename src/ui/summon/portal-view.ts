/**
 * Display helpers for the Summoning Portal (docs/tech/UI_DESIGN.md §5.12). Presentation only:
 * every number here comes from `@content/balance/summon` or the engine, and every string is an
 * i18n key.
 */
import type { AssetKey } from '@assets/manifest.generated';
import {
  SHARD_CURRENCY,
  SHARD_EXCHANGE,
  SHARD_IDS,
  SHARD_RATES,
  type ShardId,
} from '@content/balance/summon';
import { RARITIES, type ChampionDef, type Rarity } from '@content/champions/types';
import type { CurrencyId } from '@content/currencies/types';
import { content } from '@content/registry';
import type { MercyView } from '@engine/summon/pity';
import type { SummonRecord } from '@engine/schema/save';
import type { SummonedChampion } from '@state/summon';
import { t, translate, type I18nKey } from '@i18n/index';

export interface ShardView {
  shard: ShardId;
  currency: CurrencyId;
  name: string;
  /** Name without the word "Shard", for tight rows. */
  short: string;
  blurb: string;
  icon: AssetKey;
  tint: string | null;
  held: number;
  /** What one shard costs at the Exchange, or null when it is never sold. */
  price: { currency: CurrencyId; amount: number } | null;
}

/** The four shards in rail order, with what the purse holds. */
export function shardViews(wallet: Readonly<Record<string, number>> | null): ShardView[] {
  return SHARD_IDS.map((shard) => {
    const currency = SHARD_CURRENCY[shard];
    const def = content.currencyById[currency];
    return {
      shard,
      currency,
      name: t(`shard.${shard}` as I18nKey),
      short: t(`shard.${shard}.short` as I18nKey),
      blurb: t(`shard.${shard}.blurb` as I18nKey),
      icon: def.icon,
      tint: def.tint ?? null,
      held: wallet?.[currency] ?? 0,
      price: SHARD_EXCHANGE[shard],
    };
  });
}

export interface RateRow {
  rarity: Rarity;
  chance: number;
  /** How many champions sit behind that slice of the table. */
  pool: number;
}

/** A shard's table, rarest first — what the "Rates" panel shows (SUMMONING.md §1). */
export function rateRows(shard: ShardId): RateRow[] {
  const table = SHARD_RATES[shard];
  return RARITIES.filter((rarity) => (table[rarity] ?? 0) > 0)
    .map((rarity) => ({
      rarity,
      chance: table[rarity] ?? 0,
      pool: content.summonPool.filter((def) => def.rarity === rarity).length,
    }))
    .reverse();
}

/** Mercy as sentences: the guarantee, then the climb if one is running (SUMMONING.md §2). */
export function mercySentences(lines: readonly MercyView[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const rarity = t(`rarity.${line.rarity}` as I18nKey);
    if (line.within !== null) out.push(translate('portal.pity.guaranteed', { rarity, count: line.within }));
    if (line.bonusPp > 0)
      out.push(translate('portal.pity.climbing', { rarity, pp: Math.round(line.bonusPp * 10) / 10 }));
    else if (line.within === null) out.push(translate('portal.pity.since', { rarity, count: line.since }));
  }
  return out;
}

/**
 * The order the cards reveal in: the rarest last (SUMMONING.md §5.4). Which pull is the rarest is
 * the press's own answer (`SummonSummary.best`), so the grid and the toast can never disagree.
 */
export function revealOrder(pulls: readonly SummonedChampion[], best: SummonedChampion): SummonedChampion[] {
  if (pulls.length < 2) return [...pulls];
  return [...pulls.filter((pull) => pull !== best), best];
}

export interface HistoryRow {
  record: SummonRecord;
  def: ChampionDef | undefined;
  name: string;
  rarity: string;
  shard: string;
}

/** The history, newest first, with the names resolved. */
export function historyRows(records: readonly SummonRecord[]): HistoryRow[] {
  return records.map((record) => {
    const def = content.championById(record.championId);
    return {
      record,
      def,
      name: def ? t(def.name as I18nKey) : record.championId,
      rarity: t(`rarity.${record.rarity}` as I18nKey),
      shard: t(`shard.${record.shard}` as I18nKey),
    };
  });
}

/** Champion display name, for toasts and cards. */
export function championName(id: string): string {
  const def = content.championById(id as ChampionDef['id']);
  return def ? t(def.name as I18nKey) : id;
}
