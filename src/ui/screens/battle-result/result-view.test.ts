/**
 * The verdicts the result screen prints (docs/tech/UI_DESIGN.md §5.10): who carried the fight, how
 * each ally's damage stood against theirs, and the advice a lost fight earns — each line only when
 * it is true of the fight.
 */
import { describe, expect, it } from 'vitest';
import type { EncounterDef } from '@content/encounters/types';
import { content } from '@content/registry';
import type { BattleOutcome, UnitReport } from '@engine/battle/index';
import { adviceFor, damageShares, mvpOf } from './result-view';

function ally(unitId: string, damageDealt: number): UnitReport {
  return {
    unitId,
    defId: 'champ.ser_corvin',
    instanceId: `inst-${unitId}`,
    side: 'ally',
    alive: true,
    died: false,
    damageDealt,
    damageTaken: 0,
    healingDone: 0,
    kills: 0,
  };
}

function outcome(over: Partial<BattleOutcome>): BattleOutcome {
  return {
    kind: 'defeat',
    turns: 20,
    allyTurns: 10,
    wavesCleared: 1,
    waveCount: 2,
    units: [],
    enemyHpLeft: 0.5,
    seed: 'seed',
    decisions: [],
    ...over,
  };
}

const found = content.encounterById('encounter.stage.01.01.intro');
if (!found) throw new Error('no encounter');
const base: EncounterDef = found;
const mender = content.enemies.find((enemy) => enemy.archetype === 'mender');
const striker = content.enemies.find((enemy) => enemy.archetype !== 'mender');
if (!mender || !striker) throw new Error('no enemies');

/** An encounter at `enemyLevel` whose one wave holds the given enemies. */
function encounter(enemyIds: readonly string[], enemyLevel = 10): EncounterDef {
  return { ...base, enemyLevel, waves: [{ enemies: enemyIds.map((enemyId) => ({ enemyId })) }] };
}

const keys = (list: { key: string }[]) => list.map((item) => item.key);

describe('the MVP and the damage bars', () => {
  it('names the ally who dealt the most, the first of a tie, and no one when no one dealt any', () => {
    expect(mvpOf([ally('a', 300), ally('b', 900), ally('c', 400)])).toBe('b');
    expect(mvpOf([ally('a', 500), ally('b', 500)])).toBe('a');
    expect(mvpOf([ally('a', 0), ally('b', 0)])).toBeNull();
    expect(mvpOf([])).toBeNull();
  });

  it('measures each ally against the top dealer, and draws empty bars when no one dealt any', () => {
    const shares = damageShares([ally('a', 250), ally('b', 1000), ally('c', 0)]);
    expect(shares.get('b')).toBe(1);
    expect(shares.get('a')).toBe(0.25);
    expect(shares.get('c')).toBe(0);
    expect(damageShares([ally('a', 0)]).get('a')).toBe(0);
  });
});

describe('the advice after a fight', () => {
  const plain = encounter([striker.id]);

  it('gives none after a victory or a retreat', () => {
    const levels = [1, 1, 1];
    for (const kind of ['victory', 'retreat'] as const)
      expect(
        adviceFor({ outcome: outcome({ kind, turns: 90 }), encounter: plain, levels, boss: null }),
      ).toEqual([]);
  });

  it('says the team was out-sped only when the enemy took well over its turns, and points at the champions', () => {
    const outsped = adviceFor({
      outcome: outcome({ turns: 30, allyTurns: 10 }),
      encounter: plain,
      levels: [10],
      boss: null,
    });
    expect(outsped).toEqual([expect.objectContaining({ key: 'battleResult.hint.outsped', go: 'champions' })]);
    // Twice as many enemies as allies take about as many turns in all: not out-sped.
    expect(
      adviceFor({
        outcome: outcome({ turns: 24, allyTurns: 10 }),
        encounter: plain,
        levels: [10],
        boss: null,
      }),
    ).toEqual([]);
  });

  it('names a mender left standing, and not once every wave fell', () => {
    const healing = encounter([striker.id, mender.id]);
    expect(keys(adviceFor({ outcome: outcome({}), encounter: healing, levels: [10], boss: null }))).toEqual([
      'battleResult.hint.healer',
    ]);
    expect(
      keys(
        adviceFor({
          outcome: outcome({ kind: 'timeout', wavesCleared: 2, waveCount: 2 }),
          encounter: healing,
          levels: [10],
          boss: null,
        }),
      ),
    ).toEqual(['battleResult.hint.turns']);
  });

  it('sends an under-levelled team to the Tavern, and says nothing of a champion at the level', () => {
    const hard = encounter([striker.id], 30);
    expect(adviceFor({ outcome: outcome({}), encounter: hard, levels: [30, 12], boss: null })).toEqual([
      expect.objectContaining({ key: 'battleResult.hint.level', go: 'tavern' }),
    ]);
    expect(adviceFor({ outcome: outcome({}), encounter: hard, levels: [30, 31], boss: null })).toEqual([]);
    // A seat whose champion is gone from the roster reads as level 0 and is no evidence either way.
    expect(adviceFor({ outcome: outcome({}), encounter: hard, levels: [0, 30], boss: null })).toEqual([]);
  });

  it('reads a boss race as a race: the turn limit, then damage over time and curses until it falls', () => {
    const race = adviceFor({
      outcome: outcome({ kind: 'timeout', turns: 90 }),
      encounter: plain,
      levels: [1],
      boss: { percent: 40 },
    });
    expect(keys(race)).toEqual(['bosses.hint.race', 'bosses.sheet.tip.dots', 'bosses.sheet.tip.debuffs']);
    expect(race.every((item) => item.go === null)).toBe(true);
    // A boss brought down leaves nothing to fix.
    expect(
      adviceFor({
        outcome: outcome({ kind: 'victory' }),
        encounter: plain,
        levels: [1],
        boss: { percent: 100 },
      }),
    ).toEqual([]);
  });
});
