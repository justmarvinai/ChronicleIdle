/**
 * Writes `tests/fixtures/saves/path.chronicle`: a chronicle that has walked the Chronicler's Path
 * as far as chapter 7 — the first six chapters claimed, their chests taken, and the first mission
 * of Normal open (ROADMAP Phase 13 acceptance: "a fixture save that has completed chapters 1–6
 * loads and continues").
 *
 * That means a chronicle that has actually done those things: Intro mastered (every stand of all
 * twelve settlements at three stars), a party at 6★, the counters the chapters counted, and both
 * boss gates played. Deterministic: fixed clock, fixed seed.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { STAGES_PER_SETTLEMENT, SETTLEMENT_COUNT } from '@content/balance/campaign';
import { content } from '@content/registry';
import type { ChampionId } from '@content/champions/types';
import { levelCap } from '@engine/champions/stats';
import { createInstance, instanceIdFor, type Roster } from '@engine/champions/instance';
import { walletWith } from '@engine/economy/wallet';
import { flatMissions } from '@engine/missions/path';
import { stageIdOf } from '@engine/campaign/progress';
import { createNewGame } from '@engine/save/new-game';
import { encodeChronicleFile } from '@state/chronicle-file';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const OUT = join(REPO_ROOT, 'tests', 'fixtures', 'saves', 'path.chronicle');
/** 2026-09-12 12:00 local, the same instant every save fixture froze. */
const NOW = new Date(2026, 8, 12, 12, 0).getTime();
const SEED = 'fixture.path';
/** Chapters whose twelve are claimed and whose chest has been taken. */
const CHAPTERS_DONE = 6;

/** The party that got there: four champions at their cap, the shape chapter 6 asks for. */
const PARTY: readonly { id: ChampionId; stars: number }[] = [
  { id: 'champ.varkos_sundered_king', stars: 6 },
  { id: 'champ.aurelia_dawnwarden', stars: 6 },
  { id: 'champ.seraphine_vale', stars: 6 },
  { id: 'champ.rattledagger', stars: 6 },
];

/** What the first six chapters counted between them, as a chronicle that did them would carry. */
const COUNTERS: Readonly<Record<string, number>> = {
  'battles.fought': 480,
  'battles.victory': 441,
  'battles.defeat': 32,
  'battles.won.manual': 18,
  'battles.allyTurns': 6_200,
  'campaign.runs': 520,
  'campaign.cleared': 360,
  'campaign.stars': 360,
  'campaign.gearDrops': 210,
  'energy.spent': 9_400,
  'tavern.levelUps': 140,
  'tavern.rankUps': 21,
  'tavern.skillUpgrades': 26,
  'gear.drops': 210,
  'gear.levels': 430,
  'forge.crafts': 24,
  'forge.crafts.scrap': 15,
  'forge.crafts.ember': 9,
  'forge.dismantles': 96,
  'forge.refines': 7,
  'summon.pulls': 88,
  'summon.pulls.faded': 61,
  'summon.pulls.ancient': 24,
  'summon.pulls.sacred': 3,
  'idle.claims': 41,
  'idle.hours': 300,
  'boss.fights': 78,
  'boss.fights.boss.gargoyle': 62,
  'boss.fights.boss.gargoyle.easy': 22,
  'boss.fights.boss.gargoyle.normal': 28,
  'boss.fights.boss.gargoyle.hard': 12,
  'boss.fights.boss.titan': 16,
  'boss.fights.boss.titan.normal': 16,
  'boss.damage': 92_000_000,
  'boss.chests': 96,
  'quests.claimed': 210,
  'quests.chests': 54,
  'quests.daily.days': 19,
  'quests.daily.days5': 24,
  'missions.claimed': CHAPTERS_DONE * 12,
  'missions.chests': CHAPTERS_DONE,
};

async function main(): Promise<void> {
  const base = createNewGame({ name: 'Marvin', now: NOW, seedRoot: SEED });
  const roster: Roster = {};
  const instanceIds: string[] = [];
  PARTY.forEach((member, index) => {
    const def = content.championById(member.id);
    if (!def) throw new Error(`unknown champion ${member.id}`);
    const instanceId = instanceIdFor(def.id, index + 1);
    roster[instanceId] = {
      ...createInstance(def, { instanceId, now: NOW, source: 'summon' }),
      stars: member.stars,
      level: levelCap(member.stars),
    };
    instanceIds.push(instanceId);
  });

  // Intro mastered: every stand of every settlement at three stars, which is what chapter 6 ended on.
  const stars: Record<string, number> = {};
  for (let settlement = 1; settlement <= SETTLEMENT_COUNT; settlement += 1)
    for (let stage = 1; stage <= STAGES_PER_SETTLEMENT; stage += 1)
      stars[`${stageIdOf(settlement, stage)}|intro`] = 3;

  const claimed = flatMissions(content.missionChapters)
    .filter((mission) => mission.chapter <= CHAPTERS_DONE)
    .map((mission) => mission.id);

  const full = {
    ...base,
    roster,
    counters: { ...base.counters, instances: PARTY.length },
    profile: { ...base.profile, avatarChampionId: PARTY[0]?.id ?? null, level: 35 },
    campaign: { ...base.campaign, stars },
    teams: { ...base.teams, boss: { presets: [instanceIds, [], []], lastUsed: instanceIds } },
    stats: { ...COUNTERS },
    // Everything a chronicle six chapters deep would be carrying. It used to hold gold, gems and
    // three sigils and nothing else, which left the Forge unable to strike and the Tavern unable to
    // pour — a fixture that could not do the things the chronicle it describes had plainly done.
    wallet: walletWith([
      { currency: 'gold', amount: 800_000 },
      { currency: 'gems', amount: 2_400 },
      { currency: 'key_daily', amount: 2 },
      { currency: 'key_weekly', amount: 2 },
      { currency: 'shard_faded', amount: 24 },
      { currency: 'shard_ancient', amount: 6 },
      { currency: 'shard_sacred', amount: 1 },
      { currency: 'brew_justice', amount: 40 },
      { currency: 'brew_valor', amount: 40 },
      { currency: 'brew_faith', amount: 40 },
      { currency: 'brew_eclipse', amount: 40 },
      { currency: 'brew_universal', amount: 25 },
      { currency: 'tome_rare', amount: 12 },
      { currency: 'tome_epic', amount: 6 },
      { currency: 'tome_legendary', amount: 2 },
      { currency: 'mat_scrap_iron', amount: 900 },
      { currency: 'mat_ember_alloy', amount: 400 },
      { currency: 'mat_starsteel', amount: 60 },
      { currency: 'mat_arcane_dust', amount: 700 },
      { currency: 'mat_refining_core', amount: 30 },
      { currency: 'mat_glyph_sigil', amount: 3 },
    ]),
    missions: {
      claimed,
      // Chapter 7's first mission opened on these counters, so its own goal starts at zero.
      baseline: { ...COUNTERS },
      chests: Array.from({ length: CHAPTERS_DONE }, (_, index) => index + 1),
      gearChoice: null,
    },
  };
  const text = await encodeChronicleFile(full, '0.0.13', NOW);
  await mkdir(join(OUT, '..'), { recursive: true });
  await writeFile(OUT, `${text}\n`);
  console.log(`[fixtures] wrote ${OUT} (${claimed.length} missions claimed, ${CHAPTERS_DONE} chests)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
