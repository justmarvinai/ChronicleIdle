/**
 * Writes the chronicle `tests/e2e/instant.spec.ts` plays (docs/design/CAMPAIGN.md §10):
 * `instant.chronicle` — level 12, every lesson walked but the instant clear's, Thornwood's first
 * three stands at three stars and the fourth at two, the repeat set to ten and energy for more
 * than two batches of it. So one sitting sees the marks on the stand list, hears the lesson on a
 * mastered stand's setup, clears it twice over, and finds the press dead one stand further on.
 *
 * Deterministic: fixed clock, fixed seed, nothing rolled.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { STAGE_MAX_STARS } from '@content/balance/campaign';
import type { ChampionId } from '@content/champions/types';
import { content } from '@content/registry';
import { TUTORIAL_CHAPTERS } from '@content/tutorial/index';
import { progressKey, stageIdOf } from '@engine/campaign/progress';
import { createInstance, instanceIdFor, type Roster } from '@engine/champions/instance';
import { levelCap } from '@engine/champions/stats';
import { energyCap } from '@engine/economy/energy';
import { walletWith } from '@engine/economy/wallet';
import { createNewGame } from '@engine/save/new-game';
import type { SaveGame } from '@engine/schema/save';
import { encodeChronicleFile } from '@state/chronicle-file';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const OUT = join(REPO_ROOT, 'tests', 'fixtures', 'saves', 'instant.chronicle');
/** 2026-09-12 12:00 local, the same instant every save fixture froze. */
const NOW = new Date(2026, 8, 12, 12, 0).getTime();
const SEED = 'fixture.instant';
const APP_VERSION = '0.11.0';
const LEVEL = 12;
/** Enough for two batches of ten at four a run, and the cap besides. */
const ENERGY = 100;
const REPEAT = 10;
/** The lesson the chronicle has still to hear. */
const LESSON = 'tut.6.9';

const PARTY: readonly ChampionId[] = [
  'champ.ser_corvin',
  'champ.gil_scrapper',
  'champ.bran_militia',
  'champ.wenna_novice',
];

function roster(): Roster {
  const bound: Roster = {};
  PARTY.forEach((id, index) => {
    const def = content.championById(id);
    if (!def) throw new Error(`unknown champion ${id}`);
    const instanceId = instanceIdFor(def.id, index + 1);
    bound[instanceId] = {
      ...createInstance(def, { instanceId, now: NOW, source: index === 0 ? 'starter' : 'summon' }),
      level: levelCap(2),
      stars: 2,
    };
  });
  return bound;
}

/** Every grant the walked steps carried, recorded as paid, so an import owes nothing back. */
function paidGrants(steps: readonly string[]): string[] {
  const walked = new Set(steps);
  return TUTORIAL_CHAPTERS.flatMap((chapter) => chapter.steps)
    .filter((step) => walked.has(step.id) && step.grant)
    .map((step) => step.grant?.id ?? '');
}

/** Thornwood's first three stands mastered on Intro, the fourth at two stars. */
function progress(): Pick<SaveGame['campaign'], 'stars' | 'bestTurns'> {
  const stars: Record<string, number> = {};
  const bestTurns: Record<string, number> = {};
  for (const [stage, earned, turns] of [
    [1, STAGE_MAX_STARS, 9],
    [2, STAGE_MAX_STARS, 11],
    [3, STAGE_MAX_STARS, 12],
    [4, STAGE_MAX_STARS - 1, 31],
  ] as const) {
    const key = progressKey(stageIdOf(1, stage), 'intro');
    stars[key] = earned;
    bestTurns[key] = turns;
  }
  return { stars, bestTurns };
}

function chronicle(): SaveGame {
  const base = createNewGame({ name: 'Marvin', now: NOW, seedRoot: SEED });
  const bound = roster();
  const ids = Object.keys(bound);
  const steps = TUTORIAL_CHAPTERS.flatMap((chapter) => chapter.steps.map((step) => step.id)).filter(
    (id) => id !== LESSON,
  );
  return {
    ...base,
    profile: { ...base.profile, level: LEVEL, avatarChampionId: PARTY[0] ?? null },
    roster: bound,
    counters: { ...base.counters, instances: PARTY.length },
    teams: { ...base.teams, campaign: { presets: [ids, [], []], lastUsed: ids.slice(0, 3) } },
    wallet: walletWith([
      { currency: 'gold', amount: 50_000 },
      { currency: 'gems', amount: 120 },
    ]),
    energy: { value: Math.max(ENERGY, energyCap(LEVEL)), lastTickAt: NOW },
    campaign: { ...base.campaign, ...progress(), autoRepeat: REPEAT, selected: null },
    tutorial: { completedSteps: steps, skippedChapters: [] },
    provisionsClaimed: paidGrants(steps),
  };
}

async function main(): Promise<void> {
  const save = chronicle();
  await mkdir(join(REPO_ROOT, 'tests', 'fixtures', 'saves'), { recursive: true });
  await writeFile(OUT, `${await encodeChronicleFile(save, APP_VERSION, NOW)}\n`);
  console.log(`[fixtures] wrote ${OUT} (level ${save.profile.level}, energy ${save.energy.value})`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
