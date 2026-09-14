import { useEffect } from 'react';
import { selectActions, selectDialog, selectLevelUp, selectRoute } from '@state/selectors';
import { useGameStore } from '@state/store';

/** Screens that must not be interrupted: a fight, and the screens before a chronicle exists. */
const BUSY = new Set(['battle', 'title', 'starter']);

/**
 * Opens the level-up dialog once the player is somewhere it can be shown (ECONOMY.md §4). Every
 * XP source queues its levels in `ui.levelUp`; this is the only thing that raises the dialog, so a
 * level gained mid-battle celebrates on the result screen instead of over the fight.
 */
export function useLevelUpCelebration(): void {
  const levelUp = useGameStore(selectLevelUp);
  const dialog = useGameStore(selectDialog);
  const route = useGameStore(selectRoute);
  const actions = useGameStore(selectActions);
  useEffect(() => {
    if (!levelUp || levelUp.levels.length === 0) return;
    if (dialog !== null || BUSY.has(route.name)) return;
    actions.openDialog({ name: 'level-up' });
  }, [levelUp, dialog, route.name, actions]);
}
