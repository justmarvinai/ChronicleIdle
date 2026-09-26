import { lazy, Suspense } from 'react';
import { loadChangelogPanel } from './load-changelog';
import type { ChangelogViewProps } from './ChangelogPanel';
import styles from './ChangelogView.module.css';

export type { ChangelogViewProps } from './ChangelogPanel';

const Panel = lazy(loadChangelogPanel);

/** The Chronicle of Changes (UI_DESIGN.md §5.21): its frame holds its size while the pages load. */
export function ChangelogView(props: ChangelogViewProps) {
  const testId = props.testId ?? 'changelog';
  return (
    <Suspense
      fallback={
        <div className={styles.root} style={{ height: props.height }} data-testid={`${testId}-loading`}>
          <div className={styles.skeleton} aria-hidden="true">
            <span className={styles.skeletonHead} />
            <span className={styles.skeletonLine} />
            <span className={styles.skeletonLine} />
            <span className={styles.skeletonLineShort} />
          </div>
        </div>
      }
    >
      <Panel {...props} />
    </Suspense>
  );
}
