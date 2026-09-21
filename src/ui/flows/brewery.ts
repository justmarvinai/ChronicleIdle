/**
 * A run in the Brewery (docs/design/BREWERY.md §3).
 *
 * One of the day's twenty runs is charged, the fight runs, and a win hands over the stage's brews.
 * There is no auto-repeat: twenty runs a day are the player's to place, and placing one is the
 * decision the mode is made of.
 */
import type { Element } from '@content/champions/types';
import type { BattleOutcome } from '@engine/battle/types';
import { maxBattleSpeed } from '@engine/campaign/progress';
import { fail, ok, type Result } from '@engine/errors';
import { battleController, type BattleSpeed } from '@state/battle/index';
import {
  beginBreweryRun,
  brewerySession,
  clearBrewerySession,
  noteBreweryRunFinished,
} from '@state/brewery-session';
import { clearBossSession } from '@state/boss-session';
import { clearCampaignSession } from '@state/campaign-session';
import { clearTowerSession } from '@state/tower-session';
import { progressOf } from '@state/campaign';
import { palaceBonusOf } from '@state/palace';
import { useGameStore } from '@state/store';

export interface BreweryLaunchInput {
  element: Element;
  stage: number;
  instanceIds: readonly string[];
  control?: 'manual' | 'auto';
}

/** Spends a run, starts the stage and enters the battle screen. */
export function launchBreweryRun(input: BreweryLaunchInput): Result<void> {
  const { save, actions } = useGameStore.getState();
  if (!save) return fail('invalid_argument', 'No chronicle loaded');
  const control = input.control ?? (save.settings.autoBattle ? 'auto' : 'manual');
  // A brewery run carries no other mode's session into the HUD.
  clearCampaignSession();
  clearBossSession();
  clearTowerSession();
  const charged = actions.startBreweryRun(input.element, input.stage);
  if (!charged.ok) return charged;

  const speed = Math.min(save.settings.battleSpeed, maxBattleSpeed(progressOf(save))) as BattleSpeed;
  const started = battleController.start({
    encounterId: charged.value.encounterId,
    instanceIds: input.instanceIds,
    roster: save.roster,
    palace: palaceBonusOf(save.palace.nodes),
    control,
    speed,
    seed: `${save.seedRoot}:brewery:${input.element}:${input.stage}:${save.stats['brewery.runs'] ?? 0}`,
    awaitPresenter: true,
  });
  if (!started.ok) {
    // The run is already spent, so the attempt is recorded as nothing rather than vanishing.
    actions.finishBreweryRun({ element: input.element, stage: input.stage, outcome: emptyOutcome() });
    return started;
  }
  beginBreweryRun({ element: input.element, stage: input.stage, team: input.instanceIds, control });
  actions.setLastUsedTeam('campaign', input.instanceIds);
  actions.push({ name: 'battle' });
  return ok(undefined);
}

/** Banks a finished run. Returns false when the fight was not a brewery run's. */
export function settleBreweryRun(outcome: BattleOutcome): boolean {
  const session = brewerySession.getState();
  if (session.element === null) return false;
  const { actions } = useGameStore.getState();
  const finished = actions.finishBreweryRun({
    element: session.element,
    stage: session.stage,
    outcome,
  });
  if (finished.ok) noteBreweryRunFinished(finished.value);
  return true;
}

/** What the battle and result screens need about the run in flight. */
export function currentBreweryRun(): { element: Element; stage: number } | null {
  const { element, stage } = brewerySession.getState();
  return element === null ? null : { element, stage };
}

export { clearBrewerySession };

/** An attempt that never started: no fight, no turns, and the run already gone. */
function emptyOutcome(): BattleOutcome {
  return {
    kind: 'retreat',
    turns: 0,
    allyTurns: 0,
    wavesCleared: 0,
    waveCount: 1,
    units: [],
    enemyHpLeft: 1,
    seed: '',
    decisions: [],
  };
}
