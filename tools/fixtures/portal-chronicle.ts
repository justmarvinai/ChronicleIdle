/**
 * Writes `tests/fixtures/saves/portal.chronicle`: a chronicle with a purse of shards, gold and
 * gems, and three stars on every Intro stand — so the e2e suite can summon ×1 and ×10, buy at the
 * Exchange, and claim the Intro milestone's Epic in a production build. Deterministic.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SETTLEMENT_COUNT, STAGES_PER_SETTLEMENT } from '@content/balance/campaign';
import { content } from '@content/registry';
import { progressKey, stageIdOf } from '@engine/campaign/progress';
import { seedStartingRoster } from '@engine/champions/roster';
import { walletWith } from '@engine/economy/wallet';
import { createNewGame } from '@engine/save/new-game';
import { encodeChronicleFile } from '@state/chronicle-file';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const OUT = join(REPO_ROOT, 'tests', 'fixtures', 'saves', 'portal.chronicle');
/** 2026-09-12 12:00 local, the same instant every save fixture froze. */
const NOW = new Date(2026, 8, 12, 12, 0).getTime();
const SEED = 'fixture.portal';

async function main(): Promise<void> {
  const save = createNewGame({ name: 'Marvin', now: NOW, seedRoot: SEED });
  const seeded = seedStartingRoster(
    { roster: save.roster, counters: save.counters },
    content,
    'champ.ser_corvin',
    NOW,
  );
  if (!seeded.ok) throw new Error(`starter: ${seeded.error.message}`);

  // Three stars everywhere on Intro: the milestone that owes an Epic (CAMPAIGN.md §7).
  const stars: Record<string, number> = {};
  const bestTurns: Record<string, number> = {};
  for (let settlement = 1; settlement <= SETTLEMENT_COUNT; settlement += 1)
    for (let stage = 1; stage <= STAGES_PER_SETTLEMENT; stage += 1) {
      const key = progressKey(stageIdOf(settlement, stage), 'intro');
      stars[key] = 3;
      bestTurns[key] = 6;
    }

  const full = {
    ...save,
    roster: seeded.value.state.roster,
    counters: { ...save.counters, instances: seeded.value.state.counters.instances },
    // Level 20 is well past the Portal's gate (level 4).
    profile: { ...save.profile, avatarChampionId: 'champ.ser_corvin' as const, level: 20 },
    campaign: { ...save.campaign, stars, bestTurns },
    wallet: walletWith([
      { currency: 'gold', amount: 500_000 },
      { currency: 'gems', amount: 20_000 },
      { currency: 'shard_faded', amount: 40 },
      { currency: 'shard_ancient', amount: 40 },
      { currency: 'shard_sacred', amount: 20 },
      { currency: 'shard_primordial', amount: 2 },
    ]),
  };
  const text = await encodeChronicleFile(full, '0.0.8', NOW);
  await mkdir(join(OUT, '..'), { recursive: true });
  await writeFile(OUT, `${text}\n`);
  console.log(`[fixtures] wrote ${OUT} (level 20, Intro mastered, 102 shards)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
