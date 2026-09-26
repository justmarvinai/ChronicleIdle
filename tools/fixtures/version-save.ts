/**
 * Writes `tests/fixtures/saves/v<SAVE_VERSION>.json`: a raw save at the version this phase ships,
 * so the *next* phase's migration has a real chronicle to upgrade rather than a hand-typed stub.
 *
 * Run it once per save-version bump. `src/state/migration-matrix.test.ts` requires one such file
 * for every version from 1 to `SAVE_VERSION`, which is what keeps the chain honest: a version that
 * never had a fixture cannot quietly go untested.
 *
 * The chronicle it writes is deliberately full — every slice carries something a migration could
 * lose — and deterministic: fixed clock, fixed seed, same bytes every run.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { format, resolveConfig } from 'prettier';
import { STAGES_PER_SETTLEMENT } from '@content/balance/campaign';
import { GEAR_SLOTS, type ChampionId, type GearSlot } from '@content/champions/types';
import { content } from '@content/registry';
import { TUTORIAL_CHAPTERS } from '@content/tutorial/index';
import { stageIdOf } from '@engine/campaign/progress';
import { createInstance, instanceIdFor, type Roster } from '@engine/champions/instance';
import { levelCap } from '@engine/champions/stats';
import { walletWith } from '@engine/economy/wallet';
import { generateGear } from '@engine/gear/generate';
import type { GearInstance } from '@engine/gear/instance';
import { flatMissions } from '@engine/missions/path';
import { createRng } from '@engine/rng/rng';
import { createNewGame } from '@engine/save/new-game';
import { SAVE_VERSION } from '@engine/schema/save';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const OUT = join(REPO_ROOT, 'tests', 'fixtures', 'saves', `v${SAVE_VERSION}.json`);
/** 2026-09-12 12:00 local, the same instant every save fixture froze. */
const NOW = new Date(2026, 8, 12, 12, 0).getTime();
const SEED = `fixture.v${SAVE_VERSION}`;
/** Settlements whose every stand is mastered on Intro. */
const MASTERED = 8;
/** Chapters of the Path whose twelve are claimed and whose chest has been taken. */
const CHAPTERS_DONE = 4;

/** The roster a chronicle this deep carries: a capped core and two it is still raising. */
const PARTY: readonly { id: ChampionId; stars: number }[] = [
  { id: 'champ.varkos_sundered_king', stars: 6 },
  { id: 'champ.aurelia_dawnwarden', stars: 5 },
  { id: 'champ.seraphine_vale', stars: 5 },
  { id: 'champ.rattledagger', stars: 4 },
  { id: 'champ.ser_corvin', stars: 3 },
  { id: 'champ.wenna_novice', stars: 2 },
];

/** Two sets, so the fixture carries a completed group and a partial one. */
const SETS = ['gear_set.ember_guard', 'gear_set.swiftfoot'] as const;

/** What a chronicle at this depth has counted. */
const COUNTERS: Readonly<Record<string, number>> = {
  'battles.fought': 310,
  'battles.victory': 284,
  'battles.defeat': 22,
  'battles.won.manual': 12,
  'battles.allyTurns': 4_100,
  'campaign.runs': 330,
  'campaign.cleared': 240,
  'campaign.stars': 240,
  'campaign.gearDrops': 140,
  'energy.spent': 6_100,
  'tavern.levelUps': 96,
  'tavern.rankUps': 14,
  'tavern.skillUpgrades': 17,
  'gear.drops': 140,
  'gear.levels': 260,
  'forge.crafts': 16,
  'forge.crafts.scrap': 10,
  'forge.crafts.ember': 6,
  'forge.dismantles': 61,
  'forge.refines': 4,
  'summon.pulls': 54,
  'summon.pulls.faded': 38,
  'summon.pulls.ancient': 15,
  'summon.pulls.sacred': 1,
  'idle.claims': 27,
  'idle.hours': 190,
  'boss.fights': 44,
  'boss.fights.boss.gargoyle': 36,
  'boss.fights.boss.gargoyle.easy': 14,
  'boss.fights.boss.gargoyle.normal': 22,
  'boss.fights.boss.titan': 8,
  'boss.fights.boss.titan.normal': 8,
  'boss.damage': 41_000_000,
  'boss.chests': 52,
  'quests.claimed': 128,
  'quests.chests': 31,
  'quests.daily.days': 12,
  'quests.daily.days5': 15,
  'missions.claimed': CHAPTERS_DONE * 12,
  'missions.chests': CHAPTERS_DONE,
  'mine.collections': 41,
  'mine.gems': 388,
  'mine.sigils': 3,
  'mine.upgrades': 4,
  'feat.solo': 2,
  'feat.last_stand': 1,
};

async function main(): Promise<void> {
  const base = createNewGame({ name: 'Marvin', now: NOW, seedRoot: SEED });
  const rng = createRng(SEED);

  const roster: Roster = {};
  const instanceIds: string[] = [];
  PARTY.forEach((member, index) => {
    const def = content.championById(member.id);
    if (!def) throw new Error(`unknown champion ${member.id}`);
    const instanceId = instanceIdFor(def.id, index + 1);
    roster[instanceId] = {
      ...createInstance(def, { instanceId, now: NOW, source: index === 4 ? 'starter' : 'summon' }),
      stars: member.stars,
      level: levelCap(member.stars),
    };
    instanceIds.push(instanceId);
  });

  // Twelve pieces: a full six on the strongest champion, six loose in the armoury.
  const inventory: Record<string, GearInstance> = {};
  const worn = instanceIds[0];
  if (!worn) throw new Error('no champion to wear the gear');
  let serial = 0;
  const rollPiece = (slot: GearSlot, equippedTo: string | null): GearInstance => {
    serial += 1;
    const piece = generateGear(
      {
        serial,
        slot,
        setId: SETS[serial % SETS.length] ?? SETS[0],
        rarity: serial % 3 === 0 ? 'legendary' : 'epic',
        stars: 5,
        source: 'campaign_drop',
        now: NOW,
        level: serial % 4 === 0 ? 16 : 8,
      },
      rng,
    );
    return { ...piece, equippedTo };
  };
  for (const slot of GEAR_SLOTS) {
    const piece = rollPiece(slot, worn);
    inventory[piece.instanceId] = piece;
    const wearer = roster[worn];
    if (wearer) wearer.gear[slot] = piece.instanceId;
  }
  for (const slot of GEAR_SLOTS) {
    const piece = rollPiece(slot, null);
    inventory[piece.instanceId] = piece;
  }

  // Intro mastered as far as the roster reaches; the settlement after it is part-cleared.
  const stars: Record<string, number> = {};
  const bestTurns: Record<string, number> = {};
  for (let settlement = 1; settlement <= MASTERED; settlement += 1)
    for (let stage = 1; stage <= STAGES_PER_SETTLEMENT; stage += 1) {
      const id = stageIdOf(settlement, stage);
      stars[`${id}|intro`] = 3;
      bestTurns[`${id}|intro`] = 4 + (stage % 3);
    }
  for (let stage = 1; stage <= 4; stage += 1)
    stars[`${stageIdOf(MASTERED + 1, stage)}|intro`] = stage === 4 ? 2 : 3;

  const claimedMissions = flatMissions(content.missionChapters)
    .filter((mission) => mission.chapter <= CHAPTERS_DONE)
    .map((mission) => mission.id);
  const dailyBoard = content.questBoard('daily');
  const weeklyBoard = content.questBoard('weekly');

  const full = {
    ...base,
    profile: { ...base.profile, level: 28, xp: 4_200, avatarChampionId: PARTY[0]?.id ?? null },
    energy: { value: 86, lastTickAt: NOW - 600_000 },
    provisionsClaimed: [
      'tutorial.awakening',
      'tutorial.the_hold',
      'tutorial.gift.ancient_shard',
      'tutorial.the_binding',
      'tutorial.routine',
      'tutorial.the_path',
    ],
    wallet: walletWith([
      { currency: 'gold', amount: 412_000 },
      { currency: 'gems', amount: 1_850 },
      { currency: 'shard_faded', amount: 14 },
      { currency: 'shard_ancient', amount: 3 },
      { currency: 'key_daily', amount: 1 },
      { currency: 'mat_glyph_sigil', amount: 2 },
    ]),
    roster,
    inventory,
    counters: { instances: PARTY.length, gear: serial },
    teams: {
      campaign: {
        presets: [instanceIds.slice(0, 4), instanceIds.slice(0, 2), []],
        lastUsed: instanceIds.slice(0, 4),
      },
      boss: { presets: [instanceIds.slice(0, 4), [], []], lastUsed: instanceIds.slice(0, 4) },
      dungeon: {
        presets: [instanceIds.slice(0, 4), instanceIds.slice(2, 6), []],
        lastUsed: instanceIds.slice(2, 6),
      },
    },
    campaign: { ...base.campaign, stars, bestTurns, autoRepeat: 3 },
    // Three keeps in three states: one past Normal and into Hard, one still climbing, one untouched.
    dungeons: {
      cleared: {
        cindervault: { normal: 20, hard: 6 },
        pale_expanse: { normal: 13, hard: 0 },
        velkoras_cradle: { normal: 2, hard: 0 },
      },
    },
    // A Bag holding three things, one of each kind that has to survive a round trip.
    bag: {
      'item.brewery_token': 3,
      'item.champion_xp_boost': 1,
      'item.champions_cheatmeal': 1,
    },
    /*
     * Two boosts live and one long lapsed. The lapsed row is the point: a fixture whose boosts are
     * all running would never catch a migration that mangled an expiry in the past.
     */
    boosts: {
      champion_xp: NOW + 20 * 3_600_000,
      brewery: NOW + 3 * 3_600_000,
      player_xp: NOW - 48 * 3_600_000,
    },
    // Mid-hour at the stall, with two slots part-bought and two bundles gone for good.
    market: {
      hour: Math.floor(NOW / 3_600_000),
      taken: { '0': 2, '3': 1 },
      bundles: ['shelf.chroniclers_satchel', 'shelf.quartermasters_crate'],
    },
    // Deep into the second round of the board, with today's tile already taken.
    login: { claimed: 41, lastKey: '2026-09-12' },
    summon: {
      ...base.summon,
      // Pulls since each rarity, per shard type — the mercy counters, not a single number.
      pity: {
        faded: { epic: 12 },
        ancient: { epic: 9, legendary: 31 },
        sacred: { legendary: 4 },
        primordial: {},
      },
      history: [
        {
          at: NOW - 3_600_000,
          shard: 'ancient' as const,
          bannerId: 'banner.standard',
          championId: PARTY[1]?.id ?? 'champ.ser_corvin',
          rarity: 'epic' as const,
          instanceId: instanceIds[1] ?? '',
          duplicate: false,
          mercy: false,
          featured: false,
        },
      ],
    },
    idle: { lastClaimAt: NOW - 7_200_000 },
    // The Mine dug to level 5, part-way through a store, with fractions carried from the last visit.
    mine: { level: 5, collectedAt: NOW - 5 * 3_600_000, carry: { gems: 0.4, sigils: 0.7 } },
    // The Hall of Deeds part-way up: tiers of three achievements, one challenge, two ranks and the
    // Bronze frame worn — every field a later migration could drop.
    deeds: {
      achievements: {
        'achievement.stand_breaker': 2,
        'achievement.victor': 2,
        'achievement.tavern_regular': 1,
      },
      challenges: ['challenge.lone_blade'],
      ranks: 2,
      frame: 'frame.bronze',
    },
    bosses: {
      'boss.gargoyle': {
        periodKey: base.periods.lastDailyKey,
        keysUsed: 2,
        damage: { 'boss.gargoyle.normal': 1_420_000 },
        claimed: ['boss.gargoyle.normal.1', 'boss.gargoyle.normal.2'],
        records: {
          'boss.gargoyle.normal': { damage: 1_420_000, at: NOW - 10_800_000, team: instanceIds.slice(0, 4) },
        },
      },
      'boss.titan': {
        periodKey: base.periods.lastWeeklyKey,
        keysUsed: 1,
        damage: { 'boss.titan.normal': 2_050_000 },
        claimed: ['boss.titan.normal.1'],
        records: {
          'boss.titan.normal': { damage: 2_050_000, at: NOW - 86_400_000, team: instanceIds.slice(0, 4) },
        },
      },
    },
    stats: { ...COUNTERS },
    quests: {
      daily: {
        ...base.quests.daily,
        baseline: { ...COUNTERS },
        claimed: dailyBoard.quests.slice(0, 3).map((quest) => quest.id),
        chests: [20],
        dayCounted: true,
      },
      weekly: {
        ...base.quests.weekly,
        baseline: { ...COUNTERS },
        claimed: weeklyBoard.quests.slice(0, 2).map((quest) => quest.id),
        chests: [],
        dayCounted: true,
      },
    },
    missions: { claimed: claimedMissions, baseline: { ...COUNTERS }, chests: [1, 2, 3, 4], gearChoice: null },
    // The whole tutorial is behind a chronicle this deep.
    tutorial: {
      completedSteps: TUTORIAL_CHAPTERS.flatMap((chapter) => chapter.steps.map((step) => step.id)),
      skippedChapters: [],
    },
    updatedAt: NOW,
  };

  // Written through Prettier so the committed fixture is already in the repo's style: `pnpm lint`
  // checks it like any other file, and re-running this tool is a no-op rather than a diff.
  const options = await resolveConfig(OUT);
  const text = await format(JSON.stringify(full), { ...options, filepath: OUT, parser: 'json' });
  await mkdir(join(OUT, '..'), { recursive: true });
  await writeFile(OUT, text);
  console.log(
    `[fixtures] wrote ${OUT} (v${SAVE_VERSION}: ${PARTY.length} champions, ${serial} gear, ${claimedMissions.length} missions)`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
