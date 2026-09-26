import { lazy, Suspense } from 'react';
import { registerStrings } from '@i18n/index';
import type { ChangelogViewProps } from './ChangelogPanel';
import styles from './ChangelogView.module.css';

export type { ChangelogViewProps } from './ChangelogPanel';

/**
 * The releases and their words are the largest table the game has, and every release adds to it,
 * so they are not in the first screen's bundle: they arrive with the panel and join the dictionary
 * before it draws (ADR-049). A local chunk, precached by the service worker — the wait is a frame.
 */
const Panel = lazy(async () => {
  const [panel, words] = await Promise.all([import('./ChangelogPanel'), import('@i18n/en/changelog')]);
  registerStrings(words.changelog);
  return { default: panel.ChangelogPanel };
});

/** The Chronicle of Changes (UI_DESIGN.md §5.21): its frame holds its size while the pages load. */
export function ChangelogView(props: ChangelogViewProps) {
  const testId = props.testId ?? 'changelog';
  return (
    <Suspense
      fallback={
        <div className={styles.root} style={{ height: props.height }} data-testid={`${testId}-loading`} />
      }
    >
      <Panel {...props} />
    </Suspense>
  );
}
