import { describe, expect, it } from 'vitest';
import {
  DUNGEON_BANDS,
  DUNGEON_DIFFICULTIES,
  DUNGEON_PARTY_SIZE,
  DUNGEON_SCALE_BASE,
  DUNGEON_SCALE_TOP,
  DUNGEON_STAGES,
  dungeonBand,
  dungeonScale,
  dungeonStarEntries,
  type DungeonDifficulty,
} from '@content/balance/dungeon';
import { content } from '@content/registry';
import { createRng } from '@engine/rng/rng';
import { dungeonEncounterId, parseDungeonEncounterId } from './encounter';
import {
  NO_DUNGEON_PROGRESS,
  deepestLabel,
  highestOpenStage,
  isHardOpen,
  isStageOpen,
  nextStage,
  recordClear,
} from './ladder';
import { dungeonGold, dungeonXp, rollDungeonRewards } from './rewards';

const SLUGS = ['cindervault', 'pale_expanse', 'velkoras_cradle', 'ashenreach'] as const;

describe('the dungeon scale curve', () => {
  it('runs from its base to its top over the twenty stages', () => {
    for (const difficulty of DUNGEON_DIFFICULTIES) {
      expect(dungeonScale(1, difficulty), difficulty).toBeCloseTo(DUNGEON_SCALE_BASE[difficulty], 5);
      expect(dungeonScale(DUNGEON_STAGES, difficulty), difficulty).toBeCloseTo(
        DUNGEON_SCALE_TOP[difficulty],
        5,
      );
    }
  });

  it('rises every stage, and clamps outside the ladder', () => {
    for (const difficulty of DUNGEON_DIFFICULTIES) {
      for (let stage = 2; stage <= DUNGEON_STAGES; stage += 1)
        expect(dungeonScale(stage, difficulty), `${difficulty} ${stage}`).toBeGreaterThan(
          dungeonScale(stage - 1, difficulty),
        );
      expect(dungeonScale(-3, difficulty)).toBe(dungeonScale(1, difficulty));
      expect(dungeonScale(999, difficulty)).toBe(dungeonScale(DUNGEON_STAGES, difficulty));
    }
  });

  it('puts Hard’s opening stage past Normal’s last', () => {
    expect(dungeonScale(1, 'hard')).toBeGreaterThan(dungeonScale(DUNGEON_STAGES, 'normal'));
  });
});

describe('the bands', () => {
  it('give every stage of every difficulty exactly one band', () => {
    for (const difficulty of DUNGEON_DIFFICULTIES)
      for (let stage = 1; stage <= DUNGEON_STAGES; stage += 1) {
        const matches = DUNGEON_BANDS.filter(
          (band) => band.difficulty === difficulty && stage >= band.from && stage <= band.to,
        );
        expect(matches, `${difficulty} ${stage}`).toHaveLength(1);
        expect(dungeonBand(stage, difficulty)).toBe(matches[0]);
      }
  });

  it('raise the price exactly where they raise the prize', () => {
    for (const difficulty of DUNGEON_DIFFICULTIES) {
      const bands = DUNGEON_BANDS.filter((band) => band.difficulty === difficulty);
      for (let i = 1; i < bands.length; i += 1) {
        const before = bands[i - 1];
        const band = bands[i];
        if (!before || !band) throw new Error('bands');
        // Energy never falls, and the best star on offer never falls either.
        expect(band.energy, `${difficulty} ${band.from}`).toBeGreaterThan(before.energy);
        const bestOf = (row: typeof band): number =>
          Math.max(...dungeonStarEntries(row).map((entry) => entry.item));
        expect(bestOf(band), `${difficulty} ${band.from}`).toBeGreaterThanOrEqual(bestOf(before));
      }
    }
  });

  it('never drops below Rare on Hard, and never above Legendary on Normal', () => {
    for (const band of DUNGEON_BANDS) {
      const rarities = Object.keys(band.rarity);
      if (band.difficulty === 'hard') {
        expect(rarities, `hard ${band.from}`).not.toContain('common');
        expect(rarities, `hard ${band.from}`).not.toContain('uncommon');
      } else {
        expect(rarities, `normal ${band.from}`).not.toContain('mythic');
      }
    }
  });

  it('reads the owner’s ladder: 1–2, 2–3, 3–4, 3–5, 4–5, 5–6, then 4–6 and 5–6', () => {
    const ranges = DUNGEON_BANDS.map((band) => {
      const stars = dungeonStarEntries(band).map((entry) => entry.item);
      return `${Math.min(...stars)}-${Math.max(...stars)}`;
    });
    expect(ranges).toEqual(['1-2', '2-3', '3-4', '3-5', '4-5', '5-6', '4-6', '5-6']);
    // And the deepest band is mostly 6★, at the 70/30 the owner named.
    const deepest = dungeonBand(DUNGEON_STAGES, 'hard');
    expect(deepest.stars).toEqual({ 5: 30, 6: 70 });
  });
});

describe('the ladder', () => {
  it('opens Normal 1 and nothing else to a chronicle that has never entered', () => {
    expect(isStageOpen(NO_DUNGEON_PROGRESS, 'normal', 1)).toBe(true);
    expect(isStageOpen(NO_DUNGEON_PROGRESS, 'normal', 2)).toBe(false);
    expect(isStageOpen(NO_DUNGEON_PROGRESS, 'hard', 1)).toBe(false);
    expect(nextStage(NO_DUNGEON_PROGRESS, 'normal')).toBe(1);
    expect(deepestLabel(NO_DUNGEON_PROGRESS)).toBeNull();
  });

  it('opens one stage at a time, and keeps a cleared stage farmable', () => {
    let progress = NO_DUNGEON_PROGRESS;
    for (let stage = 1; stage <= 5; stage += 1) {
      expect(isStageOpen(progress, 'normal', stage), `stage ${stage}`).toBe(true);
      progress = recordClear(progress, 'normal', stage).progress;
      // Every stage up to here stays open.
      for (let earlier = 1; earlier <= stage; earlier += 1)
        expect(isStageOpen(progress, 'normal', earlier)).toBe(true);
    }
    expect(highestOpenStage(progress, 'normal')).toBe(6);
    // A re-run of a cleared stage is not a first clear and moves nothing.
    const again = recordClear(progress, 'normal', 2);
    expect(again.first).toBe(false);
    expect(again.progress.normal).toBe(5);
  });

  it('opens Hard on this dungeon’s Normal twentieth, and says so once', () => {
    let progress = { normal: DUNGEON_STAGES - 1, hard: 0 };
    expect(isHardOpen(progress)).toBe(false);
    expect(highestOpenStage(progress, 'hard')).toBe(0);

    const last = recordClear(progress, 'normal', DUNGEON_STAGES);
    expect(last.openedHard).toBe(true);
    progress = last.progress;
    expect(isHardOpen(progress)).toBe(true);
    expect(isStageOpen(progress, 'hard', 1)).toBe(true);
    expect(isStageOpen(progress, 'hard', 2)).toBe(false);

    // And it never says so twice.
    expect(recordClear(progress, 'normal', DUNGEON_STAGES).openedHard).toBe(false);
  });

  it('reports the deepest stage, Hard before Normal', () => {
    expect(deepestLabel({ normal: 12, hard: 0 })).toEqual({ difficulty: 'normal', stage: 12 });
    expect(deepestLabel({ normal: 20, hard: 3 })).toEqual({ difficulty: 'hard', stage: 3 });
  });
});

describe('a dungeon encounter', () => {
  it('round-trips its id', () => {
    for (const slug of SLUGS)
      for (const difficulty of DUNGEON_DIFFICULTIES)
        for (const stage of [1, 7, DUNGEON_STAGES]) {
          const id = dungeonEncounterId(slug, difficulty, stage);
          expect(parseDungeonEncounterId(id)).toEqual({ slug, difficulty, stage });
        }
    expect(parseDungeonEncounterId('encounter.stage.01.01.intro')).toBeNull();
    expect(parseDungeonEncounterId('encounter.dungeon.cindervault.normal.21')).toBeNull();
  });

  it('fields the keeper and three of its warband, against four champions', () => {
    for (const slug of SLUGS) {
      const def = content.dungeonBySlug(slug);
      if (!def) throw new Error(slug);
      const encounter = content.dungeonEncounter(slug, 'normal', 4);
      if (!encounter) throw new Error(`${slug} encounter`);
      expect(encounter.partySize).toBe(DUNGEON_PARTY_SIZE);
      expect(encounter.waves).toHaveLength(1);
      const enemies = encounter.waves[0]?.enemies ?? [];
      expect(enemies).toHaveLength(DUNGEON_PARTY_SIZE);
      expect(enemies[0]?.enemyId).toBe(def.keeperId);
      // Intro × stage 0, so the stage's own scale is the only curve acting on it.
      expect(encounter.difficulty).toBe('intro');
      expect(encounter.stageIndex).toBe(0);
      for (const enemy of enemies) expect(enemy.statMult).toBeCloseTo(dungeonScale(4, 'normal'), 5);
    }
  });

  it('walks its guard by one every stage, so no two stages are the same fight', () => {
    const first = content.dungeonEncounter('cindervault', 'normal', 1)?.waves[0]?.enemies ?? [];
    const second = content.dungeonEncounter('cindervault', 'normal', 2)?.waves[0]?.enemies ?? [];
    expect(first.slice(1).map((e) => e.enemyId)).not.toEqual(second.slice(1).map((e) => e.enemyId));
  });

  it('has no fights at all in the sealed keep', () => {
    expect(content.dungeonEncounter('gilded_veil', 'normal', 1)).toBeUndefined();
    expect(content.dungeonBySlug('gilded_veil')?.lock).toBe('accessories');
  });
});

describe('what a run pays', () => {
  const sets = content.dungeonBySlug('cindervault')?.sets ?? [];

  it('always pays a piece, and the band’s share of a second', () => {
    for (const difficulty of DUNGEON_DIFFICULTIES)
      for (const stage of [1, 10, DUNGEON_STAGES]) {
        const band = dungeonBand(stage, difficulty);
        const RUNS = 4_000;
        let pieces = 0;
        let seconds = 0;
        for (let i = 0; i < RUNS; i += 1) {
          const haul = rollDungeonRewards(
            { sets, stage, difficulty, energySpent: band.energy },
            createRng(`pay:${difficulty}:${stage}:${i}`),
          );
          expect(haul.gear.length, `${difficulty} ${stage}`).toBeGreaterThanOrEqual(1);
          pieces += haul.gear.length;
          if (haul.gear.length > 1) seconds += 1;
        }
        expect(pieces).toBeGreaterThanOrEqual(RUNS);
        expect(Math.abs(seconds / RUNS - band.extraPiece), `${difficulty} ${stage}`).toBeLessThan(0.02);
      }
  });

  it('rolls stars and rarity from the stage’s own band, and a set from the keep', () => {
    const owned = new Set(sets);
    for (const difficulty of DUNGEON_DIFFICULTIES)
      for (const stage of [2, 12, 19]) {
        const band = dungeonBand(stage, difficulty);
        const allowedStars = new Set(dungeonStarEntries(band).map((entry) => entry.item));
        const allowedRarity = new Set(Object.keys(band.rarity));
        for (let i = 0; i < 300; i += 1) {
          const haul = rollDungeonRewards(
            { sets, stage, difficulty, energySpent: band.energy },
            createRng(`roll:${difficulty}:${stage}:${i}`),
          );
          for (const piece of haul.gear) {
            expect(owned.has(piece.setId), piece.setId).toBe(true);
            expect(allowedStars.has(piece.stars), `${piece.stars}★`).toBe(true);
            expect(allowedRarity.has(piece.rarity), piece.rarity).toBe(true);
          }
        }
      }
  });

  it('pays gold that rises with the stage and the difficulty', () => {
    expect(dungeonGold(1, 'normal')).toBeLessThan(dungeonGold(DUNGEON_STAGES, 'normal'));
    expect(dungeonGold(5, 'normal')).toBeLessThan(dungeonGold(5, 'hard'));
  });

  it('pays the campaign’s own XP per point of energy', () => {
    // A Normal dungeon run and a Normal campaign stand pay the same per energy (DUNGEONS.md §5).
    const run = dungeonXp({ difficulty: 'normal', energySpent: 10 });
    expect(run.championXp).toBe(Math.round(34 * 10 * 1.5));
    expect(run.playerXp).toBe(Math.round(12 * 10 * 1.5));
    const hard = dungeonXp({ difficulty: 'hard', energySpent: 10 });
    expect(hard.championXp).toBeGreaterThan(run.championXp);
  });

  it('pays shards rarely, and only Ancient ones on Hard', () => {
    const RUNS = 20_000;
    const count = (difficulty: DungeonDifficulty, currency: string): number => {
      let seen = 0;
      for (let i = 0; i < RUNS; i += 1) {
        const haul = rollDungeonRewards(
          { sets, stage: 10, difficulty, energySpent: 12 },
          createRng(`shard:${difficulty}:${i}`),
        );
        if (haul.currencies.some((entry) => entry.currency === currency)) seen += 1;
      }
      return seen;
    };
    expect(count('normal', 'shard_ancient')).toBe(0);
    const faded = count('normal', 'shard_faded') / RUNS;
    expect(faded).toBeGreaterThan(0.01);
    expect(faded).toBeLessThan(0.03);
    const ancient = count('hard', 'shard_ancient') / RUNS;
    expect(ancient).toBeGreaterThan(0.003);
    expect(ancient).toBeLessThan(0.012);
  });
});
