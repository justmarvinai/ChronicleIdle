import { Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useGameStore } from '@state/store';
import { selectRoute } from '@state/selectors';
import { ErrorBoundary } from '@ui/chrome/ErrorBoundary';
import { SCREENS } from './screens';
import { ScreenLoading } from './ScreenLoading';
import styles from './ScreenHost.module.css';

/**
 * Renders the top of the screen stack with a cross-fade between screens.
 *
 * Each screen is wrapped in its own `ErrorBoundary` (CLAUDE.md §5.7). The boundary is keyed by
 * route, so a screen that threw is not still broken when the player comes back to it — leaving
 * and returning gives it a fresh mount, which is what "Return to Emberhold" is for. The root
 * boundary in `App` stays as the backstop for anything outside a screen.
 */
export function ScreenHost() {
  const route = useGameStore(selectRoute);
  const Screen = SCREENS[route.name];
  const key = route.name === 'locked' ? `locked:${route.feature}` : route.name;
  return (
    <div className={styles.host}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={key}
          className={styles.screen}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <ErrorBoundary key={key}>
            <Suspense fallback={<ScreenLoading />}>
              <Screen route={route} />
            </Suspense>
          </ErrorBoundary>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
