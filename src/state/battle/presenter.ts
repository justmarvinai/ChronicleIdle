/**
 * Contract between the battle controller and whatever plays its events (the Pixi presenter in
 * the render layer, or an instant presenter for tests and headless runs).
 */
import type { BattleEvent, BattleView } from '@engine/battle/index';

export interface BattlePresenter {
  /** Plays a step's events at `speed` (×1–×4); calls `onEvent` as each one lands so the HUD follows. */
  play(events: readonly BattleEvent[], speed: number, onEvent: (event: BattleEvent) => void): Promise<void>;
  /** The presenter's first look at the field (initial view). */
  mount?(view: BattleView): void;
  destroy?(): void;
}

/** Applies every event immediately; the default until a stage presenter attaches. */
export const instantPresenter: BattlePresenter = {
  play(events, _speed, onEvent) {
    for (const event of events) onEvent(event);
    return Promise.resolve();
  },
};
