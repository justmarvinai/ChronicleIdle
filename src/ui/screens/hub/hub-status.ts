/**
 * What each building on the hub says about itself (docs/tech/UI_DESIGN.md §5.2): a line under its
 * name — the next stage, a countdown, what is waiting — and a count on its medallion when something
 * is owed. Everything is read from the save and the engine; the hub never keeps state of its own.
 */
import type { CurrencyId } from '@content/currencies/types';
import { content } from '@content/registry';
import { palaceLedger } from '@engine/palace/ledger';
import { BREW_IDS } from '@engine/progression/tavern-level';
import type { SaveGame } from '@engine/schema/save';
import { t, translate } from '@i18n/index';
import { currentPointer, stageRefOf } from '@state/campaign';
import type { IdleView } from '@state/idle';
import type { MineView } from '@state/mine';
import { goldMarketView } from '@state/market';
import { missionsClaimable } from '@state/missions';
import { openChampionChoices } from '@state/summon';

export interface HubStatus {
  /** The line under the building's name. */
  line?: string;
  /** A number on the medallion: things waiting behind the door. */
  count?: number;
  /** A plain dot on the medallion, where there is nothing to count. */
  dot?: boolean;
  /** The line is news (something is owed) rather than a reading. */
  ready?: boolean;
}

const SHARDS: readonly CurrencyId[] = ['shard_faded', 'shard_ancient', 'shard_sacred', 'shard_primordial'];

/**
 * A countdown in days, hours and minutes — never seconds: the hub redraws twice a minute, so a
 * seconds figure would stand still between redraws. Rounds up, so it never reads 0m early.
 */
export function coarseDuration(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${String(minutes % 60).padStart(2, '0')}m`;
  return `${minutes}m`;
}

const held = (save: SaveGame, ids: readonly CurrencyId[]): number =>
  ids.reduce((sum, id) => sum + (save.wallet[id] ?? 0), 0);

/** Every building's status at `now`, by hotspot id. */
export function hubStatuses(
  save: SaveGame,
  now: number,
  input: { unseen: number; chest: IdleView | null; mine: MineView | null; palaceOpen: boolean },
): Readonly<Record<string, HubStatus>> {
  const statuses: Record<string, HubStatus> = {};

  const pointer = currentPointer(save);
  const stage = stageRefOf(pointer);
  if (stage)
    statuses.campaign = {
      line: t('hub.status.campaign', {
        settlement: translate(stage.settlement.name),
        stage: pointer.stage,
      }),
    };

  const choices = openChampionChoices(save).length;
  const shards = held(save, SHARDS);
  statuses.portal =
    choices > 0
      ? { line: t('hub.status.portal.choice'), count: choices, ready: true }
      : shards > 0
        ? { line: t('hub.status.portal.shards', { count: shards }) }
        : {};

  const brews = held(save, BREW_IDS);
  if (brews > 0) statuses.tavern = { line: t('hub.status.tavern', { count: brews }) };

  statuses.champions =
    input.unseen > 0
      ? { line: t('hub.status.champions.new', { count: input.unseen }), count: input.unseen, ready: true }
      : { line: t('hub.status.champions', { count: Object.keys(save.roster).length }) };

  if (input.palaceOpen) {
    const ledger = palaceLedger(save.palace.earned, save.palace.nodes, (id) => content.palace.byId[id]);
    if (ledger.available > 0)
      statuses.palace = {
        line: t('hub.status.palace', { count: ledger.available }),
        count: ledger.available,
        ready: true,
      };
  }

  const path = missionsClaimable(save, now);
  if (path > 0) statuses.hall = { line: t('hub.status.hall', { count: path }), count: path, ready: true };

  statuses.market = {
    line: t('hub.status.market', { time: coarseDuration(goldMarketView(save, now).rotatesIn) }),
  };

  if (input.chest)
    statuses.idle = input.chest.fill.full
      ? { line: t('hub.idleChest.full'), dot: true, ready: true }
      : { line: coarseDuration(input.chest.fill.msToFull) };

  // The Mine calls only when its store has filled — the moment it stops digging (MINE.md §1).
  // Before that it says what is waiting, or how long until there is something to take.
  const store = input.mine?.unlocked ? input.mine.store : null;
  if (store)
    statuses.mine = store.full
      ? { line: t('hub.status.mine.full', { gems: store.gems }), dot: true, ready: true }
      : store.gems > 0
        ? { line: t('hub.status.mine.waiting', { gems: store.gems }) }
        : store.msToNextGem !== null
          ? { line: t('hub.status.mine.next', { time: coarseDuration(store.msToNextGem) }) }
          : {};

  return statuses;
}
