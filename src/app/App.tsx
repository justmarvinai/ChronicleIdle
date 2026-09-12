import { useEffect, useState } from 'react';
import { selectBoot } from '@state/selectors';
import { useGameStore } from '@state/store';
import { ErrorBoundary } from '@ui/chrome/ErrorBoundary';
import { LoadingScreen } from '@ui/chrome/LoadingScreen';
import { UpdateBanner } from '@ui/chrome/UpdateBanner';
import { ToastHost } from '@ui/components/Toast/ToastHost';
import { DialogHost } from '@ui/dialogs/DialogHost';
import { ScreenHost } from '@ui/router/ScreenHost';
import { GameViewport } from '@ui/viewport/GameViewport';
import { bootstrap } from './bootstrap';

export function App() {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const boot = useGameStore(selectBoot);

  useEffect(() => {
    let live = true;
    bootstrap((fraction) => live && setProgress(fraction))
      .then(() => live && setReady(true))
      .catch((error: unknown) => {
        console.error('[boot] failed', error);
        if (live) {
          useGameStore.getState().actions.setBoot({
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
          });
          setReady(true);
        }
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <GameViewport>
      <ErrorBoundary>
        {ready && boot.status !== 'booting' ? (
          <>
            <ScreenHost />
            <DialogHost />
            <ToastHost />
            <UpdateBanner />
          </>
        ) : (
          <LoadingScreen progress={progress} />
        )}
      </ErrorBoundary>
      <div id="tooltip-layer" />
    </GameViewport>
  );
}
