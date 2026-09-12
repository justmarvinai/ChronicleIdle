import type { Clock } from '@engine/time/clock';

/** The real wall clock. Only platform/app code may construct it; the engine receives it. */
export const systemClock: Clock = { now: () => Date.now() };
