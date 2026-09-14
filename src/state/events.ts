/**
 * Domain events (docs/tech/ARCHITECTURE.md §3.1). Reducers describe what happened; the UI, audio
 * and later the quest tracker react. The bus is synchronous and never throws past a listener.
 */
import type { Difficulty } from '@content/balance/battle';
import type { ChampionId } from '@content/champions/types';
import type { CurrencyChange } from '@engine/economy/wallet';

export type DomainEvent =
  | { type: 'game.created'; name: string }
  | { type: 'starter.chosen'; defId: ChampionId; instanceId: string }
  | { type: 'champion.added'; defId: ChampionId; instanceId: string; source: string }
  | { type: 'champion.updated'; instanceId: string; change: 'locked' | 'favourite' }
  | { type: 'champion.levelled'; instanceId: string; level: number; levelsGained: number }
  | { type: 'champion.rankedUp'; instanceId: string; stars: number }
  | { type: 'champion.skillUpgraded'; instanceId: string; abilityId: string; step: number }
  | { type: 'champion.consumed'; instanceId: string }
  | { type: 'profile.avatarChanged'; defId: ChampionId | null }
  | { type: 'game.loaded'; migrated: boolean }
  | { type: 'game.reset' }
  | { type: 'profile.renamed'; name: string }
  | { type: 'profile.titleChanged'; title: string | null }
  | { type: 'player.leveled'; level: number; levelsGained: number; unlocks: readonly string[] }
  | { type: 'currency.changed'; changes: CurrencyChange[]; reason: string }
  | { type: 'energy.changed'; delta: number; total: number }
  | { type: 'settings.changed' }
  | { type: 'battle.ended'; outcome: 'victory' | 'defeat' | 'timeout' | 'retreat'; encounterId: string }
  | {
      type: 'campaign.runFinished';
      stageId: string;
      difficulty: Difficulty;
      stars: number;
      firstClear: boolean;
    };

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
