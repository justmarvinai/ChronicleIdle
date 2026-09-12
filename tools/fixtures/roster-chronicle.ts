/**
 * Writes `tests/fixtures/saves/roster-204.chronicle`: a chronicle with a bound starter, the three
 * companions and 200 seeded random champions. The e2e suite imports it to exercise the Champions
 * index at scale, and it doubles as a manual QA save. Deterministic (fixed clock, fixed seed), so
 * re-running only changes the file when the content or the save schema changes.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CHAMPION_IDS } from '@content/champions/types';
import { content } from '@content/registry';
import { generateRoster, seedStartingRoster } from '@engine/champions/roster';
import { createRng } from '@engine/rng/rng';
import { createNewGame } from '@engine/save/new-game';
import { encodeChronicleFile } from '@state/chronicle-file';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const OUT = join(REPO_ROOT, 'tests', 'fixtures', 'saves', 'roster-204.chronicle');
/** 2026-09-12 12:00 local, the same instant the Phase 0 fixture froze. */
const NOW = new Date(2026, 8, 12, 12, 0).getTime();
const SEED = 'fixture.roster';
const RANDOM_COUNT = 200;

async function main(): Promise<void> {
  const save = createNewGame({ name: 'Marvin', now: NOW, seedRoot: SEED });
  const seeded = seedStartingRoster(
    { roster: save.roster, counters: save.counters },
    content,
    'champ.ser_corvin',
    NOW,
  );
  if (!seeded.ok) throw new Error(`starter: ${seeded.error.message}`);
  const generated = generateRoster(
    seeded.value.state,
    content,
    CHAMPION_IDS,
    RANDOM_COUNT,
    createRng(SEED),
    NOW,
  );
  if (!generated.ok) throw new Error(`roster: ${generated.error.message}`);
  const full = {
    ...save,
    roster: generated.value.roster,
    counters: generated.value.counters,
    profile: { ...save.profile, avatarChampionId: 'champ.ser_corvin' as const },
  };
  const text = await encodeChronicleFile(full, '0.0.1', NOW);
  await mkdir(join(OUT, '..'), { recursive: true });
  await writeFile(OUT, `${text}\n`);
  const instances = Object.keys(full.roster).length;
  console.log(`[fixtures] wrote ${OUT} (${instances} champions, ${text.length} bytes)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
