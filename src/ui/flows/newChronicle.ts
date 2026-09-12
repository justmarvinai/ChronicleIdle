import { duckMusic, playSfx } from '@audio/index';
import { ok, type Result } from '@engine/errors';
import { services, servicesReady } from '@state/services';
import { useGameStore } from '@state/store';

/** Creates a new chronicle: backup the old one, create, play the stinger, land in Emberhold. */
export async function startNewChronicle(name: string): Promise<Result<void>> {
  const state = useGameStore.getState();
  if (state.save && servicesReady()) await services().persistence.backup('pre-new-game');
  const result = state.actions.newGame(name);
  if (!result.ok) return result;
  playSfx('stinger.new_chronicle');
  duckMusic(0.35, 4500);
  if (servicesReady()) await services().persistence.flush();
  return ok(undefined);
}
