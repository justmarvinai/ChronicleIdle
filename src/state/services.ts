/** App-level services the UI needs (storage, persistence). Registered once by the bootstrap. */
import type { StorageAdapter } from '@platform/storage';
import type { PersistenceHandle } from './persistence';

export interface Services {
  storage: StorageAdapter;
  persistence: PersistenceHandle;
  appVersion: string;
  /** Applies a downloaded update (PWA) and reloads. */
  applyUpdate: () => Promise<void>;
}

let current: Services | null = null;

export function registerServices(services: Services): void {
  current = services;
}

export function services(): Services {
  if (!current) throw new Error('Services not registered — bootstrap has not finished');
  return current;
}

export function servicesReady(): boolean {
  return current !== null;
}
