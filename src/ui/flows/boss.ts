/**
 * Fighting a period boss from the gate (docs/design/BOSSES.md §1).
 *
 * A key is charged, the fight runs, and whatever damage it did joins the period's pool for that
 * tier — win, lose or run out of turns. There is no auto-repeat: every fight costs a key, and a
 * key is the player's to spend.
 */
import type { BattleOutcome } from '@engine/battle/types';
import { maxBattleSpeed } from '@engine/campaign/progress';
import { fail, ok, type Result } from '@engine/errors';
import { battleController, type BattleSpeed } from '@state/battle/index';
import { beginBossFight, bossSession, clearBossSession, noteBossFightFinished } from '@state/boss-session';
import { progressOf } from '@state/campaign';
import { useGameStore } from '@state/store';

export interface BossLaunchInput {
  bossId: string;
  tierId: string;
  instanceIds: readonly string[];
  control?: 'manual' | 'auto';
}

/** Spends a key, starts the fight and enters the battle screen. */
export function launchBossFight(input: BossLaunchInput): Result<void> {
  const { save, actions } = useGameStore.getState();
  if (!save) return fail('invalid_argument', 'No chronicle loaded');
  const control = input.control ?? (save.settings.autoBattle ? 'auto' : 'manual');
  const charged = actions.startBossFight(input.bossId, input.tierId);
  if (!charged.ok) return charged;

  const speed = Math.min(save.settings.battleSpeed, maxBattleSpeed(progressOf(save))) as BattleSpeed;
  const started = battleController.start({
    encounterId: charged.value.encounterId,
    instanceIds: input.instanceIds,
    roster: save.roster,
    control,
    speed,
    seed: `${save.seedRoot}:boss:${save.stats['boss.fights'] ?? 0}`,
    awaitPresenter: true,
  });
  if (!started.ok) {
    // The key is already spent, so the fight has to be recorded as nothing rather than vanish.
    actions.finishBossFight({
      bossId: input.bossId,
      tierId: input.tierId,
      outcome: emptyOutcome(),
      team: [],
    });
    return started;
  }
  beginBossFight({ bossId: input.bossId, tierId: input.tierId, team: input.instanceIds, control });
  actions.setLastUsedTeam('boss', input.instanceIds);
  actions.push({ name: 'battle' });
  return ok(undefined);
}

/** Banks a finished boss fight. Returns false when the fight was not a boss's. */
export function settleBossFight(outcome: BattleOutcome): boolean {
  const session = bossSession.getState();
  if (!session.bossId || !session.tierId) return false;
  const { save, actions } = useGameStore.getState();
  const team: string[] = (session.team ?? [])
    .map((instanceId) => save?.roster[instanceId]?.defId)
    .filter((defId): defId is NonNullable<typeof defId> => !!defId);
  const finished = actions.finishBossFight({
    bossId: session.bossId,
    tierId: session.tierId,
    outcome,
    team,
  });
  if (finished.ok) noteBossFightFinished(finished.value);
  return true;
}

/** What the battle and result screens need about the boss fight in flight. */
export interface BossRunView {
  bossId: string;
  tierId: string;
}

export function currentBossRun(): BossRunView | null {
  const { bossId, tierId } = bossSession.getState();
  return bossId && tierId ? { bossId, tierId } : null;
}

export { clearBossSession };

/** A fight that never started: no damage, no turns, and the key already gone. */
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
