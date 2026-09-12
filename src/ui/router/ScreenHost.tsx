import { Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useGameStore } from '@state/store';
import { selectRoute } from '@state/selectors';
import { SCREENS } from './screens';
import { ScreenLoading } from './ScreenLoading';
import styles from './ScreenHost.module.css';

/** Renders the top of the screen stack with a cross-fade between screens. */
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
          <Suspense fallback={<ScreenLoading />}>
            <Screen route={route} />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
