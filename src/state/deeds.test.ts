/**
 * The Hall of Deeds as it touches the save (docs/design/ACHIEVEMENTS.md): what a claim pays and
 * records, what it refuses, what "Claim all" takes in one press, the frames and titles a claim
 * hangs up, and the feats a won battle writes. The arithmetic is `@engine/deeds`' and tested there.
 */
import { describe, expect, it } from 'vitest';
import { FEATURE_UNLOCK_LEVEL } from '@content/balance/unlocks';
import { content } from '@content/registry';
import type { BattleOutcome, UnitReport } from '@engine/battle/types';
import { stageEncounterId } from '@engine/campaign/encounter';
import { stageIdOf } from '@engine/campaign/progress';
import { FixedClock } from '@engine/time/clock';
import { deedsClaimable, deedsState } from './deeds';
import { titlesOf } from './progression';
import { createGameStore } from './store';

/** 2026-09-26 09:00 local. */
const T0 = new Date(2026, 8, 26, 9, 0).getTime();

function chronicle({ level = FEATURE_UNLOCK_LEVEL.deeds, stats = {} as Record<string, number> } = {}) {
  const clock = new FixedClock(T0);
  const { store, events } = createGameStore({ clock });
  store.getState().actions.newGame('Keeper');
  store.getState().actions.chooseStarter('champ.ser_corvin');
  store.setState((state) => {
    if (!state.save) return state;
    state.save.profile.level = level;
    // A clean ledger: only what the test hands the chronicle.
    state.save.stats = { ...stats };
    return state;
  });
  return { clock, store, events, actions: store.getState().actions };
}

type Store = ReturnType<typeof chronicle>['store'];
const save = (store: Store) => {
  const current = store.getState().save;
  if (!current) throw new Error('no chronicle');
  return current;
};

describe('claiming in the Hall', () => {
  it('pays a tier, records it and adds its renown', () => {
    const { store, actions } = chronicle({ stats: { 'campaign.cleared': 1_200 } });
    const gold = save(store).wallet.gold;
    const energy = save(store).energy.value;
    const result = actions.claimAchievement('achievement.stand_breaker');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({ kind: 'achievement', step: 1, renown: 5 });
    expect(save(store).deeds.achievements['achievement.stand_breaker']).toBe(1);
    expect(save(store).wallet.gold).toBe(gold + 10_000);
    expect(save(store).energy.value).toBe(energy + 20);
    // The second tier is met too, and is the next claim.
    expect(actions.claimAchievement('achievement.stand_breaker')).toMatchObject({
      ok: true,
      value: { step: 2 },
    });
    expect(actions.claimAchievement('achievement.stand_breaker').ok).toBe(false);
  });

  it('refuses everything while the Hall is shut, and says why', () => {
    const { store, actions } = chronicle({
      level: FEATURE_UNLOCK_LEVEL.deeds - 1,
      stats: { 'campaign.cleared': 1_200, 'feat.solo': 1 },
    });
    const result = actions.claimAchievement('achievement.stand_breaker');
    expect(result).toMatchObject({ ok: false, error: { code: 'locked' } });
    expect(actions.claimChallenge('challenge.lone_blade').ok).toBe(false);
    expect(actions.claimAllDeeds().ok).toBe(false);
    expect(deedsClaimable(save(store), T0)).toBe(0);
    expect(save(store).deeds).toEqual({ achievements: {}, challenges: [], ranks: 0, frame: null });
  });

  it('claims a challenge once', () => {
    const { store, actions } = chronicle({ stats: { 'feat.solo': 1 } });
    const gems = save(store).wallet.gems;
    expect(actions.claimChallenge('challenge.lone_blade')).toMatchObject({
      ok: true,
      value: { kind: 'challenge', renown: 50 },
    });
    expect(save(store).wallet.gems).toBe(gems + 100);
    expect(actions.claimChallenge('challenge.lone_blade').ok).toBe(false);
    expect(save(store).deeds.challenges).toEqual(['challenge.lone_blade']);
  });

  it('claims a rank only on renown already claimed', () => {
    const { store, actions } = chronicle({ stats: { 'campaign.cleared': 5_000 } });
    expect(actions.claimHallRank().ok).toBe(false);
    for (let tier = 0; tier < 3; tier += 1) actions.claimAchievement('achievement.stand_breaker');
    // 5 + 10 + 20 = 35 renown: the first rank stands on 25.
    expect(actions.claimHallRank()).toMatchObject({ ok: true, value: { kind: 'rank', step: 1 } });
    expect(save(store).deeds.ranks).toBe(1);
    expect(actions.claimHallRank().ok).toBe(false);
  });

  it('takes everything owed in one press, ranks last, as one payout', () => {
    const { store, events, actions } = chronicle({
      stats: { 'campaign.cleared': 25_000, 'battles.victory': 20_000, 'feat.solo': 1, 'feat.untouched': 1 },
    });
    const seen: string[] = [];
    events.on((event) => seen.push(event.type));
    const before = deedsState(save(store), T0);
    const tiers = before.achievements.reduce((sum, view) => sum + view.claimable, 0);
    // Stand-breaker and Victor to the end at least; the starters may meet a first tier or two more.
    expect(tiers).toBeGreaterThanOrEqual(10);
    expect(before.challenges.filter((view) => view.status === 'claimable')).toHaveLength(2);
    // Nothing was claimed before the press, so no rank waits yet: they come after the tiers.
    expect(before.ranks.every((rank) => rank.status === 'locked')).toBe(true);

    const result = actions.claimAllDeeds();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const kinds = result.value.claims.map((claim) => claim.kind);
    expect(kinds.filter((kind) => kind === 'achievement')).toHaveLength(tiers);
    expect(kinds.filter((kind) => kind === 'challenge')).toHaveLength(2);
    const reached = content.hallRanks.filter((rank) => rank.renown <= result.value.renown).length;
    expect(reached).toBeGreaterThanOrEqual(3);
    expect(kinds.filter((kind) => kind === 'rank')).toHaveLength(reached);
    expect(kinds.slice(-reached).every((kind) => kind === 'rank')).toBe(true);
    expect(result.value.renown).toBeGreaterThanOrEqual(155 * 2 + 50 + 75);
    // One entry per currency in the payout, and the frames the ranks hang up.
    const currencies = result.value.currencies.map((entry) => entry.currency);
    expect(new Set(currencies).size).toBe(currencies.length);
    expect(result.value.frames).toContain('frame.bronze');
    expect(seen).toContain('currency.changed');
    expect(seen).toContain('deeds.claimed');
    expect(deedsClaimable(save(store), T0)).toBe(0);
    expect(actions.claimAllDeeds().ok).toBe(false);
  });

  it('announces a frame a claim hangs up', () => {
    const { store, actions } = chronicle({
      stats: { 'campaign.cleared': 25_000, 'battles.victory': 20_000 },
    });
    actions.claimAllDeeds();
    const toasts = store.getState().ui.toasts.map((toast) => toast.textKey);
    expect(toasts).toContain('deeds.frameEarned');
  });
});

describe('the frame worn', () => {
  it('may only be one the chronicle has earned, and can always go back to its own gold', () => {
    const { store, actions } = chronicle({
      stats: { 'campaign.cleared': 25_000, 'battles.victory': 20_000 },
    });
    expect(actions.wearFrame('frame.bronze')).toMatchObject({ ok: false, error: { code: 'locked' } });
    actions.claimAllDeeds();
    expect(actions.wearFrame('frame.bronze')).toMatchObject({ ok: true, value: 'frame.bronze' });
    expect(save(store).deeds.frame).toBe('frame.bronze');
    expect(actions.wearFrame('frame.nowhere').ok).toBe(false);
    expect(actions.wearFrame(null)).toMatchObject({ ok: true, value: null });
    expect(save(store).deeds.frame).toBeNull();
  });
});

describe('the titles the Hall hangs up', () => {
  it('are earned by the claim, not by the renown alone', () => {
    const { store, actions } = chronicle({ stats: { 'feat.rabble': 1 } });
    expect(titlesOf(save(store))).not.toContain('title.rabble_rouser');
    const result = actions.claimChallenge('challenge.rabble');
    expect(result.ok && result.value.titles).toEqual(['title.rabble_rouser']);
    expect(titlesOf(save(store))).toContain('title.rabble_rouser');
  });
});

describe('feats a won battle writes', () => {
  const ally = (defId: string, patch: Partial<UnitReport> = {}): UnitReport => ({
    unitId: `ally-${defId}`,
    defId,
    instanceId: `${defId}-1`,
    side: 'ally',
    alive: true,
    died: false,
    damageDealt: 900,
    damageTaken: 0,
    healingDone: 0,
    kills: 3,
    hp: 100,
    maxHp: 100,
    ...patch,
  });
  const won = (units: UnitReport[], patch: Partial<BattleOutcome> = {}): BattleOutcome => ({
    kind: 'victory',
    turns: 8,
    allyTurns: 5,
    wavesCleared: 3,
    waveCount: 3,
    units,
    enemyHpLeft: 0,
    seed: 'feat',
    decisions: [],
    ...patch,
  });

  it('bumps a counter per feat, even before the Hall is open', () => {
    const { store, actions } = chronicle({ level: 3 });
    actions.recordBattle(won([ally('champ.ser_corvin')]), stageEncounterId(stageIdOf(2, 10), 'hard'));
    const stats = save(store).stats;
    expect(stats['feat.solo']).toBe(1);
    expect(stats['feat.giant_slayer']).toBe(1);
    expect(stats['feat.untouched']).toBe(1);
    expect(stats['feat.swift']).toBe(1);
    expect(stats['feat.last_stand']).toBeUndefined();
  });

  it('writes nothing for a loss', () => {
    const { store, actions } = chronicle();
    actions.recordBattle(
      won([ally('champ.ser_corvin')], { kind: 'defeat' }),
      stageEncounterId(stageIdOf(1, 1), 'hard'),
    );
    expect(Object.keys(save(store).stats).filter((key) => key.startsWith('feat.'))).toEqual([]);
  });
});
