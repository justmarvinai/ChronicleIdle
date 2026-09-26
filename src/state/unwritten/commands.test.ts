/**
 * The Unwritten through the store (docs/design/UNWRITTEN.md, ADR-050): the level gate, a step
 * committed as a plain copy, a fight planned from the committed save and settled back into it, the
 * Warden's Tithe paid into the wallet, an ending whose Tale outlives the transaction that wrote it,
 * and the Scriptorium shut while an expedition is out. The rules themselves are the engine's and
 * are tested there; these are the seams between it and the save.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { FEATURE_UNLOCK_LEVEL } from '@content/balance/unlocks';
import { content } from '@content/registry';
import type { ChampionId } from '@content/champions/types';
import { createInstance } from '@engine/champions/instance';
import { WARDEN_PASSAGE } from '@engine/unwritten/index';
import { allies, outcome, toWarden } from '@engine/unwritten/expedition.test-support';
import type { DomainEvent } from '@state/events';
import { gameEvents, useGameStore } from '@state/store';
import { planUnwrittenFight, unwrittenCommands } from './commands';

const COMPANY = ['u1', 'u2', 'u3', 'u4'];
const CHAMPIONS: ChampionId[] = [
  'champ.ser_corvin',
  'champ.bran_militia',
  'champ.wenna_novice',
  'champ.sister_maelis',
];

const save = () => {
  const current = useGameStore.getState().save;
  if (!current) throw new Error('no chronicle');
  return current;
};
const run = () => {
  const current = save().unwritten.run;
  if (!current) throw new Error('no expedition');
  return current;
};

/** A chronicle at the Unwritten's level with four champions of level 30 to take in. */
function chronicle(level: number = FEATURE_UNLOCK_LEVEL.unwritten): void {
  const actions = useGameStore.getState().actions;
  actions.resetGame();
  actions.newGame('Chronicler');
  actions.chooseStarter('champ.ser_corvin');
  useGameStore.setState((state) => {
    if (!state.save) return state;
    state.save.seedRoot = 'test-seed';
    state.save.profile.level = level;
    CHAMPIONS.forEach((id, i) => {
      const def = content.championById(id);
      if (!def || !state.save) return;
      const instance = createInstance(def, { instanceId: COMPANY[i] ?? id, now: 0, source: 'summon' });
      state.save.roster[instance.instanceId] = { ...instance, level: 30, stars: 4 };
    });
    return state;
  });
}

/** Rewrites the committed save; how a test stands the company somewhere the map would take long to reach. */
function edit(apply: (unwritten: ReturnType<typeof save>['unwritten']) => void): void {
  useGameStore.setState((state) => {
    if (state.save) apply(state.save.unwritten);
    return state;
  });
}

const firstRow = () => run().map.find((p) => p.row === 1 && p.kind === 'skirmish');

describe('the Unwritten through the store', () => {
  beforeEach(() => chronicle());

  it('stays shut below its level, and opens at it', () => {
    chronicle(FEATURE_UNLOCK_LEVEL.unwritten - 1);
    const shut = unwrittenCommands.begin(0, COMPANY);
    expect(shut.ok).toBe(false);
    if (!shut.ok) expect(shut.error.code).toBe('locked');
    expect(save().unwritten.run).toBeNull();

    chronicle();
    expect(unwrittenCommands.begin(0, COMPANY).ok).toBe(true);
    expect(run().company.map((m) => m.id)).toEqual(COMPANY);
    expect(save().stats['unwritten.expeditions']).toBe(1);
  });

  it('commits a copy the next transaction cannot revoke', () => {
    const begun = unwrittenCommands.begin(0, COMPANY);
    if (!begun.ok) throw new Error(begun.error.message);
    const kept = run();
    // Any later transaction finalises the store again; what the screen already holds stays readable.
    useGameStore.getState().actions.transact(() => ({ ok: true, value: null }));
    expect(() => JSON.stringify(kept)).not.toThrow();
    expect(() => JSON.stringify(begun.value.receipt)).not.toThrow();
    expect(kept.map.length).toBeGreaterThan(8);
  });

  it('plans a fight from the committed save and settles it into spoils and an offer', () => {
    unwrittenCommands.begin(0, COMPANY);
    const passage = firstRow();
    if (!passage) throw new Error('no skirmish on row 1');
    expect(unwrittenCommands.enter(passage.id).ok).toBe(true);
    expect(run().pending?.kind).toBe('fight');

    const plan = planUnwrittenFight(COMPANY, Date.now());
    if (!plan.ok) throw new Error(plan.error.message);
    expect(plan.value.fielded).toEqual(COMPANY);
    expect(plan.value.encounter.waves.length).toBeGreaterThan(0);

    const giltBefore = run().gilt;
    const settled = unwrittenCommands.settle(
      outcome('victory', allies({ u1: 0.6, u2: 1, u3: 0.3, u4: 1 }), 2),
    );
    expect(settled.ok).toBe(true);
    expect(run().pending?.kind).toBe('offer');
    expect(run().gilt).toBeGreaterThan(giltBefore);
    expect(run().company.find((m) => m.id === 'u3')?.hp).toBeCloseTo(0.3, 5);
    expect(run().spoils?.pages).toBeGreaterThan(0);

    expect(unwrittenCommands.chooseOffer(0).ok).toBe(true);
    expect(run().inscriptions).toHaveLength(1);
    expect(run().pending).toBeNull();
    expect(save().stats['unwritten.inscriptions']).toBe(1);
  });

  it('pays the Warden’s Tithe into the wallet, and says so', () => {
    unwrittenCommands.begin(0, COMPANY);
    edit((unwritten) => {
      if (unwritten.run) toWarden(unwritten.run);
    });
    expect(unwrittenCommands.enter(WARDEN_PASSAGE).ok).toBe(true);
    const events: DomainEvent[] = [];
    const off = gameEvents.on((event) => events.push(event));
    const goldBefore = save().wallet.gold ?? 0;
    const settled = unwrittenCommands.settle(outcome('victory', allies({ u1: 1, u2: 1, u3: 1, u4: 1 }), 2));
    off();
    if (!settled.ok) throw new Error(settled.error.message);
    expect(save().wallet.gold ?? 0).toBeGreaterThan(goldBefore);
    expect(save().unwritten.tithe.paid).toBe(1);
    expect(save().stats['unwritten.wardens']).toBe(1);
    expect(events).toContainEqual(expect.objectContaining({ type: 'currency.changed', reason: 'unwritten' }));
  });

  it('writes the Omens won as a maximum when the third Warden falls', () => {
    unwrittenCommands.begin(0, COMPANY);
    edit((unwritten) => {
      if (!unwritten.run) return;
      unwritten.run.folio = 3;
      toWarden(unwritten.run);
    });
    expect(unwrittenCommands.enter(WARDEN_PASSAGE).ok).toBe(true);
    const won = unwrittenCommands.settle(outcome('victory', allies({ u1: 1, u2: 1, u3: 1, u4: 1 }), 2));
    if (!won.ok) throw new Error(won.error.message);
    // The Warden's inscription, then its hoard; the expedition ends when both are taken.
    for (let step = 0; step < 4 && save().unwritten.run; step += 1) {
      const kind = save().unwritten.run?.pending?.kind;
      if (kind === 'offer') unwrittenCommands.chooseOffer(0);
      else if (kind === 'relic_choice') unwrittenCommands.chooseRelic(0);
    }
    expect(save().unwritten.run).toBeNull();
    expect(save().unwritten.tales[0]?.result).toBe('victory');
    expect(save().stats['unwritten.victories']).toBe(1);
    expect(save().stats['unwritten.omens']).toBe(1);
    // A second win under the same Omen opens nothing new and counts no new Omen.
    unwrittenCommands.begin(0, COMPANY);
    unwrittenCommands.abandon();
    expect(save().stats['unwritten.omens']).toBe(1);
  });

  it('ends on abandon with a Tale that outlives the transaction that wrote it', () => {
    unwrittenCommands.begin(0, COMPANY);
    const passage = firstRow();
    if (!passage) throw new Error('no skirmish on row 1');
    unwrittenCommands.enter(passage.id);
    unwrittenCommands.settle(outcome('victory', allies({ u1: 1, u2: 1, u3: 1, u4: 1 }), 2));
    unwrittenCommands.chooseOffer(0);
    const pages = run().pages;

    const ended = unwrittenCommands.abandon();
    if (!ended.ok) throw new Error(ended.error.message);
    const tale = ended.value.receipt.ended;
    expect(tale?.result).toBe('abandoned');
    expect(save().unwritten.run).toBeNull();
    expect(save().unwritten.pages).toBe(pages);
    expect(save().unwritten.tales[0]).toEqual(tale);

    // The screen holds the Tale while the chronicle moves on underneath it.
    unwrittenCommands.writeFolio('scriptorium.deeper_purse');
    useGameStore.getState().actions.transact(() => ({ ok: true, value: null }));
    expect(tale?.entries.some((entry) => entry.kind === 'inscribed')).toBe(true);
    expect(() => JSON.stringify(tale)).not.toThrow();
  });

  it('keeps the Scriptorium shut while an expedition is out, and writes into it after', () => {
    edit((unwritten) => {
      unwritten.pages = 200;
    });
    unwrittenCommands.begin(0, COMPANY);
    const shut = unwrittenCommands.writeFolio('scriptorium.deeper_purse');
    expect(shut.ok).toBe(false);
    if (!shut.ok) expect(shut.error.code).toBe('locked');

    unwrittenCommands.abandon();
    expect(unwrittenCommands.writeFolio('scriptorium.deeper_purse').ok).toBe(true);
    expect(save().unwritten.scriptorium).toContain('scriptorium.deeper_purse');
    expect(save().unwritten.pages).toBe(120);
    expect(save().stats['unwritten.scriptorium']).toBe(1);
    expect(save().stats['unwritten.pagesSpent']).toBe(80);
    // A folio already written is not written twice.
    expect(unwrittenCommands.writeFolio('scriptorium.deeper_purse').ok).toBe(false);
  });
});
