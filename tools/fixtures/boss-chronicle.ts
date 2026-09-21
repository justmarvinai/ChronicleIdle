/**
 * Writes `tests/fixtures/saves/boss.chronicle`: a chronicle past the daily boss's gate with a
 * four-champion party strong enough to put a real dent in Gargoyle's Easy pool, so the e2e suite
 * can spend both keys, watch the damage add up across them and take a chest in a production
 * build. Deterministic (fixed clock, fixed seed).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { content } from '@content/registry';
import type { ChampionId } from '@content/champions/types';
import { levelCap } from '@engine/champions/stats';
import { createInstance, instanceIdFor, type Roster } from '@engine/champions/instance';
import { walletWith } from '@engine/economy/wallet';
import { createNewGame } from '@engine/save/new-game';
import { encodeChronicleFile } from '@state/chronicle-file';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const OUT = join(REPO_ROOT, 'tests', 'fixtures', 'saves', 'boss.chronicle');
/** 2026-09-12 12:00 local, the same instant every save fixture froze. */
const NOW = new Date(2026, 8, 12, 12, 0).getTime();
const SEED = 'fixture.boss';

/**
 * The party the gate fields, in slot order: a DoT stack, a curse, a bruiser and a healer — the
 * answer BOSSES.md §2 prints for a boss that shrugs off crowd control. Four stars at their cap is
 * what a chronicle around the daily boss's unlock can realistically field.
 */
const PARTY: readonly { id: ChampionId; stars: number }[] = [
  { id: 'champ.rattledagger', stars: 4 },
  { id: 'champ.khazgor', stars: 4 },
  { id: 'champ.anuria', stars: 4 },
  { id: 'champ.maruan', stars: 4 },
];

async function main(): Promise<void> {
  const save = createNewGame({ name: 'Marvin', now: NOW, seedRoot: SEED });
  const roster: Roster = {};
  const instanceIds: string[] = [];
  PARTY.forEach((member, index) => {
    const def = content.championById(member.id);
    if (!def) throw new Error(`unknown champion ${member.id}`);
    const instanceId = instanceIdFor(def.id, index + 1);
    roster[instanceId] = {
      ...createInstance(def, { instanceId, now: NOW, source: 'starter' }),
      stars: member.stars,
      level: levelCap(member.stars),
    };
    instanceIds.push(instanceId);
  });

  const full = {
    ...save,
    roster,
    counters: { ...save.counters, instances: PARTY.length },
    // Level 20 is well past the daily boss's gate (level 10).
    profile: { ...save.profile, avatarChampionId: PARTY[0]?.id ?? null, level: 20 },
    // The party is pre-picked and remembered, so the gate's Battle goes straight into the race.
    teams: {
      ...save.teams,
      boss: { presets: [instanceIds, [], []], lastUsed: instanceIds },
    },
    wallet: walletWith([
      { currency: 'gold', amount: 100_000 },
      { currency: 'gems', amount: 500 },
    ]),
  };
  const text = await encodeChronicleFile(full, '0.0.10', NOW);
  await mkdir(join(OUT, '..'), { recursive: true });
  await writeFile(OUT, `${text}\n`);
  console.log(`[fixtures] wrote ${OUT} (${PARTY.length} champions at 4★${levelCap(4)}, level 20)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
