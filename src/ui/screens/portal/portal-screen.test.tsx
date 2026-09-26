import { readFileSync } from 'node:fs';
import type { ReactNode, Ref } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { CHAMPION_CHOICES, SETTLEMENT_COUNT, STAGES_PER_SETTLEMENT } from '@content/balance/campaign';
import { SHARD_EXCHANGE } from '@content/balance/summon';
import { content } from '@content/registry';
import { progressKey, stageIdOf } from '@engine/campaign/progress';
import { rotationAt } from '@engine/summon/rotation';
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
/** Lets one test ask for a gate that never answers (the real one is capped; see below). */
const gate = vi.hoisted(() => ({ silent: false }));

// The ritual is a Pixi scene; in jsdom it stands in as an instant, silent one.
vi.mock('@render/summon/RitualLayer', async () => {
  const { useImperativeHandle } = await import('react');
  return {
    RitualLayer: ({ ref }: { ref?: Ref<RitualControl> }) => {
      useImperativeHandle(
        ref,
        () => ({
          reveal: () => (gate.silent ? new Promise<void>(() => undefined) : Promise.resolve()),
          rest: () => undefined,
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
  // A new chronicle seeds itself from the clock, so anything rolled would differ run to run.
  useGameStore.setState((state) => {
    if (state.save) state.save.seedRoot = 'test-seed';
    return state;
  });
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
  beforeEach(() => {
    gate.silent = false;
    chronicle();
  });

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
    // A single card spins in, its stars pop and its rarity is stamped before the way out opens.
    const results = await screen.findByTestId('summon-results', {}, { timeout: 4_000 });
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

  it('lands the cards even when the gate never answers', async () => {
    // The shards are spent before the gate lights, so the reveal may never be hostage to the
    // renderer: a ritual that stalls (a starved machine, an icon still loading) must still pay out.
    gate.silent = true;
    vi.useFakeTimers();
    try {
      render(stage(<PortalScreen route={PORTAL} />));
      act(() => {
        fireEvent.click(screen.getByTestId('portal-summon-1'));
      });
      expect(screen.queryByTestId('summon-card-0')).toBeNull();

      // The backstop (twelve seconds), then the card's own beats: its spin, its stars, its stamp.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });

      expect(screen.getByTestId('summon-card-0')).toBeInTheDocument();
      expect(screen.getByTestId('summon-results')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('deals ten cards face down and turns them in order, the best of them last', async () => {
    vi.useFakeTimers();
    try {
      render(stage(<PortalScreen route={PORTAL} />));
      act(() => {
        fireEvent.click(screen.getByTestId('portal-shard-ancient'));
      });
      act(() => {
        fireEvent.click(screen.getByTestId('portal-summon-10'));
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      const cells = screen.getAllByTestId(/^summon-card-/);
      expect(cells).toHaveLength(10);
      expect(cells.every((cell) => cell.dataset['face'] === 'down')).toBe(true);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_200);
      });
      const faces = screen.getAllByTestId(/^summon-card-/).map((cell) => cell.dataset['face']);
      // The first have turned; the best still waits its breath.
      expect(faces[0]).toBe('up');
      expect(faces[9]).toBe('down');
      expect(screen.queryByTestId('summon-results')).toBeNull();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3_000);
      });
      const last = screen.getByTestId('summon-card-9');
      expect(last.dataset['face']).toBe('up');
      expect(within(last).getByText('Best of the ten')).toBeInTheDocument();
      expect(screen.getByTestId('summon-results')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('lands every card face up at once under reduced motion', async () => {
    document.documentElement.dataset['reducedMotion'] = 'true';
    try {
      const user = userEvent.setup();
      render(stage(<PortalScreen route={PORTAL} />));
      await user.click(screen.getByTestId('portal-shard-ancient'));
      await user.click(screen.getByTestId('portal-summon-10'));
      await screen.findByTestId('summon-results');
      const faces = screen.getAllByTestId(/^summon-card-/).map((cell) => cell.dataset['face']);
      expect(faces).toEqual(Array.from({ length: 10 }, () => 'up'));
    } finally {
      delete document.documentElement.dataset['reducedMotion'];
    }
  });

  it('names the shard in the ring and what it can answer with', async () => {
    const user = userEvent.setup();
    render(stage(<PortalScreen route={PORTAL} />));
    expect(screen.getByTestId('portal-gate-shard')).toHaveTextContent('Faded Shard');
    await user.click(screen.getByTestId('portal-shard-primordial'));
    expect(screen.getByTestId('portal-gate-shard')).toHaveTextContent('Primordial Shard');
    // Its chances and its mercy, as bars: Primordial promises a Mythic within fifty.
    expect(screen.getByTestId('portal-chance-mythic')).toHaveTextContent('5 %');
    expect(
      within(screen.getByTestId('portal-mercy')).getByText(/Mythic in at most 50 more/),
    ).toBeInTheDocument();
    // Nothing held: the presses say so rather than fail.
    expect(screen.getByTestId('portal-summon-1')).toBeDisabled();
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
    // Whoever the wheel features today — the test runs on the real clock.
    const banner = content.banners.find((def) => def.kind === 'featured');
    const today = banner ? rotationAt(banner, Date.now()) : null;
    expect(today).not.toBeNull();
    for (const id of today?.featured ?? [])
      expect(screen.getByTestId(`portal-featured-${id}`)).toBeInTheDocument();
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
    await screen.findByTestId('summon-results', {}, { timeout: 4_000 });
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
