/**
 * Writes the chronicle `tests/e2e/unwritten.spec.ts` plays (docs/design/UNWRITTEN.md):
 * `unwritten.chronicle` — level 16, the day the Torn Page opens, with every lesson walked but the
 * Unwritten's own (6.11), and eight champions at 5★ to choose a company from: enough to win an Omen
 * 0 skirmish on auto without the e2e suite watching a long fight. It carries a few Recovered Pages
 * already, so the Scriptorium can be written into once the expedition is over.
 *
 * Deterministic: fixed clock, fixed seed, nothing rolled.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ChampionId } from '@content/champions/types';
import { content } from '@content/registry';
import { TUTORIAL_CHAPTERS } from '@content/tutorial/index';
import { createInstance, instanceIdFor, type Roster } from '@engine/champions/instance';
import { levelCap } from '@engine/champions/stats';
import { energyCap } from '@engine/economy/energy';
import { walletWith } from '@engine/economy/wallet';
import { createNewGame } from '@engine/save/new-game';
import type { SaveGame } from '@engine/schema/save';
import { encodeChronicleFile } from '@state/chronicle-file';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const OUT = join(REPO_ROOT, 'tests', 'fixtures', 'saves', 'unwritten.chronicle');
/** 2026-09-12 12:00 local, the same instant every save fixture froze. */
const NOW = new Date(2026, 8, 12, 12, 0).getTime();
const SEED = 'fixture.unwritten';
const APP_VERSION = '0.13.0';
const LEVEL = 16;
const STARS = 5;
/** The lesson the chronicle has still to hear. */
const LESSON = 'tut.6.11';
/** Pages from expeditions before this one: one folio of the first shelf, and a little over. */
const PAGES = 90;

/** Two of each element, so the company can gather an ink and still be picked in any order. */
const ROSTER: readonly ChampionId[] = [
  'champ.anuria',
  'champ.thordakk',
  'champ.rattledagger',
  'champ.maruan',
  'champ.ser_corvin',
  'champ.reva_ashblade',
  'champ.darius',
  'champ.sister_maelis',
];

function roster(): Roster {
  const bound: Roster = {};
  ROSTER.forEach((id, index) => {
    const def = content.championById(id);
    if (!def) throw new Error(`unknown champion ${id}`);
    const instanceId = instanceIdFor(def.id, index + 1);
    bound[instanceId] = {
      ...createInstance(def, { instanceId, now: NOW, source: index === 0 ? 'starter' : 'summon' }),
      level: levelCap(STARS),
      stars: STARS,
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

function chronicle(): SaveGame {
  const base = createNewGame({ name: 'Marvin', now: NOW, seedRoot: SEED });
  const bound = roster();
  const steps = TUTORIAL_CHAPTERS.flatMap((chapter) => chapter.steps.map((step) => step.id)).filter(
    (id) => id !== LESSON,
  );
  return {
    ...base,
    profile: { ...base.profile, level: LEVEL, avatarChampionId: ROSTER[0] ?? null },
    roster: bound,
    counters: { ...base.counters, instances: ROSTER.length },
    wallet: walletWith([
      { currency: 'gold', amount: 80_000 },
      { currency: 'gems', amount: 200 },
    ]),
    energy: { value: energyCap(LEVEL), lastTickAt: NOW },
    tutorial: { completedSteps: steps, skippedChapters: [] },
    provisionsClaimed: paidGrants(steps),
    unwritten: { ...base.unwritten, pages: PAGES },
  };
}

async function main(): Promise<void> {
  const save = chronicle();
  await mkdir(join(REPO_ROOT, 'tests', 'fixtures', 'saves'), { recursive: true });
  await writeFile(OUT, `${await encodeChronicleFile(save, APP_VERSION, NOW)}\n`);
  console.log(
    `[fixtures] wrote ${OUT} (level ${save.profile.level}, ${ROSTER.length} champions at ${STARS}★${levelCap(STARS)}, ${PAGES} Pages)`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
