/**
 * Climbing a floor of the Eternal Tower (docs/design/ETERNAL_TOWER.md §3).
 *
 * A key is charged, the fight runs, and a win advances the climb. There is no auto-repeat: every
 * attempt costs a key, and a key is the player's to spend — the same shape as a boss race.
 */
import type { BattleOutcome } from '@engine/battle/types';
import { maxBattleSpeed } from '@engine/campaign/progress';
import { fail, ok, type Result } from '@engine/errors';
import { palaceBonusOf } from '@state/palace';
import { battleController, type BattleSpeed } from '@state/battle/index';
import { clearCampaignSession } from '@state/campaign-session';
import { clearBossSession } from '@state/boss-session';
import { progressOf } from '@state/campaign';
import { useGameStore } from '@state/store';
import {
  beginTowerFloor,
  clearTowerSession,
  noteTowerFloorFinished,
  towerSession,
} from '@state/tower-session';

export interface TowerLaunchInput {
  floor: number;
  instanceIds: readonly string[];
  control?: 'manual' | 'auto';
}

/** Spends a key, starts the floor and enters the battle screen. */
export function launchTowerFloor(input: TowerLaunchInput): Result<void> {
  const { save, actions } = useGameStore.getState();
  if (!save) return fail('invalid_argument', 'No chronicle loaded');
  const control = input.control ?? (save.settings.autoBattle ? 'auto' : 'manual');
  // A climb is never repeated and never carries another mode's session into the HUD.
  clearCampaignSession();
  clearBossSession();
  const charged = actions.startTowerFloor(input.floor);
  if (!charged.ok) return charged;

  const speed = Math.min(save.settings.battleSpeed, maxBattleSpeed(progressOf(save))) as BattleSpeed;
  const started = battleController.start({
    encounterId: charged.value.encounterId,
    instanceIds: input.instanceIds,
    roster: save.roster,
    palace: palaceBonusOf(save.palace.nodes),
    control,
    speed,
    seed: `${save.seedRoot}:tower:${input.floor}:${save.stats['tower.attempts'] ?? 0}`,
    awaitPresenter: true,
  });
  if (!started.ok) {
    // The key is already spent, so the attempt has to be recorded as nothing rather than vanish.
    actions.finishTowerFloor({ floor: input.floor, outcome: emptyOutcome(), party: [] });
    return started;
  }
  beginTowerFloor({ floor: input.floor, team: input.instanceIds, control });
  actions.setLastUsedTeam('boss', input.instanceIds);
  actions.push({ name: 'battle' });
  return ok(undefined);
}

/** Banks a finished floor. Returns false when the fight was not a tower floor's. */
export function settleTowerFloor(outcome: BattleOutcome): boolean {
  const session = towerSession.getState();
  if (session.floor === null) return false;
  const { actions } = useGameStore.getState();
  const finished = actions.finishTowerFloor({
    floor: session.floor,
    outcome,
    party: session.team,
  });
  if (finished.ok) noteTowerFloorFinished(finished.value);
  return true;
}

/** What the battle and result screens need about the floor in flight. */
export function currentTowerRun(): { floor: number } | null {
  const { floor } = towerSession.getState();
  return floor === null ? null : { floor };
}

export { clearTowerSession };

/** An attempt that never started: no fight, no turns, and the key already gone. */
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
