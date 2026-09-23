/**
 * What the Dungeons card on Game Modes says (docs/design/DUNGEONS.md §2).
 *
 * Two numbers, both of which change what a player does next: how many keeps they may walk into,
 * and the deepest any of them has been taken. Its own module so the card can read it without
 * pulling in the overview screen's chunk.
 */
import type { DungeonBand } from '@content/balance/dungeon';
import { RARITIES, type Rarity } from '@content/champions/types';
import { content } from '@content/registry';
import { deepestLabel, progressOf } from '@engine/dungeon/index';
import { t, type I18nKey } from '@i18n/index';
import type { SaveGame } from '@engine/schema/save';
import type { DungeonView } from '@state/dungeon';

export function dungeonsNote(save: SaveGame): string {
  const open = content.openDungeons.length;
  // The deepest rung anywhere: Hard beats Normal, and a deeper stage beats a shallower one.
  let best: { difficulty: 'normal' | 'hard'; stage: number } | null = null;
  for (const def of content.openDungeons) {
    const deepest = deepestLabel(progressOf(save.dungeons.cleared, def.slug));
    if (!deepest) continue;
    if (
      !best ||
      (deepest.difficulty === 'hard' && best.difficulty === 'normal') ||
      (deepest.difficulty === best.difficulty && deepest.stage > best.stage)
    )
      best = deepest;
  }
  if (!best) return t('gameModes.dungeons.noteNone', { open });
  return t('gameModes.dungeons.note', {
    open,
    label: `${t(`dungeon.difficulty.${best.difficulty}` as I18nKey)} ${best.stage}`,
  });
}

/** "Cindervault, normal 14" as a player would read it. */
export function deepestText(view: DungeonView): string {
  const deepest = view.deepest;
  if (!deepest) return t('dungeons.card.untouched');
  return t('dungeons.card.deepest', {
    label: `${t(`dungeon.difficulty.${deepest.difficulty}` as I18nKey)} ${deepest.stage}`,
  });
}

/** "1–2★", or "6★" when a band rolls only one. */
export function starsLabel(stars: readonly number[]): string {
  const min = Math.min(...stars);
  const max = Math.max(...stars);
  return min === max ? t('dungeon.starsOne', { stars: min }) : t('dungeon.stars', { min, max });
}

/** The rarities a band can drop, worst first — which ones, not the weights. */
export function bandRarities(band: DungeonBand): Rarity[] {
  return RARITIES.filter((rarity) => (band.rarity[rarity] ?? 0) > 0);
}
