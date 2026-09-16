/**
 * Domain events (docs/tech/ARCHITECTURE.md §3.1). Reducers describe what happened; the UI, audio
 * and later the quest tracker react. The bus is synchronous and never throws past a listener.
 */
import type { Difficulty } from '@content/balance/battle';
import type { ShardId } from '@content/balance/summon';
import type { ChampionId, Rarity } from '@content/champions/types';
import type { QuestPeriod } from '@content/quests/types';
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
  | { type: 'gear.equipped'; instanceId: string; pieceId: string }
  | { type: 'gear.unequipped'; instanceId: string; pieceId: string }
  | { type: 'gear.levelled'; pieceId: string; level: number }
  | { type: 'gear.crafted'; pieceId: string; tier: string }
  | { type: 'gear.dismantled'; count: number }
  | { type: 'gear.refined'; pieceId: string; stars: number }
  | {
      type: 'summon.revealed';
      shard: ShardId;
      bannerId: string;
      count: number;
      /** The rarest of the press — what the music and the stinger answer to. */
      best: Rarity;
    }
  | {
      type: 'idle.claimed';
      /** Hours the chest was holding. */
      hours: number;
      tier: number;
    }
  | {
      type: 'boss.fightFinished';
      bossId: string;
      tierId: string;
      /** Damage this fight did, and the period's pool after it (`BOSSES.md` §1). */
      damage: number;
      total: number;
      killed: boolean;
    }
  | {
      type: 'quests.claimed';
      period: QuestPeriod;
      questIds: readonly string[];
      points: number;
      /** True when that claim was the one that finished the board. */
      boardCompleted: boolean;
    }
  | { type: 'quests.chestClaimed'; period: QuestPeriod; points: number; cycled: boolean }
  | {
      type: 'mission.claimed';
      missionId: string;
      chapter: number;
      /** True when that claim finished the chapter, so its chest is waiting. */
      chapterComplete: boolean;
    }
  | { type: 'mission.chapterChest'; chapter: number }
  /** A tutorial lesson was taught, or a chapter waved off (`TUTORIAL.md`). */
  | { type: 'tutorial.step'; stepId: string; chapter: number }
  | { type: 'tutorial.chapterSkipped'; chapterId: string }
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
