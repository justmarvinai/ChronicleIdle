/**
 * Starting a battle from any screen: validates the team through the controller, remembers the
 * team for the mode, and enters the battle screen.
 */
import { maxBattleSpeed } from '@engine/campaign/progress';
import { palaceBonusOf } from '@state/palace';
import { battleController, type BattleSpeed } from '@state/battle/index';
import { progressOf } from '@state/campaign';
import { useGameStore } from '@state/store';
import type { Result } from '@engine/errors';
import { fail } from '@engine/errors';

export interface LaunchInput {
  encounterId: string;
  instanceIds: readonly string[];
  control?: 'manual' | 'auto';
}

export function launchBattle(input: LaunchInput): Result<void> {
  const { save, actions } = useGameStore.getState();
  if (!save) return fail('invalid_argument', 'No chronicle loaded');
  const fought = save.stats['battles.fought'] ?? 0;
  const control = input.control ?? (save.settings.autoBattle ? 'auto' : 'manual');
  const speed = Math.min(save.settings.battleSpeed, maxBattleSpeed(progressOf(save))) as BattleSpeed;
  const started = battleController.start({
    encounterId: input.encounterId,
    instanceIds: input.instanceIds,
    roster: save.roster,
    palace: palaceBonusOf(save.palace.nodes),
    control,
    speed,
    seed: `${save.seedRoot}:${fought}`,
    awaitPresenter: true,
  });
  if (!started.ok) return started;
  const encounter = battleController.store.getState().encounter;
  actions.setLastUsedTeam(encounter?.partySize === 4 ? 'boss' : 'campaign', input.instanceIds);
  actions.push({ name: 'battle' });
  return started;
}
