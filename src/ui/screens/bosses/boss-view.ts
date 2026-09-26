/**
 * What the boss menus print (docs/tech/UI_DESIGN.md §5.13). Display only: the rules are the
 * engine's and the numbers are the save's.
 */
import { content } from '@content/registry';
import type { SaveGame } from '@engine/schema/save';
import { isFeatureUnlocked } from '@engine/progression/unlocks';
import { bossView, type BossTierView, type BossView } from '@state/bosses';
import { t, translate } from '@i18n/index';

/**
 * The keys left on every gate the chronicle has opened, named by boss: `Gargoyle 2/2 · Titan 3/3`.
 * A gate the player cannot walk through yet is left out rather than shown at zero, because a
 * locked door's keys are not a number anybody can act on.
 */
export function bossKeysNote(save: SaveGame, now: number): string | null {
  const parts = content.bosses
    .filter((boss) => isFeatureUnlocked(boss.feature, save.profile.level))
    .map((boss) => {
      const view = bossView(save, boss.id, now);
      return view
        ? t('gameModes.boss.keys', {
            boss: translate(boss.name),
            left: view.keysLeft,
            total: boss.keysPerPeriod,
          })
        : null;
    })
    .filter((part): part is string => part !== null);
  return parts.length ? parts.join(' · ') : null;
}

/**
 * The tier the gate opens on when the player has not picked one: the deepest tier they have put
 * damage into this period, else the deepest they have ever fought, else the first. A chronicle
 * that has been working on Normal is not sent back to Easy every time the Titan gains a tier
 * below it, and a new one starts at the bottom.
 */
export function openingTier(view: BossView): BossTierView | undefined {
  const deepest = (pick: (tier: BossTierView) => boolean): BossTierView | undefined =>
    [...view.tiers].reverse().find(pick);
  return deepest((tier) => tier.damage > 0) ?? deepest((tier) => tier.record !== null) ?? view.tiers[0];
}
