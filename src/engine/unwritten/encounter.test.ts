import { describe, expect, it } from 'vitest';
import {
  DEPTH_PER_FOLIO,
  ELITE_SCALE,
  TURN_LIMIT,
  UNWRITTEN_PARTY,
  unwrittenEnemyLevel,
  unwrittenScale,
} from '@content/balance/unwritten';
import type { FightKind } from '@content/unwritten/types';
import type { Expedition, FoeWound } from '@engine/schema/unwritten-save';
import { UNWRITTEN_WORLD } from '@state/unwritten/world';
import { depthOf, passageFight, unwrittenEncounterId, type FightInput } from './encounter';
import { begin, setup } from './expedition.test-support';
import { combineRules, expeditionRules } from './rules';

const world = UNWRITTEN_WORLD;
const folioOf = (index: number) => {
  const def = world.content.folios[index - 1];
  if (!def) throw new Error(`folio ${index}`);
  return def;
};

/** A fight input at a passage of the run's first row, as this kind of fight. */
function fightAt(
  run: Expedition,
  fight: FightKind,
  options: { folio?: number; wave?: number; wounds?: FoeWound[]; rules?: FightInput['rules'] } = {},
): FightInput {
  const passage = run.map.find((p) => p.row === 1);
  if (!passage) throw new Error('no first row');
  passage.kind = fight === 'warden' ? 'warden' : fight;
  passage.faction = fight === 'warden' ? null : 'faction.thornwood_bandits';
  const folio = folioOf(options.folio ?? 1);
  return {
    run,
    passage,
    pending: { kind: 'fight', fight, duel: false, wave: options.wave ?? 0, wounds: options.wounds ?? null },
    folio,
    rules: options.rules ?? expeditionRules({ scriptorium: [] }, run, world),
    world,
  };
}

function freshRun(omen = 0): Expedition {
  const { ctx } = setup();
  ctx.unwritten.omen.open = 15;
  return begin(ctx, ['c1', 'c2', 'c3', 'c4'], omen);
}

describe('where a passage stands (UNWRITTEN.md §6.2)', () => {
  it('counts depth across folios, the Warden one row past the last', () => {
    expect(depthOf(1, 1)).toBe(1);
    expect(depthOf(1, 9)).toBe(9);
    expect(depthOf(2, 1)).toBe(DEPTH_PER_FOLIO + 1);
    expect(depthOf(3, 9)).toBe(27);
    expect(unwrittenEncounterId('elite')).toBe('encounter.unwritten.elite');
    expect(unwrittenEncounterId('duel')).toBe('encounter.unwritten.duel');
  });
});

describe('the fight at a passage (UNWRITTEN.md §6)', () => {
  it('builds a Skirmish from its faction, its waves the folio’s, pitched by the one curve', () => {
    const run = freshRun();
    const input = fightAt(run, 'skirmish');
    const { encounter, enemyById, firstWaveHp } = passageFight(input);
    const faction = world.factionById('faction.thornwood_bandits');
    const units = new Set(faction?.units.map((u) => u.id));
    expect(encounter.kind).toBe('unwritten');
    expect(encounter.partySize).toBe(UNWRITTEN_PARTY);
    expect(encounter.difficulty).toBe('intro');
    expect(encounter.stageIndex).toBe(0);
    expect(encounter.turnLimit).toBe(TURN_LIMIT.skirmish);
    expect(encounter.timeUpIsDefeat).toBe(false);
    expect(encounter.backdrop).toBe(folioOf(1).backdrop);
    expect(encounter.enemyLevel).toBe(unwrittenEnemyLevel(0, 1));
    expect(encounter.waves.map((w) => w.enemies.length)).toEqual(folioOf(1).waves);
    for (const wave of encounter.waves)
      for (const foe of wave.enemies) {
        expect(units.has(foe.enemyId)).toBe(true);
        expect(foe.statMult).toBeCloseTo(unwrittenScale(0, 1), 9);
        expect(enemyById(foe.enemyId)).toBeDefined();
      }
    expect(firstWaveHp).toBeUndefined();
    // Drawn from the run's seed: the same passage is the same fight.
    expect(passageFight(fightAt(run, 'skirmish')).encounter).toEqual(encounter);
  });

  it('leads an Elite with the faction’s named foe, escorted, one step harder', () => {
    const run = freshRun();
    const { encounter } = passageFight(fightAt(run, 'elite'));
    const faction = world.factionById('faction.thornwood_bandits');
    const [wave] = encounter.waves;
    expect(encounter.waves).toHaveLength(1);
    expect(wave?.enemies[0]?.enemyId).toBe(faction?.boss.id);
    expect(wave?.enemies).toHaveLength(1 + folioOf(1).escort);
    expect(wave?.enemies[0]?.statMult).toBeCloseTo(unwrittenScale(0, 1) * ELITE_SCALE, 9);
    expect(encounter.turnLimit).toBe(TURN_LIMIT.elite);
  });

  it('sets each folio’s Warden against the company, with its choir, on the boss music', () => {
    const run = freshRun();
    for (const index of [1, 2, 3]) {
      const folio = folioOf(index);
      const { encounter, enemyById } = passageFight(fightAt(run, 'warden', { folio: index }));
      const warden = world.enemyById(folio.warden);
      const enemies = encounter.waves[0]?.enemies ?? [];
      expect(enemies[0]?.enemyId).toBe(folio.warden);
      expect(enemies).toHaveLength(1 + (warden?.boss?.adds?.count ?? 0));
      expect(enemies[0]?.statMult).toBeCloseTo(unwrittenScale(0, depthOf(index, 1)) * folio.wardenScale, 9);
      expect(encounter.music).toBe('boss');
      expect(enemyById(folio.warden)?.boss).toBeDefined();
    }
  });

  it('bends every foe by the rules, and only the marked foe by its passage’s affixes', () => {
    const run = freshRun();
    const plain = passageFight(fightAt(run, 'elite'));
    const input = fightAt(run, 'elite', {
      rules: combineRules([
        { rule: 'enemy_hp', value: 0.5 },
        { rule: 'enemy_atk', value: 0.2 },
        { rule: 'enemy_spd', value: 6 },
        { rule: 'elite_hp', value: 0.5 },
      ]),
    });
    input.passage.affixes = ['affix.warded'];
    const bent = passageFight(input);
    const [bossId, escortId] = (bent.encounter.waves[0]?.enemies ?? []).map((e) => e.enemyId);
    const base = (id: string | undefined) => world.enemyById(id ?? '');
    const boss = bent.enemyById(bossId ?? '');
    const escort = bent.enemyById(escortId ?? '');
    expect(boss?.stats.hp).toBe(Math.round((base(bossId)?.stats.hp ?? 0) * 2));
    expect(escort?.stats.hp).toBe(Math.round((base(escortId)?.stats.hp ?? 0) * 1.5));
    expect(escort?.stats.atk).toBe(Math.round((base(escortId)?.stats.atk ?? 0) * 1.2));
    expect(escort?.stats.spd).toBe((base(escortId)?.stats.spd ?? 0) + 6);
    expect(boss?.passives.some((p) => p.id.startsWith('affix.warded'))).toBe(true);
    expect(escort?.passives.some((p) => p.id.startsWith('affix.warded'))).toBe(false);
    // Untouched rules leave the registry's foe as it was.
    expect(plain.enemyById(bossId ?? '')?.stats).toEqual(base(bossId)?.stats);
  });

  it('carries a blot’s cruelty on every foe', () => {
    const run = freshRun();
    run.blots = ['blot.creeping_rot'];
    const { encounter, enemyById } = passageFight(fightAt(run, 'skirmish'));
    for (const foe of encounter.waves.flatMap((w) => w.enemies))
      expect(enemyById(foe.enemyId)?.passives.some((p) => p.id.startsWith('blot.creeping_rot.foe'))).toBe(
        true,
      );
  });

  it('brings the Unwriter’s last phase forward under the Blotted Heart', () => {
    const run = freshRun();
    const unwriter = folioOf(3).warden;
    const before = passageFight(fightAt(run, 'warden', { folio: 3 })).enemyById(unwriter)?.boss?.phases;
    const after = passageFight(
      fightAt(run, 'warden', {
        folio: 3,
        rules: combineRules([
          { rule: 'unwriter_last_phase', value: 0.5 },
          { rule: 'unwriter_hp', value: 0.3 },
        ]),
      }),
    ).enemyById(unwriter);
    expect(before).toEqual(world.enemyById(unwriter)?.boss?.phases);
    expect(after?.boss?.phases?.at(-1)).toBe(0.5);
    expect(after?.stats.hp).toBe(Math.round((world.enemyById(unwriter)?.stats.hp ?? 0) * 1.3));
  });

  it('rebuilds a contested passage from its wave, the survivors at their wounds (§4.2)', () => {
    const run = freshRun();
    const whole = passageFight(fightAt(run, 'skirmish')).encounter;
    const second = whole.waves[1]?.enemies ?? [];
    const wounds: FoeWound[] = [
      { enemyId: second[0]?.enemyId ?? '', hp: 0.4 },
      { enemyId: second[2]?.enemyId ?? '', hp: 1 },
    ];
    const contested = passageFight(fightAt(run, 'skirmish', { wave: 1, wounds }));
    expect(contested.encounter.waves).toHaveLength(whole.waves.length - 1);
    expect(contested.encounter.waves[0]?.enemies.map((e) => e.enemyId)).toEqual(wounds.map((w) => w.enemyId));
    expect(contested.firstWaveHp).toEqual([0.4, 1]);
  });

  it('grows harder with the Omen and the depth', () => {
    const shallow = passageFight(fightAt(freshRun(0), 'skirmish')).encounter;
    const deep = passageFight(fightAt(freshRun(10), 'skirmish', { folio: 3 })).encounter;
    const mult = (e: typeof shallow) => e.waves[0]?.enemies[0]?.statMult ?? 0;
    expect(mult(deep)).toBeGreaterThan(mult(shallow) * 10);
    expect(deep.enemyLevel).toBeGreaterThan(shallow.enemyLevel);
  });
});
