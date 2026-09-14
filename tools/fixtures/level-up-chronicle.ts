/**
 * Writes `tests/fixtures/saves/level-up.chronicle`: a chronicle with a bound starter and its XP
 * bar one stand short of level 2. The e2e suite imports it so the level-up moment can be played
 * end-to-end in a production build (where the debug panel does not exist). Deterministic.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { content } from '@content/registry';
import { seedStartingRoster } from '@engine/champions/roster';
import { xpToNextLevel } from '@engine/progression/player-level';
import { createNewGame } from '@engine/save/new-game';
import { encodeChronicleFile } from '@state/chronicle-file';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const OUT = join(REPO_ROOT, 'tests', 'fixtures', 'saves', 'level-up.chronicle');
/** 2026-09-12 12:00 local, the same instant every save fixture froze. */
const NOW = new Date(2026, 8, 12, 12, 0).getTime();
const SEED = 'fixture.levelup';
/** One Intro stand of Thornwood pays 40 chronicle XP (4 energy × PLAYER_XP_PER_ENERGY). */
const SHORT_BY = 20;

async function main(): Promise<void> {
  const save = createNewGame({ name: 'Marvin', now: NOW, seedRoot: SEED });
  const seeded = seedStartingRoster(
    { roster: save.roster, counters: save.counters },
    content,
    'champ.ser_corvin',
    NOW,
  );
  if (!seeded.ok) throw new Error(`starter: ${seeded.error.message}`);
  const full = {
    ...save,
    roster: seeded.value.state.roster,
    counters: { ...save.counters, instances: seeded.value.state.counters.instances },
    profile: {
      ...save.profile,
      avatarChampionId: 'champ.ser_corvin' as const,
      xp: xpToNextLevel(1) - SHORT_BY,
    },
  };
  const text = await encodeChronicleFile(full, '0.0.4', NOW);
  await mkdir(join(OUT, '..'), { recursive: true });
  await writeFile(OUT, `${text}\n`);
  console.log(`[fixtures] wrote ${OUT} (level ${full.profile.level}, ${full.profile.xp} XP)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
