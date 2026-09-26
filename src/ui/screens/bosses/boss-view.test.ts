/**
 * Which tier a boss gate opens on (docs/tech/UI_DESIGN.md §5.13): the one the chronicle is working
 * on, so the Titan's Easy tier (0.9.10) does not send everybody who fights Normal back to the
 * bottom of the ladder.
 */
import { describe, expect, it } from 'vitest';
import { bossView, type BossView } from '@state/bosses';
import { useGameStore } from '@state/store';
import { openingTier } from './boss-view';

function titanView(): BossView {
  const actions = useGameStore.getState().actions;
  actions.resetGame();
  actions.newGame('Keeper');
  actions.chooseStarter('champ.ser_corvin');
  const save = useGameStore.getState().save;
  if (!save) throw new Error('no save');
  const view = bossView(save, 'boss.titan', Date.now());
  if (!view) throw new Error('no titan');
  return view;
}

const withTier = (view: BossView, id: string, change: Partial<BossView['tiers'][number]>): BossView => ({
  ...view,
  tiers: view.tiers.map((tier) => (tier.tier.id === id ? { ...tier, ...change } : tier)),
});

describe('the tier a boss gate opens on', () => {
  it('is the first tier for a chronicle that has never fought', () => {
    expect(openingTier(titanView())?.tier.id).toBe('easy');
  });

  it('is the deepest tier with damage in it this period', () => {
    const view = withTier(withTier(titanView(), 'easy', { damage: 40_000 }), 'normal', { damage: 90_000 });
    expect(openingTier(view)?.tier.id).toBe('normal');
  });

  it('is the deepest tier ever fought when this period has no damage yet', () => {
    const record = { damage: 300_000, at: 0, team: ['champ.khazgor'] };
    const view = withTier(withTier(titanView(), 'easy', { record }), 'hard', { record });
    expect(openingTier(view)?.tier.id).toBe('hard');
  });
});
