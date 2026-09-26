/**
 * Writes the two chronicles `tests/e2e/mine.spec.ts` plays (docs/design/MINE.md):
 *
 * - `mine-lesson.chronicle` — level 6, the first four chapters walked and Routine up to its Mine
 *   lesson, so the lesson opens on the hub the moment the chronicle loads;
 * - `mine.chronicle` — level 12 with the tutorial behind it, and a purse that pays for the Mine's
 *   second level but not its third, so one sitting can collect, dig, and be told what is missing.
 *
 * Both Mines are the one a new chronicle is handed: level 1, its first store full. Deterministic:
 * fixed clock, fixed seed, nothing rolled.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MINE_LEVELS } from '@content/balance/mine';
import type { ChampionId } from '@content/champions/types';
import { content } from '@content/registry';
import { TUTORIAL_CHAPTERS } from '@content/tutorial/index';
import { createInstance, instanceIdFor, type Roster } from '@engine/champions/instance';
import { levelCap } from '@engine/champions/stats';
import { walletWith } from '@engine/economy/wallet';
import { createNewGame } from '@engine/save/new-game';
import type { SaveGame } from '@engine/schema/save';
import { encodeChronicleFile } from '@state/chronicle-file';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const DIR = join(REPO_ROOT, 'tests', 'fixtures', 'saves');
/** 2026-09-12 12:00 local, the same instant every save fixture froze. */
const NOW = new Date(2026, 8, 12, 12, 0).getTime();
const SEED = 'fixture.mine';
const APP_VERSION = '0.10.0';

/** A small roster: the starter and three the chronicle has bound since. */
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

function chronicle(level: number, steps: readonly string[], gold: number): SaveGame {
  const base = createNewGame({ name: 'Marvin', now: NOW, seedRoot: SEED });
  const bound = roster();
  const ids = Object.keys(bound);
  const second = MINE_LEVELS[1];
  if (!second) throw new Error('the Mine has no second level');
  return {
    ...base,
    profile: { ...base.profile, level, avatarChampionId: PARTY[0] ?? null },
    roster: bound,
    counters: { ...base.counters, instances: PARTY.length },
    teams: { ...base.teams, campaign: { presets: [ids, [], []], lastUsed: ids } },
    // Exactly the second level's metal, and gold to spare: the third level's dust is what is short.
    wallet: walletWith([
      { currency: 'gold', amount: gold },
      { currency: 'gems', amount: 120 },
      ...second.cost.filter((line) => line.currency !== 'gold'),
    ]),
    tutorial: { completedSteps: [...steps], skippedChapters: [] },
    provisionsClaimed: paidGrants(steps),
  };
}

async function write(name: string, save: SaveGame): Promise<void> {
  const out = join(DIR, name);
  await mkdir(DIR, { recursive: true });
  await writeFile(out, `${await encodeChronicleFile(save, APP_VERSION, NOW)}\n`);
  console.log(`[fixtures] wrote ${out} (level ${save.profile.level}, Mine level ${save.mine.level})`);
}

async function main(): Promise<void> {
  const all = TUTORIAL_CHAPTERS.flatMap((chapter) => chapter.steps.map((step) => step.id));
  const lesson = all.indexOf('tut.5.4');
  if (lesson < 0) throw new Error('no Mine lesson in the script');
  await write('mine-lesson.chronicle', chronicle(6, all.slice(0, lesson), 40_000));
  await write('mine.chronicle', chronicle(12, all, 180_000));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
