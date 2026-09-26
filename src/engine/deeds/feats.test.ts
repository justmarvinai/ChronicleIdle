/**
 * Feats only a battle can tell (docs/design/ACHIEVEMENTS.md §7): each is read off the battle's
 * report, and each has a line it must not cross — a lone champion on Intro is every chronicle's
 * first hour, not a feat; a party of two cannot leave "one of three or more" standing.
 */
import { describe, expect, it } from 'vitest';
import type { BattleOutcome, UnitReport } from '@engine/battle/types';
import { featsOf, type FeatChampion, type FeatStand } from './feats';

/** The champions these fights field, by definition id. */
const ROSTER: Readonly<Record<string, FeatChampion>> = {
  'champ.a': { rarity: 'common', element: 'valor' },
  'champ.b': { rarity: 'uncommon', element: 'valor' },
  'champ.c': { rarity: 'common', element: 'valor' },
  'champ.d': { rarity: 'rare', element: 'faith' },
};

function ally(defId: string, patch: Partial<UnitReport> = {}): UnitReport {
  return {
    unitId: `ally-${defId}`,
    defId,
    instanceId: `${defId}-1`,
    side: 'ally',
    alive: true,
    died: false,
    damageDealt: 1000,
    damageTaken: 120,
    healingDone: 0,
    kills: 1,
    ...patch,
  };
}

const enemy: UnitReport = {
  unitId: 'enemy-1',
  defId: 'enemy.x',
  instanceId: null,
  side: 'enemy',
  alive: false,
  died: true,
  damageDealt: 120,
  damageTaken: 1000,
  healingDone: 0,
  kills: 0,
};

function fight(units: UnitReport[], patch: Partial<BattleOutcome> = {}): BattleOutcome {
  return {
    kind: 'victory',
    turns: 20,
    allyTurns: 12,
    wavesCleared: 3,
    waveCount: 3,
    units: [...units, enemy],
    enemyHpLeft: 0,
    seed: 'feats',
    decisions: [],
    ...patch,
  };
}

const stand = (difficulty: FeatStand['difficulty'], boss = false): FeatStand => ({ difficulty, boss });

const feats = (outcome: BattleOutcome, where: FeatStand | null, roster = ROSTER) =>
  featsOf({ outcome, stand: where, champion: (id) => roster[id] });

describe('featsOf', () => {
  it('reads nothing off a fight that was not won', () => {
    for (const kind of ['defeat', 'timeout', 'retreat'] as const)
      expect(feats(fight([ally('champ.a')], { kind }), stand('hard', true))).toEqual([]);
  });

  it('a lone champion counts on Normal and Hard, never on Intro or outside the campaign', () => {
    expect(feats(fight([ally('champ.d')]), stand('normal'))).toContain('feat.solo');
    expect(feats(fight([ally('champ.d')]), stand('hard'))).toContain('feat.solo');
    expect(feats(fight([ally('champ.d')]), stand('intro'))).not.toContain('feat.solo');
    expect(feats(fight([ally('champ.d')]), null)).not.toContain('feat.solo');
  });

  it('the giant-slayer is a lone champion over a settlement’s boss on Hard', () => {
    expect(feats(fight([ally('champ.d')]), stand('hard', true))).toContain('feat.giant_slayer');
    expect(feats(fight([ally('champ.d')]), stand('normal', true))).not.toContain('feat.giant_slayer');
    expect(feats(fight([ally('champ.d')]), stand('hard'))).not.toContain('feat.giant_slayer');
    expect(feats(fight([ally('champ.d'), ally('champ.a')]), stand('hard', true))).not.toContain(
      'feat.giant_slayer',
    );
  });

  it('one left standing counts only of three or more fielded', () => {
    const three = [ally('champ.a'), ally('champ.b', { alive: false }), ally('champ.d', { alive: false })];
    expect(feats(fight(three), null)).toContain('feat.last_stand');
    const two = [ally('champ.a'), ally('champ.b', { alive: false })];
    expect(feats(fight(two), null)).not.toContain('feat.last_stand');
    const both = [ally('champ.a'), ally('champ.b'), ally('champ.d', { alive: false })];
    expect(feats(fight(both), null)).not.toContain('feat.last_stand');
  });

  it('untouched needs three waves and not a point of health lost by anyone', () => {
    const clean = [ally('champ.a', { damageTaken: 0 }), ally('champ.d', { damageTaken: 0 })];
    expect(feats(fight(clean), null)).toContain('feat.untouched');
    expect(feats(fight(clean, { waveCount: 2 }), null)).not.toContain('feat.untouched');
    const grazed = [ally('champ.a', { damageTaken: 0 }), ally('champ.d', { damageTaken: 1 })];
    expect(feats(fight(grazed), null)).not.toContain('feat.untouched');
  });

  it('swift is a Normal or Hard stand of three waves in six ally turns or fewer', () => {
    const party = [ally('champ.a'), ally('champ.d')];
    expect(feats(fight(party, { allyTurns: 6 }), stand('normal'))).toContain('feat.swift');
    expect(feats(fight(party, { allyTurns: 7 }), stand('normal'))).not.toContain('feat.swift');
    expect(feats(fight(party, { allyTurns: 4 }), stand('intro'))).not.toContain('feat.swift');
    expect(feats(fight(party, { allyTurns: 4, waveCount: 2 }), stand('hard'))).not.toContain('feat.swift');
    expect(feats(fight(party, { allyTurns: 4 }), null)).not.toContain('feat.swift');
  });

  it('kindred is three or more of one element on Hard', () => {
    const valor = [ally('champ.a'), ally('champ.b'), ally('champ.c')];
    expect(feats(fight(valor), stand('hard'))).toContain('feat.kindred');
    expect(feats(fight(valor), stand('normal'))).not.toContain('feat.kindred');
    expect(feats(fight(valor.slice(0, 2)), stand('hard'))).not.toContain('feat.kindred');
    expect(feats(fight([...valor.slice(0, 2), ally('champ.d')]), stand('hard'))).not.toContain(
      'feat.kindred',
    );
  });

  it('the rabble is nobody better than Uncommon, on Hard', () => {
    const commons = [ally('champ.a'), ally('champ.b')];
    expect(feats(fight(commons), stand('hard'))).toContain('feat.rabble');
    expect(feats(fight(commons), stand('normal'))).not.toContain('feat.rabble');
    expect(feats(fight([...commons, ally('champ.d')]), stand('hard'))).not.toContain('feat.rabble');
  });

  it('a champion the content does not know vouches for neither element nor rarity', () => {
    const party = [ally('champ.a'), ally('champ.b'), ally('champ.unknown')];
    const found = feats(fight(party), stand('hard'));
    expect(found).not.toContain('feat.kindred');
    expect(found).not.toContain('feat.rabble');
  });

  it('only the champions the player fielded are the party', () => {
    // A unit the fight itself brought in on the player's side has no instance behind it.
    const summoned = ally('champ.a', { instanceId: null, alive: false });
    expect(feats(fight([ally('champ.d'), summoned]), stand('hard'))).toContain('feat.solo');
    expect(feats(fight([summoned]), stand('hard'))).toEqual([]);
  });

  it('names only counters the registry writes', () => {
    const everything = feats(
      fight([ally('champ.a', { damageTaken: 0 })], { allyTurns: 2 }),
      stand('hard', true),
      { 'champ.a': { rarity: 'common', element: 'valor' } },
    );
    expect(everything).toEqual([
      'feat.solo',
      'feat.giant_slayer',
      'feat.untouched',
      'feat.swift',
      'feat.rabble',
    ]);
  });
});
