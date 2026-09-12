/**
 * Service-worker registration with a prompt-style update flow (docs/tech/ARCHITECTURE.md §11):
 * a new build is downloaded in the background and applied only when the player restarts.
 */
import { registerSW } from 'virtual:pwa-register';

export interface PwaHandlers {
  onNeedRefresh(): void;
  onOfflineReady(): void;
}

export interface PwaHandle {
  /** Activates the waiting service worker and reloads. */
  applyUpdate(): Promise<void>;
}

export function registerPwa(handlers: PwaHandlers): PwaHandle {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || import.meta.env.DEV) {
    return { applyUpdate: async () => window.location.reload() };
  }
  const update = registerSW({
    immediate: true,
    onNeedRefresh: handlers.onNeedRefresh,
    onOfflineReady: handlers.onOfflineReady,
    onRegisterError: (error: unknown) => console.warn('[pwa] registration failed', error),
  });
  return { applyUpdate: () => update(true) };
}
