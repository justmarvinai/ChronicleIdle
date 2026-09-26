/**
 * The Unwritten's screen (docs/tech/UI_DESIGN.md §5.32): the gate, the threshold, the map and the
 * leaf a passage lays over it, the codex, the Scriptorium and the Records — the flows a player's
 * hands take. The expedition's rules are the engine's (`engine/unwritten/*.test.ts`) and the seams
 * with the save the store's (`state/unwritten/commands.test.ts`).
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { FEATURE_UNLOCK_LEVEL } from '@content/balance/unlocks';
import { START_GILT } from '@content/balance/unwritten';
import { content } from '@content/registry';
import type { ChampionId } from '@content/champions/types';
import { createInstance } from '@engine/champions/instance';
import { allies, outcome } from '@engine/unwritten/expedition.test-support';
import { useGameStore } from '@state/store';
import { clearAftermath } from '@state/unwritten/aftermath';
import { unwrittenCommands } from '@state/unwritten/commands';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import UnwrittenScreen from './UnwrittenScreen';

vi.mock('@render/ambient/AmbientLayer', () => ({ AmbientLayer: () => null }));
vi.mock('@ui/hooks/useSceneAudio', () => ({ useSceneAudio: () => undefined }));
vi.mock('@audio/index', () => ({ playSfx: () => undefined, playMusic: () => undefined }));

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

const ROUTE = { name: 'unwritten' } as const;
const COMPANY = ['u1', 'u2', 'u3', 'u4'];
const CHAMPIONS: ChampionId[] = [
  'champ.ser_corvin',
  'champ.bran_militia',
  'champ.wenna_novice',
  'champ.sister_maelis',
];
const save = () => useGameStore.getState().save!;

function chronicle({ level = FEATURE_UNLOCK_LEVEL.unwritten, pages = 0 } = {}): void {
  const actions = useGameStore.getState().actions;
  actions.resetGame();
  actions.newGame('Chronicler');
  actions.chooseStarter('champ.ser_corvin');
  clearAftermath();
  useGameStore.setState((state) => {
    if (!state.save) return state;
    state.save.seedRoot = 'test-seed';
    state.save.profile.level = level;
    state.save.unwritten.pages = pages;
    CHAMPIONS.forEach((id, i) => {
      const def = content.championById(id);
      if (!def || !state.save) return;
      const instance = createInstance(def, { instanceId: COMPANY[i] ?? id, now: 0, source: 'summon' });
      state.save.roster[instance.instanceId] = { ...instance, level: 30, stars: 4 };
    });
    return state;
  });
}

/** The first row's passages, where every folio begins. */
const firstRow = () => save().unwritten.run!.map.filter((p) => p.row === 1);

describe('the Unwritten', () => {
  beforeEach(() => chronicle());

  it('says when it opens, below its level', () => {
    chronicle({ level: FEATURE_UNLOCK_LEVEL.unwritten - 1 });
    render(stage(<UnwrittenScreen route={ROUTE} />));
    expect(screen.getByTestId('unwritten-locked')).toHaveTextContent(
      `The Unwritten opens at chronicle level ${FEATURE_UNLOCK_LEVEL.unwritten}.`,
    );
    expect(screen.queryByTestId('unwritten-threshold')).toBeNull();
  });

  it('reads an Omen, chooses a company in order and sets out', async () => {
    const user = userEvent.setup();
    render(stage(<UnwrittenScreen route={ROUTE} />));
    expect(screen.getByTestId('unwritten-omen-0')).toBeEnabled();
    expect(screen.getByTestId('unwritten-omen-1')).toBeDisabled();
    expect(screen.getByTestId('unwritten-omen-reading')).toHaveTextContent('Omen 0 · The First Page');
    expect(screen.getByTestId('unwritten-begin')).toBeDisabled();

    await user.click(screen.getByTestId('unwritten-pick-u3'));
    await user.click(screen.getByTestId('unwritten-pick-u1'));
    expect(screen.getByTestId('unwritten-company-count')).toHaveTextContent('2 of 6 chosen');
    await user.click(screen.getByTestId('unwritten-begin'));

    expect(save().unwritten.run?.company.map((m) => m.id)).toEqual(['u3', 'u1']);
    expect(screen.getByTestId('unwritten-map')).toBeInTheDocument();
    expect(screen.getByTestId('unwritten-where')).toHaveTextContent('Folio I');
    expect(screen.getByTestId('unwritten-gilt')).toHaveTextContent(String(START_GILT));
    expect(within(screen.getByTestId('unwritten-company')).getByText('2 of 2 standing')).toBeInTheDocument();
  });

  it('enters a passage from the map and musters the company for its fight', async () => {
    unwrittenCommands.begin(0, COMPANY);
    const user = userEvent.setup();
    render(stage(<UnwrittenScreen route={ROUTE} />));
    const skirmish = firstRow().find((p) => p.kind === 'skirmish')!;
    const node = screen.getByTestId(`unwritten-passage-${skirmish.id}`);
    expect(node).toHaveAttribute('data-state', 'open');
    await user.click(node);
    expect(screen.getByTestId('unwritten-preview')).toHaveTextContent('Skirmish');
    await user.click(screen.getByTestId('unwritten-enter'));

    const leaf = screen.getByTestId('unwritten-panel-fight');
    expect(within(leaf).getByTestId('unwritten-foes').children.length).toBeGreaterThan(0);
    // The healthiest four go in by default; a press on the column holds one back.
    expect(screen.getByTestId('unwritten-fielded-count')).toHaveTextContent('4/4');
    await user.click(screen.getByTestId('unwritten-member-card-u2'));
    expect(screen.getByTestId('unwritten-fielded-count')).toHaveTextContent('3/4');
  });

  it('writes an inscription from a victory’s offer into the codex', async () => {
    unwrittenCommands.begin(0, COMPANY);
    const skirmish = firstRow().find((p) => p.kind === 'skirmish')!;
    unwrittenCommands.enter(skirmish.id);
    unwrittenCommands.settle(outcome('victory', allies({ u1: 1, u2: 0.5, u3: 1, u4: 1 }), 2));
    const user = userEvent.setup();
    render(stage(<UnwrittenScreen route={ROUTE} />));

    const leaf = screen.getByTestId('unwritten-panel-offer');
    expect(within(leaf).getByTestId('unwritten-spoils')).toHaveTextContent('Pages');
    expect(within(leaf).getByTestId('unwritten-skip')).toHaveTextContent('Leave them unwritten (+10 gilt)');
    const card = save().unwritten.run!.pending!;
    if (card.kind !== 'offer') throw new Error('no offer');
    const written = card.cards[0]!.id;
    await user.click(screen.getByTestId('unwritten-offer-0'));

    expect(screen.queryByTestId('unwritten-panel-offer')).toBeNull();
    expect(screen.getByTestId(`unwritten-held-${written}`)).toBeInTheDocument();
    expect(save().unwritten.run!.inscriptions.map((h) => h.id)).toEqual([written]);
  });

  it('asks before abandoning, then tells the Tale and keeps it in the Records', async () => {
    unwrittenCommands.begin(0, COMPANY);
    const user = userEvent.setup();
    render(stage(<UnwrittenScreen route={ROUTE} />));
    await user.click(screen.getByTestId('unwritten-abandon'));
    await user.click(screen.getByTestId('unwritten-abandon-cancel'));
    expect(save().unwritten.run).not.toBeNull();

    await user.click(screen.getByTestId('unwritten-abandon'));
    await user.click(screen.getByTestId('unwritten-abandon-confirm'));
    expect(save().unwritten.run).toBeNull();
    const tale = screen.getByTestId('unwritten-ending-tale');
    expect(tale).toHaveAttribute('data-result', 'abandoned');
    expect(tale).toHaveTextContent('The Company Turned Back');

    await user.click(screen.getByTestId('unwritten-ending-close'));
    expect(screen.queryByTestId('unwritten-ending')).toBeNull();
    expect(screen.getByTestId('unwritten-threshold')).toBeInTheDocument();

    await user.click(screen.getByTestId('unwritten-tab-records'));
    expect(screen.getByTestId('unwritten-tale-0')).toHaveTextContent('Turned back');
    expect(screen.getByTestId('unwritten-tale')).toHaveAttribute('data-result', 'abandoned');
  });

  it('writes a folio of the Scriptorium, and keeps its candles out during an expedition', async () => {
    chronicle({ pages: 200 });
    const user = userEvent.setup();
    const { unmount } = render(stage(<UnwrittenScreen route={{ name: 'unwritten', tab: 'scriptorium' }} />));
    expect(screen.getByTestId('unwritten-pages')).toHaveTextContent('200');
    expect(screen.getByTestId('unwritten-shelf-2')).toHaveTextContent(
      'Opens once 2 folios of Shelf I are written',
    );
    await user.click(screen.getByTestId('unwritten-write-scriptorium.deeper_purse'));
    expect(screen.getByTestId('unwritten-folio-scriptorium.deeper_purse')).toHaveAttribute(
      'data-state',
      'written',
    );
    expect(screen.getByTestId('unwritten-pages')).toHaveTextContent('120');
    unmount();

    act(() => {
      unwrittenCommands.begin(0, COMPANY);
    });
    render(stage(<UnwrittenScreen route={{ name: 'unwritten', tab: 'scriptorium' }} />));
    expect(screen.getByText(/The candles are out/)).toBeInTheDocument();
    expect(screen.getByTestId('unwritten-write-scriptorium.field_dressing')).toBeDisabled();
  });
});
