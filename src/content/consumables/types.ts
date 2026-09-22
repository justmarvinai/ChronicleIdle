/**
 * Consumables (docs/design/MARKET.md §3): the things a chronicle *holds* rather than spends.
 *
 * Currencies live in the wallet and are spent the moment there is something to spend them on. A
 * consumable is different: it is bought now and used when the player decides, which is the whole
 * reason the Bag exists (the owner's brief). One sits in the Bag until its effect is asked for.
 *
 * The effect is a **discriminated union**, never a flag and never an `if (id === …)` anywhere in
 * the engine (`CLAUDE.md` §8). Adding a consumable is a new row here and a new arm in the reducer
 * that applies it; adding a *kind* of consumable is a new member of `ConsumableEffect`, which the
 * compiler then demands be handled everywhere effects are applied.
 */
import type { AssetKey } from '@assets/manifest.generated';
import type { BoostId } from '@content/balance/boosts';

/**
 * What using one does.
 *
 * - `boost` starts or extends one of the three timed doublers (`balance/boosts.ts`).
 * - `brewery_runs` hands back the day's twenty Brewery runs, whatever is left of them.
 * - `quest_reset` puts a whole quest board back to untouched — its quests, its points and its
 *   chests (the owner's answer), so the day can be earned twice.
 * - `mission_skip` marks the open mission of the Chronicler's Path complete **without paying its
 *   reward**. The line advances and the chapter's chest still counts it (the owner's answer).
 * - `champion_level` takes one champion to the cap of the stars it already has.
 * - `champion_stars` takes one champion to the most stars its rarity allows, keeping the level it
 *   had — the game's own rank-up rule, applied for free and without the food.
 */
export type ConsumableEffect =
  | { kind: 'boost'; boost: BoostId }
  | { kind: 'brewery_runs' }
  | { kind: 'quest_reset'; period: 'daily' | 'weekly' }
  | { kind: 'mission_skip' }
  | { kind: 'champion_level' }
  | { kind: 'champion_stars' };

/** Effects that cannot be used without being told which champion they are for. */
export type ChampionTargetEffect = Extract<ConsumableEffect, { kind: 'champion_level' | 'champion_stars' }>;

export interface ConsumableDef {
  /** `item.<snake_case>`. */
  id: string;
  /** i18n keys. */
  name: string;
  /** One sentence saying exactly what using it does, in the words a player would use. */
  description: string;
  icon: AssetKey;
  /** Drives the frame the Bag and the shelf draw it in, the way gear rarity does. */
  rarity: 'rare' | 'epic' | 'legendary' | 'mythic';
  effect: ConsumableEffect;
  version: number;
}

/** Whether using this one has to ask which champion first. */
export function needsChampion(def: ConsumableDef): boolean {
  return def.effect.kind === 'champion_level' || def.effect.kind === 'champion_stars';
}
