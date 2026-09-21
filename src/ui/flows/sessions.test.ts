/**
 * A stand and a race settle through different books (`campaign.ts` / `boss.ts`), and the battle
 * screen asks the race first. So whichever fight starts must clear the other's session, or the
 * next campaign run would bank its damage into a boss pool and never record its own stars.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { battleController } from '@state/battle/index';
import { beginBossFight, bossSession } from '@state/boss-session';
import { beginCampaignBatch, campaignSession } from '@state/campaign-session';
import { useGameStore } from '@state/store';
import { launchBossFight } from './boss';
import { launchCampaignRun } from './campaign';

vi.mock('@audio/index', () => ({ playSfx: () => undefined, playMusic: () => undefined }));

const THORNWOOD_1 = { settlement: 1, stage: 1, difficulty: 'intro' } as const;

function chronicle(): string[] {
  const { actions } = useGameStore.getState();
  actions.resetGame();
  actions.newGame('Tester');
  useGameStore.setState((state) => {
    if (state.save) state.save.seedRoot = 'test-seed';
    return state;
  });
  actions.chooseStarter('champ.ser_corvin');
  return Object.keys(useGameStore.getState().save?.roster ?? {});
}

afterEach(() => {
  battleController.end();
  useGameStore.getState().actions.resetGame();
});

describe('a fight only settles as its own kind', () => {
  it('a campaign run clears the race a previous key left behind', () => {
    const team = chronicle().slice(0, 3);
    // What "Emberhold" instead of "Back to the gate" used to leave in place after a boss fight.
    beginBossFight({ bossId: 'boss.gargoyle', tierId: 'easy', team, control: 'auto' });

    const started = launchCampaignRun({ pointer: THORNWOOD_1, instanceIds: team, control: 'auto' });
    expect(started.ok).toBe(true);
    expect(bossSession.getState().bossId).toBeNull();
    expect(campaignSession.getState().requested).toBe(1);
  });

  it('a failed launch leaves no half-begun batch behind', () => {
    chronicle();
    const started = launchCampaignRun({ pointer: THORNWOOD_1, instanceIds: [], control: 'auto' });
    expect(started.ok).toBe(false);
    // An empty session asks for one run, never for the batch that failed to start.
    expect(campaignSession.getState().requested).toBe(1);
    expect(campaignSession.getState().pointer).toBeNull();
  });

  it('a race clears a campaign batch, so the boss HUD never shows a run counter', () => {
    const team = chronicle().slice(0, 3);
    beginCampaignBatch({ pointer: THORNWOOD_1, team, control: 'auto', requested: 10 });
    // The gate refuses the key at level 1 — the batch is cleared either way, before anything else.
    launchBossFight({ bossId: 'boss.gargoyle', tierId: 'easy', instanceIds: team, control: 'auto' });
    expect(campaignSession.getState().requested).toBe(1);
    expect(campaignSession.getState().pointer).toBeNull();
  });
});
