import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/** jsdom has no ResizeObserver; screens that measure (ScrollArea, VirtualGrid) only need a stub. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

/** jsdom does not scroll, so `scrollIntoView` is missing; screens that open on a row call it. */
Element.prototype.scrollIntoView ??= function scrollIntoView(): void {};

/**
 * A missing i18n key is a bug, not a warning. `translate` prints one and hands back the key, which
 * on screen reads as `palace.node.vigour` where a name should be — so any test that renders a
 * component asking for a key that is not in the dictionary fails here instead.
 */
const missingKeys: string[] = [];
const warn = console.warn.bind(console);
console.warn = (...args: unknown[]): void => {
  const [first] = args;
  if (typeof first === 'string' && first.startsWith('[i18n] missing key')) missingKeys.push(first);
  else warn(...args);
};

afterEach(() => {
  cleanup();
  const seen = missingKeys.splice(0);
  if (seen.length > 0) throw new Error(seen.join('\n'));
});
