/**
 * The Gargoyle's gate through the store (docs/design/BOSSES.md §1): keys charged before the fight,
 * damage banked across them, chests paid once, and the tribute a spent period still owed.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@content/registry';
import type { BattleOutcome } from '@engine/battle/types';
import { FixedClock, MS_PER_HOUR } from '@engine/time/clock';
import { applyOfflineElapsed } from './offline';
import { bossView } from './bosses';
import { createGameStore } from './store';

/** 2026-09-15 12:00 local — noon, so a few hours either way is the same day. */
const T0 = new Date(2026, 8, 15, 12, 0).getTime();
const EASY_HP = 250_000;

function chronicle({ level = 20 } = {}) {
  const clock = new FixedClock(T0);
  const { store, events } = createGameStore({ clock });
  const { actions } = store.getState();
  actions.newGame('Slayer');
  actions.chooseStarter('champ.ser_corvin');
  store.setState((state) => {
    if (state.save) {
      state.save.profile.level = level;
      state.save.seedRoot = 'test-seed';
    }
    return state;
  });
  return { clock, store, events, actions: store.getState().actions };
}

const save = (store: ReturnType<typeof chronicle>['store']) => store.getState().save!;
const held = (store: ReturnType<typeof chronicle>['store'], id: string): number =>
  save(store).wallet[id as 'gold'] ?? 0;

/** A finished fight that did `damage` to the Easy tier's Gargoyle. */
function fought(damage: number, kind: BattleOutcome['kind'] = 'timeout'): BattleOutcome {
  return {
    kind,
    turns: 50,
    allyTurns: 20,
    wavesCleared: kind === 'victory' ? 1 : 0,
    waveCount: 1,
    units: [
      {
        unitId: 'w0e0',
        defId: 'enemy.gargoyle_easy',
        instanceId: null,
        side: 'enemy',
        alive: kind !== 'victory',
        died: kind === 'victory',
        damageDealt: 1_000,
        damageTaken: damage,
        healingDone: 0,
        kills: 0,
      },
    ],
    enemyHpLeft: 0.5,
    seed: 'x',
    decisions: [],
  };
}

describe('spending a key', () => {
  it('charges the key before the fight and refuses a third', () => {
    const { store, actions } = chronicle();
    const first = actions.startBossFight('boss.gargoyle', 'easy');
    if (!first.ok) throw new Error(first.error.message);
    expect(first.value.encounterId).toBe('encounter.boss.gargoyle.easy');
    expect(first.value.keysLeft).toBe(1);
    expect(save(store).bosses['boss.gargoyle']?.keysUsed).toBe(1);

    expect(actions.startBossFight('boss.gargoyle', 'normal').ok).toBe(true);
    const third = actions.startBossFight('boss.gargoyle', 'easy');
    expect(third.ok).toBe(false);
  });

  it('refuses while the gate is closed, and refuses a tier that does not exist', () => {
    const { actions } = chronicle({ level: 9 });
    expect(actions.startBossFight('boss.gargoyle', 'easy').ok).toBe(false);
    expect(actions.startBossFight('boss.gargoyle', 'nightmare').ok).toBe(false);
    expect(actions.startBossFight('boss.nobody', 'easy').ok).toBe(false);
  });
});

describe('banking the damage', () => {
  it('adds both keys to one pool and pays the tier chronicle XP', () => {
    const { store, actions } = chronicle();
    const xpBefore = save(store).profile.xp;
    actions.startBossFight('boss.gargoyle', 'easy');
    const first = actions.finishBossFight({
      bossId: 'boss.gargoyle',
      tierId: 'easy',
      outcome: fought(30_000),
      team: ['champ.ser_corvin'],
    });
    if (!first.ok) throw new Error(first.error.message);
    expect(first.value.damage).toBe(30_000);
    expect(first.value.total).toBe(30_000);
    expect(first.value.percent).toBeCloseTo((30_000 / EASY_HP) * 100, 6);
    // 5 % (12,500) and 15 % (37,500): only the first is in.
    expect(first.value.unlocked).toEqual([5]);
    expect(first.value.newRecord).toBe(true);
    expect(first.value.playerXp).toBe(150);
    expect(save(store).profile.xp).toBe(xpBefore + 150);

    actions.startBossFight('boss.gargoyle', 'easy');
    const second = actions.finishBossFight({
      bossId: 'boss.gargoyle',
      tierId: 'easy',
      outcome: fought(50_000),
      team: ['champ.ser_corvin'],
    });
    if (!second.ok) throw new Error(second.error.message);
    // 80,000 of the 250,000 pool: the 15 % and 30 % chests both come in with it.
    expect(second.value.total).toBe(80_000);
    expect(second.value.unlocked).toEqual([15, 30]);
    expect(save(store).stats['boss.fights']).toBe(2);
    expect(save(store).stats['boss.damage']).toBe(80_000);
  });

  it('remembers the team that set the record, and counts a kill', () => {
    const { store, actions } = chronicle();
    actions.startBossFight('boss.gargoyle', 'easy');
    actions.finishBossFight({
      bossId: 'boss.gargoyle',
      tierId: 'easy',
      outcome: fought(EASY_HP, 'victory'),
      team: ['champ.ser_corvin', 'champ.orla_hedge_witch'],
    });
    const view = bossView(save(store), 'boss.gargoyle', T0);
    const easy = view?.tiers[0];
    expect(easy?.percent).toBe(100);
    expect(easy?.record?.team).toEqual(['champ.ser_corvin', 'champ.orla_hedge_witch']);
    expect(easy?.claimable).toEqual([5, 15, 30, 60, 100]);
    expect(save(store).stats['boss.kills']).toBe(1);
  });
});

describe('taking a chest', () => {
  it('pays what it holds, once', () => {
    const { store, actions } = chronicle();
    actions.startBossFight('boss.gargoyle', 'easy');
    actions.finishBossFight({
      bossId: 'boss.gargoyle',
      tierId: 'easy',
      outcome: fought(20_000),
      team: ['champ.ser_corvin'],
    });
    const goldBefore = held(store, 'gold');

    const claimed = actions.claimBossChest('boss.gargoyle', 'easy', 5);
    if (!claimed.ok) throw new Error(claimed.error.message);
    expect(held(store, 'gold')).toBe(goldBefore + 5_000);
    expect(claimed.value.currencies.map((entry) => entry.currency)).toEqual([
      'gold',
      'brew_justice',
      'brew_valor',
    ]);
    // The same chest again is refused, and one whose damage is not in is refused too.
    expect(actions.claimBossChest('boss.gargoyle', 'easy', 5).ok).toBe(false);
    expect(actions.claimBossChest('boss.gargoyle', 'easy', 15).ok).toBe(false);
    expect(save(store).stats['boss.chests']).toBe(1);
  });

  it('mints the piece the kill chest promises', () => {
    const { store, actions } = chronicle();
    actions.startBossFight('boss.gargoyle', 'easy');
    actions.finishBossFight({
      bossId: 'boss.gargoyle',
      tierId: 'easy',
      outcome: fought(EASY_HP, 'victory'),
      team: ['champ.ser_corvin'],
    });
    const claimed = actions.claimBossChest('boss.gargoyle', 'easy', 100);
    if (!claimed.ok) throw new Error(claimed.error.message);
    const piece = claimed.value.gear;
    expect(piece?.rarity).toBe('rare');
    expect(piece?.stars).toBe(3);
    expect(piece?.source).toBe('boss_chest');
    expect(piece && save(store).inventory[piece.instanceId]).toBeDefined();
  });
});

describe('the period turning over', () => {
  it('pays what was earned and left, then starts the day again', () => {
    const { store, actions } = chronicle();
    actions.startBossFight('boss.gargoyle', 'easy');
    actions.finishBossFight({
      bossId: 'boss.gargoyle',
      tierId: 'easy',
      outcome: fought(40_000),
      team: ['champ.ser_corvin'],
    });
    actions.claimBossChest('boss.gargoyle', 'easy', 5);
    const goldBefore = held(store, 'gold');

    // A day later: the 15 % chest nobody took arrives, and the keys are back.
    const tomorrow = T0 + 24 * MS_PER_HOUR;
    const { save: next, report } = applyOfflineElapsed(save(store), tomorrow);
    expect(report.bossTributes).toHaveLength(1);
    expect(report.bossTributes[0]?.pct).toBe(15);
    expect(next.wallet.gold).toBe(goldBefore + 10_000);
    expect(next.bosses['boss.gargoyle']?.keysUsed).toBe(0);
    expect(next.bosses['boss.gargoyle']?.damage).toEqual({});
    // The record survives the reset.
    expect(next.bosses['boss.gargoyle']?.records['easy']?.damage).toBe(40_000);

    // Running the same load twice owes nothing more.
    const again = applyOfflineElapsed(next, tomorrow);
    expect(again.report.bossTributes).toEqual([]);
    expect(again.save.wallet.gold).toBe(next.wallet.gold);
  });
});

describe('the view the screen reads', () => {
  it('reports keys, the reset and every tier', () => {
    const { store } = chronicle();
    const view = bossView(save(store), 'boss.gargoyle', T0);
    expect(view?.unlocked).toBe(true);
    expect(view?.keysLeft).toBe(2);
    expect(view?.msUntilReset).toBe(12 * MS_PER_HOUR);
    expect(view?.tiers).toHaveLength(4);
    expect(view?.claimable).toBe(0);
    expect(view?.tiers[0]?.chests.map((chest) => chest.state)).toEqual([
      'locked',
      'locked',
      'locked',
      'locked',
      'locked',
    ]);
    // A chronicle too young to enter still sees the gate.
    const young = bossView(
      { ...save(store), profile: { ...save(store).profile, level: 5 } },
      'boss.gargoyle',
      T0,
    );
    expect(young?.unlocked).toBe(false);
    expect(bossView(save(store), 'boss.nobody', T0)).toBeNull();
  });

  it('is the boss the hub card names', () => {
    expect(content.bossById('boss.gargoyle')?.keyCurrency).toBe('key_daily');
    expect(content.bossById('boss.gargoyle')?.feature).toBe('daily_boss');
  });
});
