import { services, servicesReady } from '@state/services';
import { useGameStore } from '@state/store';

/** Erases the chronicle from this browser after keeping one last backup. */
export async function resetChronicle(): Promise<void> {
  const { actions } = useGameStore.getState();
  if (servicesReady()) {
    await services().persistence.backup('pre-reset');
    await services().persistence.flush();
  }
  actions.resetGame();
  if (servicesReady()) {
    const storage = services().storage;
    // Keep backups, drop the current save.
    await storage.storeSave(null, Date.now()).catch(() => undefined);
  }
}
