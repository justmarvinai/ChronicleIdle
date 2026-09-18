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

afterEach(() => {
  cleanup();
});
