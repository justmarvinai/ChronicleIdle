import { registerStrings } from '@i18n/index';
import type { ChangelogPanel } from './ChangelogPanel';

/**
 * The releases and their words are the largest table the game has, and every release adds to it,
 * so they are not in the first screen's bundle: they arrive with the panel and join the dictionary
 * before it draws (ADR-049). A local chunk, precached by the service worker — the wait is a frame.
 *
 * One promise, shared: the title screen starts it the moment its own chunk is evaluated
 * (`preloadChangelog`), so the window it keeps open fills with the screen rather than after it.
 */
let pending: Promise<{ default: typeof ChangelogPanel }> | null = null;

/** The panel's chunk and its words, fetched once however many views ask for them. */
export function loadChangelogPanel(): Promise<{ default: typeof ChangelogPanel }> {
  pending ??= Promise.all([import('./ChangelogPanel'), import('@i18n/en/changelog')]).then(
    ([panel, words]) => {
      registerStrings(words.changelog);
      return { default: panel.ChangelogPanel };
    },
  );
  return pending;
}

/** Starts fetching the panel and its words now, without drawing anything. */
export function preloadChangelog(): void {
  void loadChangelogPanel();
}
