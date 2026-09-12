/**
 * Domain events (docs/tech/ARCHITECTURE.md §3.1). Reducers describe what happened; the UI, audio
 * and later the quest tracker react. The bus is synchronous and never throws past a listener.
 */
import type { CurrencyChange } from '@engine/economy/wallet';

export type DomainEvent =
  | { type: 'game.created'; name: string }
  | { type: 'game.loaded'; migrated: boolean }
  | { type: 'game.reset' }
  | { type: 'profile.renamed'; name: string }
  | { type: 'currency.changed'; changes: CurrencyChange[]; reason: string }
  | { type: 'energy.changed'; delta: number; total: number }
  | { type: 'settings.changed' };

export type EventListener = (event: DomainEvent) => void;

export class EventBus {
  private listeners = new Set<EventListener>();

  on(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: DomainEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[events] listener failed', error);
      }
    }
  }
}
