import { useCallback, useEffect, useRef } from 'react';
import { selectActions } from '@state/selectors';
import { useGameStore } from '@state/store';
import {
  fullscreenSupported,
  isFullscreen,
  onFullscreenChange,
  requestFullscreen,
  toggleFullscreen,
} from '@platform/window';

/**
 * Fullscreen offered, never forced (owner's answer Q27): the first click on the title screen
 * requests fullscreen once per session while the setting is on; leaving fullscreen afterwards
 * counts as declining, turns the setting off and is never asked again.
 */
export function useFullscreenOffer(): {
  offer: () => void;
  toggle: () => Promise<void>;
  supported: boolean;
} {
  const actions = useGameStore(selectActions);
  const offered = useGameStore((s) => s.ui.fullscreenOffered);
  const declined = useGameStore((s) => s.ui.fullscreenDeclined);
  const setting = useGameStore((s) => s.save?.settings.launchFullscreen ?? null);
  const wantsOffer = setting ?? !declined;
  // True while the fullscreen currently active is the one we offered (not a manual toggle).
  const offeredActive = useRef(false);

  useEffect(() => {
    actions.setFullscreen(isFullscreen());
    return onFullscreenChange((active) => {
      actions.setFullscreen(active);
      if (!active && offeredActive.current) {
        offeredActive.current = false;
        actions.setFullscreenOffer({ declined: true });
        if (useGameStore.getState().save) actions.updateSettings({ launchFullscreen: false });
      }
    });
  }, [actions]);

  const offer = useCallback(() => {
    if (offered || !wantsOffer || !fullscreenSupported() || isFullscreen()) return;
    actions.setFullscreenOffer({ offered: true });
    void requestFullscreen().then((ok) => {
      offeredActive.current = ok;
      if (!ok) actions.setFullscreenOffer({ declined: true });
    });
  }, [actions, offered, wantsOffer]);

  const toggle = useCallback(async () => {
    const active = await toggleFullscreen();
    offeredActive.current = false;
    actions.setFullscreen(active);
  }, [actions]);

  return { offer, toggle, supported: fullscreenSupported() };
}
