/**
 * Champion choices (docs/design/CAMPAIGN.md §7, SUMMONING.md §5). Mastering a difficulty owes the
 * chronicle a champion of a named rarity, taken at the Portal's picker.
 *
 * The entitlement is derived from the campaign's stars and the taking is what the save stores, so
 * the ledger cannot disagree with the play: a chronicle that mastered Intro before the Portal
 * existed is owed its Epic the moment it opens the Portal, and one that has taken its Epic is
 * never owed a second (CLAUDE.md §5.5).
 */
import { CHAMPION_CHOICES, type ChampionChoiceDef } from '@content/balance/campaign';
import type { ChampionDef, Rarity } from '@content/champions/types';
import { isDifficultyMastered, type CampaignProgress } from '@engine/campaign/progress';

export function choiceById(id: string): ChampionChoiceDef | undefined {
  return CHAMPION_CHOICES.find((choice) => choice.id === id);
}

/** Choices the campaign owes that have not been taken, in catalogue order. */
export function openChoices(
  progress: CampaignProgress,
  taken: Readonly<Record<string, unknown>>,
): ChampionChoiceDef[] {
  return CHAMPION_CHOICES.filter(
    (choice) => taken[choice.id] === undefined && isDifficultyMastered(progress, choice.difficulty),
  );
}

/** Everyone the picker may offer: the summonable pool at the choice's rarity, in content order. */
export function choicePool(pool: readonly ChampionDef[], rarity: Rarity): ChampionDef[] {
  return pool.filter((def) => def.rarity === rarity);
}
