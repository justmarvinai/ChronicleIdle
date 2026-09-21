/**
 * The tutorial in the save (docs/design/TUTORIAL.md, ROADMAP Phase 14 acceptance): the world the
 * script reads, the two things a lesson writes, and the grants it hands over exactly once.
 */
import { describe, expect, it } from 'vitest';
import { NO_PALACE } from '@engine/palace/index';
import { content } from '@content/registry';
import { STARTER_IDS, type ChampionId } from '@content/champions/types';
import { TUTORIAL_BATTLE_SEED, TUTORIAL_SUMMON_RARITY } from '@content/balance/tutorial';
import { createInstance, type Roster } from '@engine/champions/instance';
import { stepSatisfied } from '@engine/tutorial/index';
import { FixedClock } from '@engine/time/clock';
import { createBattleController } from './battle/controller';
import { createGameStore } from './store';
import {
  battleSignal,
  dialogOf,
  screenOf,
  tutorialContext,
  tutorialGrantsOwed,
  tutorialOver,
  tutorialScript,
  tutorialStep,
  type TutorialWorld,
} from './tutorial';

const T0 = new Date(2026, 8, 16, 10, 0).getTime();
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const settle = async (predicate: () => boolean, tries = 200): Promise<void> => {
  for (let index = 0; index < tries && !predicate(); index += 1) await wait(5);
};

function started() {
  const clock = new FixedClock(T0);
  const { store, events } = createGameStore({ clock });
  const seen: string[] = [];
  events.on((event) => seen.push(event.type));
  return { store, clock, seen };
}

/** The world as the store holds it right now. */
function world(store: ReturnType<typeof started>['store']): TutorialWorld {
  const state = store.getState();
  return {
    save: state.save,
    route: state.ui.stack[state.ui.stack.length - 1] ?? { name: 'title' },
    dialog: state.ui.dialog,
    battle: null,
  };
}

describe('the tutorial in the save', () => {
  it('names the router’s screens and dialogs, and only the ones the script knows', () => {
    expect(screenOf({ name: 'hub' })).toBe('hub');
    expect(screenOf({ name: 'settlement', settlement: 1 })).toBe('settlement');
    expect(screenOf({ name: 'devkit' })).toBeNull();
    expect(dialogOf({ name: 'gear-picker', instanceId: 'a', slot: 'weapon' })).toBe('gear-picker');
    expect(dialogOf({ name: 'settings' })).toBeNull();
    expect(dialogOf(null)).toBeNull();
  });

  it('opens the first lesson over the new-game dialog, before a chronicle exists', () => {
    const { store } = started();
    store.getState().actions.openDialog({ name: 'new-game' });
    const first = tutorialStep(world(store));
    expect(first?.step.id).toBe('tut.1.1');
    expect(first?.skippable).toBe(false);
    // Naming the chronicle creates the save and opens the starter screen, where the same lesson is
    // both still open — a chronicle begun over another one hears it here — and already satisfied,
    // which is what the overlay records (ADR-042).
    store.getState().actions.newGame('Marvin');
    expect(tutorialStep(world(store))?.step.id).toBe('tut.1.1');
    const held = first?.step;
    expect(held && stepSatisfied(held, tutorialContext(world(store)))).toBe(true);
    store.getState().actions.completeTutorialStep('tut.1.1');
    expect(tutorialStep(world(store))?.step.id).toBe('tut.1.2');
    expect(store.getState().save?.tutorial.completedSteps).toEqual(['tut.1.1']);
  });

  it('records a step once, and refuses one the script does not have', () => {
    const { store, seen } = started();
    const { actions } = store.getState();
    actions.newGame('Marvin');
    actions.completeTutorialStep('tut.1.1');
    actions.completeTutorialStep('tut.1.1');
    actions.completeTutorialStep('tut.9.9');
    expect(store.getState().save?.tutorial.completedSteps).toEqual(['tut.1.1']);
    expect(seen.filter((type) => type === 'tutorial.step')).toHaveLength(1);
  });

  it('skips a chapter, but never the first one', () => {
    const { store, seen } = started();
    const { actions } = store.getState();
    actions.newGame('Marvin');
    expect(actions.skipTutorialChapter('tut.awakening').ok).toBe(false);
    expect(actions.skipTutorialChapter('tut.nowhere').ok).toBe(false);
    expect(actions.skipTutorialChapter('tut.the_hold').ok).toBe(true);
    expect(actions.skipTutorialChapter('tut.the_hold').ok).toBe(true);
    expect(store.getState().save?.tutorial.skippedChapters).toEqual(['tut.the_hold']);
    expect(seen).toContain('tutorial.chapterSkipped');
  });

  it('pays a grant once, through the energy pool', () => {
    const { store } = started();
    const { actions } = store.getState();
    actions.newGame('Marvin');
    const before = store.getState().save?.energy.value ?? 0;
    expect(actions.claimGrant('tutorial.awakening', [{ currency: 'energy', amount: 500 }])).toBe(true);
    expect(actions.claimGrant('tutorial.awakening', [{ currency: 'energy', amount: 500 }])).toBe(false);
    expect(store.getState().save?.energy.value).toBe(before + 500);
    expect(store.getState().save?.provisionsClaimed).toEqual(['tutorial.awakening']);
    // A shard is a wallet row, and goes there.
    expect(
      actions.claimGrant('tutorial.gift.ancient_shard', [{ currency: 'shard_ancient', amount: 1 }]),
    ).toBe(true);
    expect(store.getState().save?.wallet.shard_ancient).toBe(1);
  });

  it('stops owing a grant once it is paid', () => {
    const { store } = started();
    const { actions } = store.getState();
    actions.newGame('Marvin');
    // Walk to the Provisions step: everything before it taught, and the hub underfoot.
    const chapter = content.tutorialChapters[0];
    for (const step of chapter?.steps.slice(0, 10) ?? []) actions.completeTutorialStep(step.id);
    actions.resetStack({ name: 'hub' });
    const owed = tutorialGrantsOwed(world(store));
    expect(owed.map((grant) => grant.id)).toEqual(['tutorial.awakening']);
    for (const grant of owed) actions.claimGrant(grant.id, grant.currencies);
    expect(tutorialGrantsOwed(world(store))).toEqual([]);
  });

  it('knows which lesson set up the scripted fight and the scripted pull', () => {
    const { store } = started();
    const { actions } = store.getState();
    actions.newGame('Marvin');
    const chapter = content.tutorialChapters[0];
    for (const step of chapter?.steps.slice(0, 4) ?? []) actions.completeTutorialStep(step.id);
    actions.resetStack({ name: 'battle-setup', encounterId: 'encounter.stage.01.01.intro' });
    expect(tutorialStep(world(store))?.step.id).toBe('tut.1.5');
    expect(tutorialScript(world(store), 'battle')).toBe(true);
    expect(tutorialScript(world(store), 'summon')).toBe(false);
  });

  it('is over once every chapter is walked or waved off', () => {
    const { store } = started();
    const { actions } = store.getState();
    actions.newGame('Marvin');
    expect(tutorialOver(store.getState().save)).toBe(false);
    for (const step of content.tutorialChapters[0]?.steps ?? []) actions.completeTutorialStep(step.id);
    for (const chapter of content.tutorialChapters.slice(1)) actions.skipTutorialChapter(chapter.id);
    expect(tutorialOver(store.getState().save)).toBe(true);
  });

  it('reads the live fight: the open turn, the wave, the abilities cast and the hand-over', async () => {
    const controller = createBattleController();
    const roster: Roster = {};
    for (const [index, id] of ['champ.ser_corvin', 'champ.bran_militia', 'champ.wenna_novice'].entries()) {
      const def = content.championById(id as never);
      if (!def) throw new Error(id);
      const instance = createInstance(def, {
        instanceId: `unit-${index}`,
        now: T0,
        source: 'starter',
      });
      roster[instance.instanceId] = instance;
    }
    expect(battleSignal(null)).toBeNull();
    expect(battleSignal(controller.store.getState())).toBeNull();
    controller.start({
      encounterId: 'encounter.stage.01.01.intro',
      instanceIds: Object.keys(roster),
      roster,
      palace: NO_PALACE,
      control: 'manual',
      speed: 4,
      seed: 'tutorial',
    });
    await settle(() => controller.store.getState().request !== null);
    const open = battleSignal(controller.store.getState());
    expect(open?.allyTurn).toBe(true);
    expect(open?.wave).toBe(1);
    expect(open?.used).toEqual([]);
    expect(open?.auto).toBe(false);
    // Spend the turn on A1: the signal sees the slot the player used.
    const request = controller.store.getState().request;
    const a1 = request?.abilities.find((ability) => ability.slot === 'a1');
    expect(a1).toBeDefined();
    controller.decide({
      unitId: request?.unitId ?? '',
      abilityId: a1?.abilityId ?? '',
      targetId: a1?.autoTarget ?? null,
    });
    await settle(() => (battleSignal(controller.store.getState())?.used.length ?? 0) > 0);
    expect(battleSignal(controller.store.getState())?.used).toContain('a1');
    // The overlay uses this as a Zustand selector, and the presented session is replaced on every
    // battle event: asking twice for an unchanged fight must give back the *same object*, or the
    // overlay re-renders per event and CLAUDE.md §5.6's "0 React commits during battle" is gone.
    const twice = battleSignal(controller.store.getState());
    expect(battleSignal(controller.store.getState())).toBe(twice);
    // Handing the fight over is what the Auto lesson waits for.
    controller.setControl('auto');
    expect(battleSignal(controller.store.getState())?.auto).toBe(true);
    await settle(() => controller.store.getState().status === 'ended');
    expect(battleSignal(controller.store.getState())?.wave).toBe(2);
    controller.end();
  });
  it("always turns up an Epic on the tutorial's own shard, and rolls freely afterwards", () => {
    const { store } = started();
    const { actions } = store.getState();
    actions.newGame('Marvin');
    actions.chooseStarter('champ.reva_ashblade');
    // Walk to the Binding's second lesson: the Portal open, the shard Eldric kept back in hand.
    // Three chapters come before it now — the Awakening, the Path and the Hold.
    for (const chapter of content.tutorialChapters.slice(0, 3))
      for (const step of chapter.steps) actions.completeTutorialStep(step.id);
    store.setState((state) => {
      if (state.save) state.save.profile.level = 4;
      return state;
    });
    actions.resetStack({ name: 'hub' });
    actions.completeTutorialStep('tut.4.1');
    actions.resetStack({ name: 'portal' });
    expect(tutorialStep(world(store))?.step.id).toBe('tut.4.2');
    expect(
      actions.claimGrant('tutorial.gift.ancient_shard', [{ currency: 'shard_ancient', amount: 1 }]),
    ).toBe(true);

    const pressed = actions.summonChampions('banner.standard', 'ancient', 1);
    expect(pressed.ok).toBe(true);
    if (!pressed.ok) return;
    expect(pressed.value.best.record.rarity).toBe(TUTORIAL_SUMMON_RARITY);
    // Mercy did not fire — the floor is the script's, not the shard's.
    expect(pressed.value.best.record.mercy).toBe(false);
    // The lesson's own completion is now in the world (a pull has happened); once the overlay has
    // recorded it, the Portal is the Portal's own business again.
    expect(tutorialScript(world(store), 'summon')).toBe(true);
    actions.completeTutorialStep('tut.4.2');
    expect(tutorialScript(world(store), 'summon')).toBe(false);
  });

  it('fights the scripted first stand the same way every time, whichever starter leads', async () => {
    for (const starter of STARTER_IDS) {
      const { store } = started();
      const { actions } = store.getState();
      actions.newGame('Marvin');
      actions.chooseStarter(starter as ChampionId);
      const roster = store.getState().save?.roster ?? {};
      // The team of TUTORIAL.md 1.5: the starter leads, Bran holds the line, Wenna heals.
      const team = Object.values(roster)
        .filter((instance) => instance.defId !== 'champ.gil_scrapper')
        .map((instance) => instance.instanceId);
      expect(team).toHaveLength(3);

      const controller = createBattleController();
      controller.start({
        encounterId: 'encounter.stage.01.01.intro',
        instanceIds: team,
        roster,
        palace: NO_PALACE,
        control: 'manual',
        speed: 4,
        seed: TUTORIAL_BATTLE_SEED,
      });
      // 1.6 — a turn of the player's own, in the first wave, with the first ability ready.
      await settle(() => controller.store.getState().request !== null);
      const first = controller.store.getState().request;
      expect(controller.store.getState().view?.wave, starter).toBe(1);
      expect(
        first?.abilities.some((ability) => ability.slot === 'a1' && ability.ready),
        starter,
      ).toBe(true);

      // 1.7 — a turn in the second wave that *offers* a second ability. Not every champion has
      // one at level 1, which is why the lesson names the slot it teaches.
      let waveTwo = null as typeof first;
      for (let turn = 0; turn < 60 && waveTwo === null; turn += 1) {
        await settle(
          () =>
            controller.store.getState().request !== null || controller.store.getState().status === 'ended',
        );
        const session = controller.store.getState();
        if (session.status === 'ended') break;
        const request = session.request;
        if (!request) break;
        const a2 = request.abilities.find((ability) => ability.slot === 'a2' && ability.ready);
        if (session.view?.wave === 2 && a2) {
          waveTwo = request;
          break;
        }
        const choice = request.abilities.find((ability) => ability.ready);
        if (!choice) break;
        controller.decide({
          unitId: request.unitId,
          abilityId: choice.abilityId,
          targetId: choice.targeting === 'none' ? null : choice.autoTarget,
        });
      }
      expect(waveTwo, starter).not.toBeNull();

      // 1.8 — and handing it over finishes the stand.
      controller.setControl('auto');
      await settle(() => controller.store.getState().status === 'ended', 600);
      expect(controller.store.getState().outcome?.kind, starter).toBe('victory');
      controller.end();
    }
  }, 30_000);
});
