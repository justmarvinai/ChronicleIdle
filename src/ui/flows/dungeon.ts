/**
 * A run in a dungeon (docs/design/DUNGEONS.md §6).
 *
 * A run is: charge the energy, fight, settle. Auto-repeat is the same three steps in a loop — the
 * campaign's own ×10 / ×25 / ×50 tiers, because a gear farm you have to click twenty times is a
 * chore rather than a mode (the owner's answer).
 */
import type { DungeonDifficulty } from '@content/balance/dungeon';
import type { BattleOutcome } from '@engine/battle/types';
import { maxBattleSpeed } from '@engine/campaign/progress';
import { fail, ok, type Result } from '@engine/errors';
import { battleController, type BattleSpeed } from '@state/battle/index';
import { clearBossSession } from '@state/boss-session';
import { clearBrewerySession } from '@state/brewery-session';
import { clearCampaignSession } from '@state/campaign-session';
import { clearTowerSession } from '@state/tower-session';
import { progressOf } from '@state/campaign';
import {
  beginDungeonBatch,
  clearDungeonSession,
  dungeonSession,
  endDungeonBatch,
  noteDungeonRunFinished,
  noteDungeonRunStarted,
  stopDungeonBatch,
} from '@state/dungeon-session';
import { palaceBonusOf } from '@state/palace';
import { useGameStore } from '@state/store';
import { clearUnwrittenSession } from '@state/unwritten-session';

export interface DungeonLaunchInput {
  slug: string;
  difficulty: DungeonDifficulty;
  stage: number;
  instanceIds: readonly string[];
  control?: 'manual' | 'auto';
  /** Runs one press buys; the batch stops early on a defeat or an empty bar. */
  repeat?: number;
}

/** Charges one run and starts its fight. Shared by the first press and every repeat after it. */
function startRunBattle(
  slug: string,
  difficulty: DungeonDifficulty,
  stage: number,
  instanceIds: readonly string[],
  control: 'manual' | 'auto',
): Result<void> {
  const { save, actions } = useGameStore.getState();
  if (!save) return fail('invalid_argument', 'No chronicle loaded');
  const charged = actions.startDungeonRun(slug, difficulty, stage);
  if (!charged.ok) return charged;
  noteDungeonRunStarted({
    energySpent: charged.value.energySpent,
    runIndex: charged.value.runIndex,
  });

  const speed = Math.min(save.settings.battleSpeed, maxBattleSpeed(progressOf(save))) as BattleSpeed;
  const started = battleController.start({
    encounterId: charged.value.encounterId,
    instanceIds,
    roster: save.roster,
    inventory: save.inventory,
    palace: palaceBonusOf(save.palace.nodes),
    control,
    speed,
    seed: `${save.seedRoot}:dungeon:${slug}:${difficulty}:${stage}:${charged.value.runIndex}`,
    awaitPresenter: true,
  });
  if (!started.ok) {
    // The energy is already gone, so the attempt is recorded as nothing rather than vanishing.
    actions.finishDungeonRun({
      slug,
      difficulty,
      stage,
      energySpent: charged.value.energySpent,
      runIndex: charged.value.runIndex,
      outcome: emptyOutcome(),
      party: instanceIds,
    });
    return started;
  }
  actions.setLastUsedTeam('dungeon', instanceIds);
  return ok(undefined);
}

/** Starts a batch of runs in one keep and enters the battle screen. */
export function launchDungeonRun(input: DungeonLaunchInput): Result<void> {
  const { save, actions } = useGameStore.getState();
  if (!save) return fail('invalid_argument', 'No chronicle loaded');
  const control = input.control ?? (save.settings.autoBattle ? 'auto' : 'manual');
  const repeat = Math.max(1, input.repeat ?? 1);
  // A keep is not a stand, a gate or a cellar: no other mode's session may settle this fight.
  clearCampaignSession();
  clearBossSession();
  clearTowerSession();
  clearBrewerySession();
  clearUnwrittenSession();
  beginDungeonBatch({
    slug: input.slug,
    difficulty: input.difficulty,
    stage: input.stage,
    team: input.instanceIds,
    control,
    requested: repeat,
  });
  const started = startRunBattle(input.slug, input.difficulty, input.stage, input.instanceIds, control);
  if (!started.ok) {
    clearDungeonSession();
    return started;
  }
  actions.push({ name: 'battle' });
  return ok(undefined);
}

/**
 * Settles a finished run and decides whether another follows. Returns `true` when a new battle has
 * already begun, in which case the battle screen stays where it is.
 */
export function settleDungeonRun(outcome: BattleOutcome): { repeated: boolean } {
  const session = dungeonSession.getState();
  if (session.slug === null) return { repeated: false };
  const { actions } = useGameStore.getState();
  const finished = actions.finishDungeonRun({
    slug: session.slug,
    difficulty: session.difficulty,
    stage: session.stage,
    energySpent: session.energySpent,
    runIndex: session.runIndex,
    outcome,
    party: session.team,
  });
  if (!finished.ok) {
    endDungeonBatch('stopped');
    return { repeated: false };
  }
  noteDungeonRunFinished(finished.value);
  const after = dungeonSession.getState();
  // A keeper that held ends the evening: repeating into a wall only spends the bar.
  if (outcome.kind !== 'victory') {
    endDungeonBatch('defeat');
    return { repeated: false };
  }
  if (after.stopping) {
    endDungeonBatch('stopped');
    return { repeated: false };
  }
  if (after.completed >= after.requested) {
    endDungeonBatch('done');
    return { repeated: false };
  }
  const again = startRunBattle(
    session.slug,
    session.difficulty,
    session.stage,
    session.team,
    session.control,
  );
  if (again.ok) return { repeated: true };
  endDungeonBatch(again.error.code === 'insufficient_energy' ? 'energy' : 'stopped');
  return { repeated: false };
}

/** What the battle and result screens need about the run in flight. */
export function currentDungeonRun(): {
  slug: string;
  difficulty: DungeonDifficulty;
  stage: number;
} | null {
  const { slug, difficulty, stage } = dungeonSession.getState();
  return slug === null ? null : { slug, difficulty, stage };
}

export { clearDungeonSession, stopDungeonBatch };

/** An attempt that never started: no fight, no turns, and the energy already gone. */
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
