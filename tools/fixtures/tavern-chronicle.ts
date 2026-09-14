/**
 * Writes `tests/fixtures/saves/tavern.chronicle`: a chronicle past the Tavern's level gate with a
 * purse, brews, tomes and three spare 3★ copies to spend. The e2e suite imports it so the Tavern
 * can be played end to end in a production build. Deterministic (fixed clock, fixed seed).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { content } from '@content/registry';
import { addChampion, seedStartingRoster } from '@engine/champions/roster';
import { walletWith } from '@engine/economy/wallet';
import { createNewGame } from '@engine/save/new-game';
import { encodeChronicleFile } from '@state/chronicle-file';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const OUT = join(REPO_ROOT, 'tests', 'fixtures', 'saves', 'tavern.chronicle');
/** 2026-09-12 12:00 local, the same instant every save fixture froze. */
const NOW = new Date(2026, 8, 12, 12, 0).getTime();
const SEED = 'fixture.tavern';
/** Three spare copies at the starter's star tier: exactly what 3★ → 4★ asks for. */
const SPARE_COPIES = 3;

async function main(): Promise<void> {
  const save = createNewGame({ name: 'Marvin', now: NOW, seedRoot: SEED });
  const seeded = seedStartingRoster(
    { roster: save.roster, counters: save.counters },
    content,
    'champ.ser_corvin',
    NOW,
  );
  if (!seeded.ok) throw new Error(`starter: ${seeded.error.message}`);
  let state = seeded.value.state;
  for (let i = 0; i < SPARE_COPIES; i += 1) {
    const added = addChampion(state, content, 'champ.reva_ashblade', 'summon', NOW);
    if (!added.ok) throw new Error(`copy: ${added.error.message}`);
    state = added.value.state;
  }
  const full = {
    ...save,
    roster: state.roster,
    counters: { ...save.counters, instances: state.counters.instances },
    // Level 5 clears the Tavern's gate (level 2) with room to spare.
    profile: { ...save.profile, avatarChampionId: 'champ.ser_corvin' as const, level: 5 },
    wallet: walletWith([
      { currency: 'gold', amount: 50_000 },
      { currency: 'gems', amount: 300 },
      { currency: 'brew_justice', amount: 4 },
      { currency: 'brew_universal', amount: 2 },
      { currency: 'tome_rare', amount: 2 },
    ]),
  };
  const text = await encodeChronicleFile(full, '0.0.5', NOW);
  await mkdir(join(OUT, '..'), { recursive: true });
  await writeFile(OUT, `${text}\n`);
  console.log(`[fixtures] wrote ${OUT} (${Object.keys(full.roster).length} champions, level 5)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
