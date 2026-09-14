import { readFileSync } from 'node:fs';
import type { ReactNode, Ref } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { CHAMPION_CHOICES, SETTLEMENT_COUNT, STAGES_PER_SETTLEMENT } from '@content/balance/campaign';
import { SHARD_EXCHANGE } from '@content/balance/summon';
import { progressKey, stageIdOf } from '@engine/campaign/progress';
import { useGameStore } from '@state/store';
import { DialogHost } from '@ui/dialogs/DialogHost';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import type { RitualControl } from '@render/summon/RitualLayer';
import PortalScreen from './PortalScreen';

vi.mock('@render/ambient/AmbientLayer', () => ({ AmbientLayer: () => null }));
vi.mock('@ui/hooks/useSceneAudio', () => ({ useSceneAudio: () => undefined }));
vi.mock('@audio/index', () => ({
  playSfx: () => undefined,
  playMusic: () => undefined,
  duckMusic: () => undefined,
}));
// The ritual is a Pixi scene; in jsdom it stands in as an instant, silent one.
vi.mock('@render/summon/RitualLayer', async () => {
  const { useImperativeHandle } = await import('react');
  return {
    RitualLayer: ({ ref }: { ref?: Ref<RitualControl> }) => {
      useImperativeHandle(
        ref,
        () => ({
          reveal: () => Promise.resolve(),
          hover: () => undefined,
          skip: () => undefined,
          busy: () => false,
        }),
        [],
      );
      return null;
    },
  };
});

function stage(children: ReactNode) {
  return (
    <ViewportContext.Provider
      value={{
        scale: 1,
        windowWidth: VIRTUAL_WIDTH,
        windowHeight: VIRTUAL_HEIGHT,
        offsetX: 0,
        offsetY: 0,
        backdrop: null,
        setBackdrop: () => undefined,
      }}
    >
      {children}
    </ViewportContext.Provider>
  );
}

setManifestForTests(
  JSON.parse(readFileSync('public/assets/generated/manifest.json', 'utf8')) as AssetManifest,
);

const PORTAL = { name: 'portal' } as const;
const save = () => useGameStore.getState().save!;
const actions = () => useGameStore.getState().actions;
const held = (id: string): number => save().wallet[id as 'gold'] ?? 0;

function chronicle({ shards = 40, gold = 500_000 } = {}): void {
  const a = actions();
  a.resetGame();
  a.newGame('Caller');
  a.chooseStarter('champ.ser_corvin');
  a.grantCurrency(
    [
      { currency: 'gold', amount: gold },
      { currency: 'gems', amount: 20_000 },
      { currency: 'shard_faded', amount: shards },
      { currency: 'shard_ancient', amount: shards },
      { currency: 'shard_sacred', amount: shards },
    ],
    'test',
  );
  useGameStore.setState((state) => {
    if (state.save) state.save.profile.level = 20;
    return state;
  });
  a.setPortalSelection({ bannerId: 'banner.standard', shard: 'faded' });
}

describe('the Portal', () => {
  beforeEach(() => chronicle());

  it('shows the four shards and what the purse holds', () => {
    render(stage(<PortalScreen route={PORTAL} />));
    expect(screen.getByTestId('portal-shard-faded')).toBeInTheDocument();
    expect(screen.getByTestId('portal-shard-primordial')).toBeInTheDocument();
    expect(screen.getByTestId('portal-held-ancient')).toHaveTextContent('40');
  });

  it('spends a shard, reveals the champion and offers the way out', async () => {
    const user = userEvent.setup();
    render(stage(<PortalScreen route={PORTAL} />));
    const before = held('shard_faded');

    await user.click(screen.getByTestId('portal-summon-1'));

    const card = await screen.findByTestId('summon-card-0');
    expect(card).toBeInTheDocument();
    expect(held('shard_faded')).toBe(before - 1);
    expect(save().summon.history).toHaveLength(1);
    expect(save().summon.unseen).toHaveLength(1);
    const results = await screen.findByTestId('summon-results');
    expect(within(results).getByTestId('summon-continue')).toBeInTheDocument();

    await user.click(screen.getByTestId('summon-continue'));
    expect(screen.queryByTestId('summon-reveal')).not.toBeInTheDocument();
  });

  it('reveals ten cards and names the best of them, and skipping lands them all at once', async () => {
    const user = userEvent.setup();
    render(stage(<PortalScreen route={PORTAL} />));
    await user.click(screen.getByTestId('portal-shard-ancient'));
    await user.click(screen.getByTestId('portal-summon-10'));

    await screen.findByTestId('summon-card-0');
    await user.click(screen.getByTestId('summon-skip'));

    expect(screen.getAllByTestId(/^summon-card-/)).toHaveLength(10);
    expect(screen.getByTestId('summon-results')).toBeInTheDocument();
    expect(held('shard_ancient')).toBe(30);
    expect(save().summon.history).toHaveLength(10);
  });

  it('will not offer a ×10 the purse cannot pay for', async () => {
    chronicle({ shards: 3 });
    render(stage(<PortalScreen route={PORTAL} />));
    expect(screen.getByTestId('portal-summon-1')).toBeEnabled();
    expect(screen.getByTestId('portal-summon-10')).toBeDisabled();
  });

  it('buys shards at the Exchange', async () => {
    const user = userEvent.setup();
    render(stage(<PortalScreen route={PORTAL} />));
    const gold = held('gold');
    const shards = held('shard_faded');

    await user.click(screen.getByTestId('portal-buy-1'));

    expect(held('shard_faded')).toBe(shards + 1);
    expect(held('gold')).toBe(gold - (SHARD_EXCHANGE.faded?.amount ?? 0));
  });

  it('shows the rotation and its featured champions on the Featured tab', async () => {
    const user = userEvent.setup();
    render(stage(<PortalScreen route={PORTAL} />));
    await user.click(screen.getByTestId('portal-tab-featured'));
    const rotation = await screen.findByTestId('portal-rotation');
    expect(rotation).toBeInTheDocument();
    expect(screen.getByTestId('portal-featured-champ.aurelia_dawnwarden')).toBeInTheDocument();
  });

  it('quotes the rates and mercy of every shard', async () => {
    const user = userEvent.setup();
    render(
      stage(
        <>
          <PortalScreen route={PORTAL} />
          <DialogHost />
        </>,
      ),
    );
    await user.click(screen.getByTestId('portal-rates'));
    const dialog = await screen.findByTestId('dialog-summon-rates');
    expect(within(dialog).getByTestId('rates-faded')).toHaveTextContent('60 %');
    expect(within(dialog).getByTestId('rates-sacred')).toHaveTextContent('92 %');
    // Sacred owes a Legendary within fifteen (SUMMONING.md §2).
    expect(within(dialog).getByTestId('rates-sacred')).toHaveTextContent('15');
  });

  it('remembers the pulls in the history panel', async () => {
    const user = userEvent.setup();
    render(
      stage(
        <>
          <PortalScreen route={PORTAL} />
          <DialogHost />
        </>,
      ),
    );
    await user.click(screen.getByTestId('portal-summon-1'));
    await screen.findByTestId('summon-results');
    await user.click(screen.getByTestId('summon-continue'));

    await user.click(screen.getByTestId('portal-history'));
    const dialog = await screen.findByTestId('dialog-summon-history');
    const record = save().summon.history[0]!;
    expect(within(dialog).getByTestId(`history-${record.instanceId}`)).toBeInTheDocument();
  });

  it('claims the Intro milestone Epic through the picker', async () => {
    const user = userEvent.setup();
    act(() => {
      useGameStore.setState((state) => {
        if (!state.save) return state;
        for (let settlement = 1; settlement <= SETTLEMENT_COUNT; settlement += 1)
          for (let stage_ = 1; stage_ <= STAGES_PER_SETTLEMENT; stage_ += 1)
            state.save.campaign.stars[progressKey(stageIdOf(settlement, stage_), 'intro')] = 3;
        return state;
      });
    });
    render(
      stage(
        <>
          <PortalScreen route={PORTAL} />
          <DialogHost />
        </>,
      ),
    );

    await user.click(screen.getByTestId('portal-choice'));
    const dialog = await screen.findByTestId('dialog-champion-picker');
    await user.click(within(dialog).getByTestId('picker-champion-champ.khazgor'));
    await user.click(within(dialog).getByTestId('picker-confirm'));

    expect(Object.values(save().roster).some((copy) => copy.defId === 'champ.khazgor')).toBe(true);
    expect(save().summon.choices[CHAMPION_CHOICES[0]!.id]?.championId).toBe('champ.khazgor');
    expect(screen.queryByTestId('portal-choice')).not.toBeInTheDocument();
  });

  it('offers no picker when the campaign owes nothing', () => {
    render(stage(<PortalScreen route={PORTAL} />));
    expect(screen.queryByTestId('portal-choice')).not.toBeInTheDocument();
  });
});
