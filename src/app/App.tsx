import { useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
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
  // CSS keyframes are stopped by a token rule; Framer's animations are JS, so they are told here
  // (CLAUDE.md §6: reduced motion is honoured for every non-battle animation).
  const reduced = useGameStore((s) => s.save?.settings.reducedMotion ?? null);

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
    <MotionConfig reducedMotion={reduced === null ? 'user' : reduced ? 'always' : 'never'}>
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
    </MotionConfig>
  );
}
