/**
 * The way there (docs/tech/UI_DESIGN.md §4): where each goal of the shared DSL is played, and which
 * places a chronicle may be sent to yet.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { PLACE_IDS } from '@content/places/types';
import { FEATURE_UNLOCK_LEVEL } from '@content/balance/unlocks';
import type { SaveGame } from '@engine/schema/save';
import { hasKey } from '@i18n/index';
import { useGameStore } from '@state/store';
import { PLACES, goalDestination, placeDestination, placeOpen } from './places';

const save = (): SaveGame => {
  const current = useGameStore.getState().save;
  if (!current) throw new Error('no chronicle');
  return current;
};

function chronicle(level: number): void {
  const actions = useGameStore.getState().actions;
  actions.resetGame();
  actions.newGame('Chronicler');
  actions.chooseStarter('champ.ser_corvin');
  useGameStore.setState((state) => {
    if (state.save) state.save.profile.level = level;
    return state;
  });
}

describe('the places', () => {
  it('names every place in words a button and a list can use', () => {
    for (const id of PLACE_IDS) {
      expect(hasKey(PLACES[id].name), `${id} name`).toBe(true);
      expect(hasKey(PLACES[id].to), `${id} to`).toBe(true);
    }
  });

  it('has a way into every place but the clock, a level and the resets', () => {
    const nowhere = PLACE_IDS.filter((id) => placeDestination(id) === null);
    expect(nowhere).toEqual(['regeneration', 'level_up', 'daily_reset', 'weekly_reset']);
    expect(placeDestination('login')?.way).toEqual({ dialog: { name: 'login' } });
    expect(placeDestination('portal')).toMatchObject({ name: 'Summoning Portal', to: 'the Portal' });
  });
});

describe('what a chronicle may walk into', () => {
  beforeEach(() => chronicle(1));

  it('opens a place at the level its feature opens at', () => {
    expect(placeOpen(save(), 'campaign')).toBe(true);
    expect(placeOpen(save(), 'gargoyle')).toBe(false);
    chronicle(FEATURE_UNLOCK_LEVEL.daily_boss);
    expect(placeOpen(save(), 'gargoyle')).toBe(true);
  });

  it('asks the two progress-gated places about progress, not level', () => {
    chronicle(60);
    // A chronicle high in level but with nothing cleared has reached neither the Tower nor the Palace.
    expect(placeOpen(save(), 'tower')).toBe(false);
    expect(placeOpen(save(), 'palace')).toBe(false);
    expect(placeOpen(save(), 'brewery')).toBe(true);
  });

  it('always lets the clock and the resets be named', () => {
    expect(placeOpen(save(), 'regeneration')).toBe(true);
    expect(placeOpen(save(), 'daily_reset')).toBe(true);
  });
});

describe('where a goal is played', () => {
  beforeEach(() => chronicle(20));

  it('sends a stand to its settlement once the settlement is reached, to the map before', () => {
    expect(
      goalDestination({ type: 'clear_stage', settlement: 1, stage: 3, difficulty: 'intro' }, save()),
    ).toEqual({
      place: 'campaign',
      name: 'Thornwood Crossing',
      to: 'Thornwood Crossing',
      way: { route: { name: 'settlement', settlement: 1 } },
    });
    expect(
      goalDestination({ type: 'settlement_stars', settlement: 4, difficulty: 'intro', stars: 30 }, save())
        ?.way,
    ).toEqual({ route: { name: 'campaign' } });
  });

  it('sends the Tavern’s three kinds of work to the Tavern tab they are done at', () => {
    expect(goalDestination({ type: 'level_champion_times', count: 3 }, save())?.way).toEqual({
      route: { name: 'tavern', tab: 'level' },
    });
    expect(goalDestination({ type: 'champion_reach_stars', stars: 4, count: 1 }, save())?.way).toEqual({
      route: { name: 'tavern', tab: 'rank' },
    });
    expect(goalDestination({ type: 'skill_upgrades', count: 1 }, save())?.way).toEqual({
      route: { name: 'tavern', tab: 'skills' },
    });
  });

  it('sends the Forge’s three benches to their own tab', () => {
    expect(goalDestination({ type: 'craft', count: 1 }, save())?.way).toEqual({
      route: { name: 'forge', tab: 'craft' },
    });
    expect(goalDestination({ type: 'dismantle', count: 1 }, save())?.way).toEqual({
      route: { name: 'forge', tab: 'dismantle' },
    });
    expect(goalDestination({ type: 'gear_refine_times', count: 1 }, save())?.way).toEqual({
      route: { name: 'forge', tab: 'refine' },
    });
  });

  it('sends a boss goal to its boss, at the tier it names', () => {
    expect(
      goalDestination({ type: 'boss_damage', boss: 'boss.gargoyle', tier: 'easy', amount: 250_000 }, save()),
    ).toEqual({
      place: 'gargoyle',
      name: 'The Gargoyle',
      to: 'the Gargoyle',
      way: { route: { name: 'bosses', boss: 'boss.gargoyle', tier: 'easy' } },
    });
    expect(goalDestination({ type: 'boss_fights', boss: 'boss.titan', count: 1 }, save())).toMatchObject({
      place: 'titan',
      way: { route: { name: 'bosses', boss: 'boss.titan' } },
    });
  });

  it('opens the Idle Chest over the screen rather than leaving it', () => {
    expect(goalDestination({ type: 'claim_idle', count: 1 }, save())?.way).toEqual({
      dialog: { name: 'idle-chest' },
    });
  });

  it('names nowhere for opening the game and for the Path’s last page', () => {
    expect(goalDestination({ type: 'login' }, save())).toBeNull();
    expect(goalDestination({ type: 'all_previous' }, save())).toBeNull();
  });

  it('reads either-or as the first of its goals that is somewhere', () => {
    const goal = { type: 'any', goals: [{ type: 'login' }, { type: 'summon', count: 1 }] } as const;
    expect(goalDestination({ type: goal.type, goals: [...goal.goals] }, save())?.place).toBe('portal');
  });
});
