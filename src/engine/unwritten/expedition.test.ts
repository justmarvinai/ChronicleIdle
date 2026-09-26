import { describe, expect, it } from 'vitest';
import {
  FIGHT_GILT,
  INTERLUDE_HEAL,
  LAST_PAGE_SHARE,
  OMEN_SEALS,
  START_GILT,
  TITHE_PER_WEEK,
} from '@content/balance/unwritten';
import type { ChampionId } from '@content/champions/types';
import { emptyUnwritten } from '@engine/schema/unwritten-save';
import {
  chooseEcho,
  chooseMystery,
  chooseOffer,
  chooseRelic,
  rerollOffer,
  usePeddler,
  useShrine,
} from './choices';
import {
  allies,
  begin,
  nextIs,
  outcome,
  report,
  setup,
  toWarden,
  winAndWrite,
} from './expedition.test-support';
import { planFight, settleFight } from './fight';
import { abandonExpedition, beginExpedition, enterPassage } from './lifecycle';
import { WARDEN_PASSAGE } from './map';

describe('beginning an expedition (UNWRITTEN.md §3–§4)', () => {
  it('takes a company of the roster at an Omen that is open', () => {
    const { ctx } = setup();
    const run = begin(ctx);
    expect(run.folio).toBe(1);
    expect(run.company.map((m) => m.id)).toEqual(['c1', 'c2', 'c3', 'c4']);
    expect(run.company.every((m) => m.hp === 1 && m.echo === null)).toBe(true);
    expect(run.gilt).toBe(START_GILT);
    expect(ctx.unwritten.records.expeditions).toBe(1);
    // One at a time, only open Omens, only the roster's own, at most the company's cap.
    expect(beginExpedition(ctx, { omen: 0, company: ['c1'], seedRoot: 'test' }).ok).toBe(false);
    const fresh = setup().ctx;
    expect(beginExpedition(fresh, { omen: 1, company: ['c1'], seedRoot: 'test' }).ok).toBe(false);
    expect(beginExpedition(fresh, { omen: 0, company: ['ghost'], seedRoot: 'test' }).ok).toBe(false);
    expect(beginExpedition(fresh, { omen: 0, company: [], seedRoot: 'test' }).ok).toBe(false);
  });

  it("carries the Omens' twists from the first step", () => {
    const deep = emptyUnwritten();
    deep.omen.open = 15;
    const { ctx } = setup(deep);
    const run = begin(ctx, ['c1', 'c2'], 9);
    // Omen 5 stains the page; Omen 9 sends the company in worn.
    expect(run.blots).toHaveLength(1);
    expect(run.company.every((m) => m.hp === 0.8)).toBe(true);
  });
});

describe('a fight at a passage (§4.2, §6)', () => {
  it('fields only standing champions, and carries their wounds in', () => {
    const { ctx } = setup();
    const run = begin(ctx);
    expect(enterPassage(ctx, nextIs(run, 'skirmish')).ok).toBe(true);
    expect(run.pending?.kind).toBe('fight');
    const wounded = run.company[1];
    if (!wounded) throw new Error('no member');
    wounded.hp = 0.4;
    const plan = planFight(ctx, ['c1', 'c2']);
    if (!plan.ok) throw new Error(plan.error.message);
    expect(plan.value.encounter.kind).toBe('unwritten');
    expect(plan.value.encounter.waves).toHaveLength(2);
    expect(plan.value.shaping.allyHp).toEqual({ c1: 1, c2: 0.4 });
    wounded.hp = 0;
    expect(planFight(ctx, ['c2']).ok).toBe(false);
    expect(planFight(ctx, ['c1', 'c3', 'c4', 'c1', 'c2']).ok).toBe(false);
  });

  it('pays a victory in gilt and an offer, and the passage is walked once the offer is taken', () => {
    const { ctx } = setup();
    const run = begin(ctx);
    const id = nextIs(run, 'skirmish');
    enterPassage(ctx, id);
    const settled = settleFight(ctx, outcome('victory', allies({ c1: 0.7, c2: 1 })));
    expect(settled.ok).toBe(true);
    const [least, most] = FIGHT_GILT.skirmish;
    expect(run.gilt - START_GILT).toBeGreaterThanOrEqual(least);
    expect(run.gilt - START_GILT).toBeLessThanOrEqual(most);
    expect(run.company.find((m) => m.id === 'c1')?.hp).toBeCloseTo(0.7);
    expect(run.pending?.kind).toBe('offer');
    const card = run.pending?.kind === 'offer' ? run.pending.cards[0] : undefined;
    const receipt = chooseOffer(ctx, 0);
    expect(receipt.ok && receipt.value.counters['unwritten.inscriptions']).toBe(1);
    expect(run.inscriptions.map((h) => h.id)).toEqual([card?.id]);
    expect(run.walked).toEqual([id]);
    expect(run.at).toBeNull();
    expect(run.pages).toBeGreaterThan(0);
  });

  it('keeps every wound on both sides when a fight is lost, and rebuilds the passage from there', () => {
    const { ctx } = setup();
    const run = begin(ctx);
    enterPassage(ctx, nextIs(run, 'skirmish'));
    const plan = planFight(ctx, ['c1', 'c2']);
    if (!plan.ok) throw new Error(plan.error.message);
    const second = plan.value.encounter.waves[1]?.enemies ?? [];
    // Lost in the second wave: its first foe is at a quarter, its second fell.
    const lost = outcome(
      'defeat',
      [
        ...allies({ c1: 0, c2: 0 }),
        report({ unitId: 'w1e0', side: 'enemy', defId: second[0]?.enemyId ?? '', hp: 250 }),
        report({ unitId: 'w1e1', side: 'enemy', defId: second[1]?.enemyId ?? '', hp: 0, alive: false }),
        report({ unitId: 'w1e2', side: 'enemy', defId: second[2]?.enemyId ?? '', hp: 1000 }),
      ],
      1,
    );
    expect(settleFight(ctx, lost).ok).toBe(true);
    expect(run.company.filter((m) => m.hp === 0).map((m) => m.id)).toEqual(['c1', 'c2']);
    expect(run.fallen).toBe(2);
    expect(run.pending).toMatchObject({ kind: 'fight', wave: 1 });
    const again = planFight(ctx, ['c3', 'c4']);
    if (!again.ok) throw new Error(again.error.message);
    // The cleared wave stays cleared; the fallen foe stays dead; the wounded one enters wounded.
    expect(again.value.encounter.waves).toHaveLength(1);
    expect(again.value.encounter.waves[0]?.enemies.map((e) => e.enemyId)).toEqual([
      second[0]?.enemyId,
      second[2]?.enemyId,
    ]);
    expect(again.value.shaping.firstWaveHp).toEqual([0.25, 1]);
  });

  it('ends the expedition when nobody is left standing — unless the Last Page is carried', () => {
    const { ctx } = setup();
    const run = begin(ctx, ['c1']);
    enterPassage(ctx, nextIs(run, 'skirmish'));
    run.relics.push('relic.the_last_page');
    settleFight(ctx, outcome('defeat', allies({ c1: 0 })));
    expect(ctx.unwritten.run).not.toBeNull();
    expect(run.company[0]?.hp).toBe(LAST_PAGE_SHARE);
    const ended = settleFight(ctx, outcome('defeat', allies({ c1: 0 })));
    expect(ended.ok && ended.value.ended?.result).toBe('defeat');
    expect(ctx.unwritten.run).toBeNull();
    expect(ctx.unwritten.tales).toHaveLength(1);
    // The chronicle stays open: a fallen company can set out again at once.
    begin(ctx, ['c2']);
    expect(ctx.unwritten.records.expeditions).toBe(2);
  });

  it('pays the Tithe for the week’s first six Wardens, then only the relics and the offer', () => {
    const unwritten = emptyUnwritten();
    unwritten.tithe = { weekKey: 'week-1', paid: TITHE_PER_WEEK - 1 };
    const { ctx } = setup(unwritten);
    const run = begin(ctx);
    toWarden(run);
    enterPassage(ctx, WARDEN_PASSAGE);
    const paid = settleFight(ctx, outcome('victory', allies({ c1: 1 })));
    expect(paid.ok && paid.value.paid.some((c) => c.currency === 'gold')).toBe(true);
    expect(ctx.unwritten.tithe.paid).toBe(TITHE_PER_WEEK);
    expect(run.pending?.kind).toBe('offer');
    expect(run.queue[0]?.kind).toBe('relic_choice');
  });

  it('turns the folio after the Warden: the company rests and the next map is drawn', () => {
    const { ctx } = setup();
    const run = begin(ctx);
    toWarden(run);
    enterPassage(ctx, WARDEN_PASSAGE);
    const before = run.map;
    // The Warden leaves every champion at half; the interlude mends a quarter on top.
    winAndWrite(ctx, ['c1', 'c2', 'c3', 'c4'], 0.5);
    expect(run.folio).toBe(2);
    expect(run.map).not.toEqual(before);
    expect(run.walked).toEqual([]);
    expect(run.company.every((m) => Math.abs(m.hp - (0.5 + INTERLUDE_HEAL)) < 1e-9)).toBe(true);
    expect(run.tale.some((e) => e.kind === 'warden')).toBe(true);
  });

  it('wins the expedition at the third Warden: the seal is paid once and the next Omen opens', () => {
    const { ctx } = setup();
    for (let round = 0; round < 2; round += 1) {
      const run = begin(ctx);
      for (let folio = 1; folio <= 3; folio += 1) {
        toWarden(run);
        enterPassage(ctx, WARDEN_PASSAGE);
        const settled = settleFight(ctx, outcome('victory', allies({ c1: 1, c2: 1, c3: 1, c4: 1 })));
        if (!settled.ok) throw new Error(settled.error.message);
        if (run.pending?.kind === 'offer') chooseOffer(ctx, null);
        const last = run.pending?.kind === 'relic_choice' ? chooseRelic(ctx, 0) : null;
        if (folio === 3) {
          const tale = last?.ok ? last.value.ended : null;
          expect(tale?.result).toBe('victory');
          const seal = last?.ok ? last.value.paid : [];
          expect(seal).toEqual(round === 0 ? OMEN_SEALS[0] : []);
          if (round === 0) expect(last?.ok && last.value.counters['feat.unwritten_unbroken']).toBe(1);
        }
      }
      expect(ctx.unwritten.run).toBeNull();
    }
    expect(ctx.unwritten.omen).toMatchObject({ open: 1, best: 0, sealed: [0] });
    expect(ctx.unwritten.records.victories).toBe(2);
    expect(ctx.unwritten.pages).toBeGreaterThan(0);
  });
});

describe('the choices a passage waits on (§7, §10, §11)', () => {
  it('rerolls an offer once per folio, and pays gilt for leaving one', () => {
    const unwritten = emptyUnwritten();
    unwritten.scriptorium = ['scriptorium.steady_hand'];
    const { ctx } = setup(unwritten);
    const run = begin(ctx);
    enterPassage(ctx, nextIs(run, 'skirmish'));
    settleFight(ctx, outcome('victory', allies({ c1: 1 })));
    const first = run.pending?.kind === 'offer' ? run.pending.cards : [];
    expect(rerollOffer(ctx).ok).toBe(true);
    const second = run.pending?.kind === 'offer' ? run.pending.cards : [];
    expect(second).not.toEqual(first);
    expect(rerollOffer(ctx).ok).toBe(false);
    const gilt = run.gilt;
    chooseOffer(ctx, null);
    expect(run.gilt).toBe(gilt + 10);
    expect(run.inscriptions).toHaveLength(0);
  });

  it('rests, rekindles, re-inks and scrapes at a shrine — one of them', () => {
    const { ctx } = setup();
    const run = begin(ctx);
    enterPassage(ctx, nextIs(run, 'shrine'));
    for (const member of run.company) member.hp = 0.3;
    expect(useShrine(ctx, { kind: 'rest' }).ok).toBe(true);
    expect(run.company.every((m) => Math.abs(m.hp - 0.7) < 1e-9)).toBe(true);
    // Only one blessing: the passage is walked.
    expect(useShrine(ctx, { kind: 'rest' }).ok).toBe(false);

    const second = setup().ctx;
    const other = begin(second);
    enterPassage(second, nextIs(other, 'shrine'));
    const fallen = other.company[0];
    if (!fallen) throw new Error('no member');
    fallen.hp = 0;
    expect(useShrine(second, { kind: 'rekindle', member: fallen.id }).ok).toBe(true);
    expect(fallen.hp).toBeCloseTo(0.4);
  });

  it('sells at the Peddler for gilt, once for the once-a-visit services', () => {
    const { ctx } = setup();
    const run = begin(ctx);
    enterPassage(ctx, nextIs(run, 'peddler'));
    const pending = run.pending;
    if (pending?.kind !== 'peddler') throw new Error('no peddler');
    expect(pending.wares.filter((w) => w.kind === 'inscription')).toHaveLength(3);
    expect(pending.wares.filter((w) => w.kind === 'relic')).toHaveLength(2);
    run.gilt = 1_000;
    const cheapest = pending.wares.reduce((a, b) => (a.price <= b.price ? a : b));
    expect(usePeddler(ctx, { kind: 'buy', ware: pending.wares.indexOf(cheapest) }).ok).toBe(true);
    expect(run.gilt).toBe(1_000 - cheapest.price);
    expect(usePeddler(ctx, { kind: 'buy', ware: pending.wares.indexOf(cheapest) }).ok).toBe(false);
    expect(usePeddler(ctx, { kind: 'restock' }).ok).toBe(true);
    expect(usePeddler(ctx, { kind: 'restock' }).ok).toBe(false);
    run.gilt = 0;
    expect(usePeddler(ctx, { kind: 'salve' })).toMatchObject({ ok: false });
    expect(usePeddler(ctx, { kind: 'leave' }).ok).toBe(true);
    expect(run.pending).toBeNull();
  });

  it('keeps a mystery’s choice behind its requirements, and turns a duel into a fight', () => {
    const { ctx } = setup();
    const run = begin(ctx);
    enterPassage(ctx, nextIs(run, 'mystery'));
    run.pending = { kind: 'mystery', id: 'mystery.hungry_library' };
    // Feeding the library needs a relic the company has not got.
    expect(chooseMystery(ctx, 0).ok).toBe(false);
    run.relics.push('relic.iron_lung');
    expect(chooseMystery(ctx, 0).ok).toBe(true);
    expect(run.relics).toHaveLength(0);
    expect(run.inscriptions).toHaveLength(2);

    const duel = setup().ctx;
    const other = begin(duel);
    enterPassage(duel, nextIs(other, 'mystery'));
    other.pending = { kind: 'mystery', id: 'mystery.unfinished_duel' };
    chooseMystery(duel, 0);
    expect(other.pending).toMatchObject({ kind: 'fight', fight: 'elite', duel: true });
    settleFight(duel, outcome('victory', allies({ c1: 1 })));
    expect(other.pending).toMatchObject({ kind: 'offer', from: 'duel' });
  });

  it('lets an Echo join at the company’s standing, or pays gilt to send them on', () => {
    const { ctx, roster } = setup();
    const run = begin(ctx);
    enterPassage(ctx, nextIs(run, 'echo'));
    const pending = run.pending;
    if (pending?.kind !== 'echo') throw new Error('no echo');
    const echo = pending.echoes[0];
    expect(echo?.level).toBe(roster['c1']?.level);
    const owned = new Set(Object.values(roster).map((c) => c.defId));
    expect(pending.echoes.every((e) => !owned.has(e.defId as ChampionId))).toBe(true);
    expect(chooseEcho(ctx, 0).ok).toBe(true);
    expect(run.company).toHaveLength(5);
    expect(run.company[4]).toMatchObject({ id: 'echo.1', echo });
  });

  it('abandons an expedition as a loss, bringing its pages home', () => {
    const { ctx } = setup();
    const run = begin(ctx);
    run.pages = 20;
    const ended = abandonExpedition(ctx);
    expect(ended.ok && ended.value.ended?.result).toBe('abandoned');
    expect(ctx.unwritten.pages).toBe(20);
    expect(ctx.unwritten.run).toBeNull();
  });
});
