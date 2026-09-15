/**
 * Running a campaign stage from any screen (docs/design/CAMPAIGN.md §2, §9).
 *
 * A run is: charge the energy, fight, settle. Auto-repeat is the same three steps in a loop, which
 * is why the loop lives here rather than in a screen — the battle screen only asks, when a fight
 * ends, whether another one follows.
 */
import type { BattleOutcome } from '@engine/battle/types';
import { stageEncounterId } from '@engine/campaign/encounter';
import { maxBattleSpeed, nextStage, type StagePointer } from '@engine/campaign/progress';
import { fail, ok, type Result } from '@engine/errors';
import { battleController, type BattleSpeed } from '@state/battle/index';
import { clearBossSession } from '@state/boss-session';
import {
  beginCampaignBatch,
  campaignSession,
  clearCampaignSession,
  endCampaignBatch,
  noteRunFinished,
  noteRunStarted,
} from '@state/campaign-session';
import { pointerCost, progressOf, stageRefOf } from '@state/campaign';
import { useGameStore } from '@state/store';

export interface CampaignLaunchInput {
  pointer: StagePointer;
  instanceIds: readonly string[];
  control?: 'manual' | 'auto';
  /** Runs to fight in a row (CAMPAIGN.md §9); 1 is a single run. */
  repeat?: number;
}

/** Charges one run and starts its battle in the controller. */
function startRunBattle(
  pointer: StagePointer,
  instanceIds: readonly string[],
  control: 'manual' | 'auto',
): Result<void> {
  const { save, actions } = useGameStore.getState();
  if (!save) return fail('invalid_argument', 'No chronicle loaded');
  const charged = actions.startCampaignRun(pointer);
  if (!charged.ok) return charged;
  noteRunStarted(charged.value.cost, charged.value.runIndex);
  const speed = Math.min(save.settings.battleSpeed, maxBattleSpeed(progressOf(save))) as BattleSpeed;
  const started = battleController.start({
    encounterId: charged.value.encounterId,
    instanceIds,
    roster: save.roster,
    control,
    speed,
    seed: `${save.seedRoot}:${save.stats['battles.fought'] ?? 0}`,
    awaitPresenter: true,
  });
  if (!started.ok) return started;
  actions.setLastUsedTeam('campaign', instanceIds);
  return ok(undefined);
}

/** Starts a batch of runs and enters the battle screen. */
export function launchCampaignRun(input: CampaignLaunchInput): Result<void> {
  const { save, actions } = useGameStore.getState();
  if (!save) return fail('invalid_argument', 'No chronicle loaded');
  const control = input.control ?? (save.settings.autoBattle ? 'auto' : 'manual');
  const repeat = Math.max(1, input.repeat ?? 1);
  // A stand is not a boss: whatever a previous race left behind must not settle this fight.
  clearBossSession();
  beginCampaignBatch({ pointer: input.pointer, team: input.instanceIds, control, requested: repeat });
  const started = startRunBattle(input.pointer, input.instanceIds, control);
  if (!started.ok) {
    clearCampaignSession();
    return started;
  }
  actions.push({ name: 'battle' });
  return ok(undefined);
}

/**
 * Settles a finished run and decides whether another follows. Returns `true` when a new battle has
 * already begun, in which case the battle screen stays where it is.
 */
export function settleCampaignRun(outcome: BattleOutcome): { repeated: boolean } {
  const session = campaignSession.getState();
  const { actions } = useGameStore.getState();
  if (!session.pointer) return { repeated: false };
  const finished = actions.finishCampaignRun({
    pointer: session.pointer,
    cost: session.cost,
    runIndex: session.runIndex,
    outcome,
    party: session.team,
    now: Date.now(),
  });
  if (!finished.ok) {
    endCampaignBatch('stopped');
    return { repeated: false };
  }
  noteRunFinished(finished.value);
  const after = campaignSession.getState();
  if (outcome.kind !== 'victory') {
    endCampaignBatch('defeat');
    return { repeated: false };
  }
  if (after.stopping) {
    endCampaignBatch('stopped');
    return { repeated: false };
  }
  if (after.completed >= after.requested) {
    endCampaignBatch('done');
    return { repeated: false };
  }
  const again = startRunBattle(session.pointer, session.team, session.control);
  if (again.ok) return { repeated: true };
  endCampaignBatch(again.error.code === 'insufficient_energy' ? 'energy' : 'stopped');
  return { repeated: false };
}

/** The stage after the one just cleared, when there is one to offer on the result screen. */
export function nextPointerAfter(pointer: StagePointer): StagePointer | null {
  const save = useGameStore.getState().save;
  if (!save) return null;
  const next = nextStage(progressOf(save));
  const sameStage = next.settlement === pointer.settlement && next.stage === pointer.stage;
  return sameStage || !stageRefOf(next) ? null : next;
}

export interface CampaignRunView {
  pointer: StagePointer;
  stageId: string;
  encounterId: string;
  cost: number;
  boss: boolean;
  settlementName: string;
}

/** What the battle and result screens need about the run in flight. */
export function currentRunView(): CampaignRunView | null {
  const session = campaignSession.getState();
  const ref = session.pointer ? stageRefOf(session.pointer) : null;
  if (!session.pointer || !ref) return null;
  return {
    pointer: session.pointer,
    stageId: ref.stage.id,
    encounterId: stageEncounterId(ref.stage.id, session.pointer.difficulty),
    cost: pointerCost(session.pointer),
    boss: ref.stage.boss,
    settlementName: ref.settlement.name,
  };
}
