import { useCallback } from 'react';
import { selectActions } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { PlaceWay } from './places';

/** Follows a way: a screen is pushed (which closes any dialog), a dialog opens over the screen. */
export function useGo(): (way: PlaceWay) => void {
  const actions = useGameStore(selectActions);
  return useCallback(
    (way: PlaceWay) => {
      if ('route' in way) actions.push(way.route);
      else actions.openDialog(way.dialog);
    },
    [actions],
  );
}
