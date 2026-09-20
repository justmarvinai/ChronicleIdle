/**
 * Writes `tests/fixtures/saves/fresh.chronicle`: a chronicle at the very beginning — level 1, the
 * starter and its three companions, nothing played — but with Eldric's onboarding behind it.
 *
 * It exists so the e2e suites whose subject is *not* the first hour (the battle system, the
 * screens) can start from a chronicle at the hub without walking the tutorial first; the tutorial's
 * own suite walks it for real (`tests/e2e/tutorial.spec.ts`).
 *
 * Deterministic: fixed clock, fixed seed.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { content } from '@content/registry';
import { STARTING_COMPANION_IDS, type ChampionId } from '@content/champions/types';
import { createInstance, instanceIdFor, type Roster } from '@engine/champions/instance';
import { createNewGame } from '@engine/save/new-game';
import { encodeChronicleFile } from '@state/chronicle-file';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const OUT = join(REPO_ROOT, 'tests', 'fixtures', 'saves', 'fresh.chronicle');
/** 2026-09-12 12:00 local, the same instant every save fixture froze. */
const NOW = new Date(2026, 8, 12, 12, 0).getTime();
const SEED = 'fixture.fresh';

/** What `chooseStarter` seeds: Corvin and the three companions of TUTORIAL.md 1.5. */
const PARTY: readonly ChampionId[] = ['champ.ser_corvin', ...STARTING_COMPANION_IDS];

async function main(): Promise<void> {
  const base = createNewGame({ name: 'Marvin', now: NOW, seedRoot: SEED });
  const roster: Roster = {};
  PARTY.forEach((id, index) => {
    const def = content.championById(id);
    if (!def) throw new Error(`unknown champion ${id}`);
    const instanceId = instanceIdFor(def.id, index + 1);
    roster[instanceId] = createInstance(def, { instanceId, now: NOW, source: 'starter' });
  });

  const first = content.tutorialChapters[0];
  if (!first) throw new Error('no first tutorial chapter');
  const rest = content.tutorialChapters.slice(1);

  const full = {
    ...base,
    roster,
    counters: { ...base.counters, instances: PARTY.length },
    profile: { ...base.profile, avatarChampionId: PARTY[0] ?? null },
    // Awakening walked, everything after it waved off: Eldric has nothing left to say.
    tutorial: {
      completedSteps: first.steps.map((step) => step.id),
      skippedChapters: rest.map((chapter) => chapter.id),
    },
    // …and everything those chapters carried is recorded as paid, so the chronicle starts level.
    provisionsClaimed: content.tutorialSteps.flatMap((step) => (step.grant ? [step.grant.id] : [])),
  };
  const text = await encodeChronicleFile(full, '0.0.14', NOW);
  await mkdir(join(OUT, '..'), { recursive: true });
  await writeFile(OUT, `${text}\n`);
  console.log(`[fixtures] wrote ${OUT} (level 1, ${PARTY.length} champions, tutorial behind it)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
