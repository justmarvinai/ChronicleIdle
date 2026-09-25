/**
 * What the Bag says about an item beyond its description (docs/tech/UI_DESIGN.md §5.26): how the
 * thing it acts on stands right now, so a player deciding whether to use it can see what it would
 * change — a boost already running, the day's Brewery runs, a board's points, the open mission.
 */
import { BOOST_HOURS } from '@content/balance/boosts';
import type { ConsumableDef } from '@content/consumables/types';
import { boostRemaining } from '@engine/boosts/index';
import type { SaveGame } from '@engine/schema/save';
import { formatDuration } from '@engine/time/clock';
import { t, translate, type I18nKey } from '@i18n/index';
import { breweryView } from '@state/brewery';
import { missionsState } from '@state/missions';
import { questBoardState } from '@state/quests';

/** One line on where the item's target stands at `now`. */
export function itemStatus(def: ConsumableDef, save: SaveGame, now: number): string {
  const effect = def.effect;
  switch (effect.kind) {
    case 'boost': {
      const left = boostRemaining(save.boosts, effect.boost, now);
      const hours = BOOST_HOURS[effect.boost];
      return left > 0
        ? translate('bag.status.boostRunning', { time: formatDuration(left), hours })
        : translate('bag.status.boostIdle', { hours });
    }
    case 'brewery_runs': {
      const view = breweryView(save, now);
      return translate('bag.status.breweryRuns', { left: view.runsLeft, total: view.runsTotal });
    }
    case 'quest_reset': {
      const board = questBoardState(save, effect.period, now);
      return translate('bag.status.board', { points: board.points, of: board.pointsPossible });
    }
    case 'mission_skip': {
      const active = missionsState(save, now).active;
      return active
        ? translate('bag.status.mission', { name: t(active.mission.name as I18nKey) })
        : t('bag.status.pathDone');
    }
    case 'champion_level':
    case 'champion_stars':
      return t('bag.status.pick');
  }
}
