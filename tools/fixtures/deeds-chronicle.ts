/**
 * Writes the chronicle `tests/e2e/deeds.spec.ts` plays (docs/design/ACHIEVEMENTS.md):
 * `deeds.chronicle` — level 13, every lesson walked but the Hall's, and a ledger of lifetime
 * counters that leaves nine achievement tiers and one challenge waiting: 105 renown, the first two
 * ranks and the Bronze frame the second one hangs up. So one sitting hears the lesson, claims a
 * tier by hand, claims the rest in one press, and wears the frame.
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
const OUT = join(REPO_ROOT, 'tests', 'fixtures', 'saves', 'deeds.chronicle');
/** 2026-09-12 12:00 local, the same instant every save fixture froze. */
const NOW = new Date(2026, 8, 12, 12, 0).getTime();
const SEED = 'fixture.deeds';
const APP_VERSION = '0.12.0';
const LEVEL = 13;
/** The lesson the chronicle has still to hear. */
const LESSON = 'tut.6.10';

const PARTY: readonly ChampionId[] = [
  'champ.ser_corvin',
  'champ.gil_scrapper',
  'champ.bran_militia',
  'champ.wenna_novice',
];

/**
 * The play behind the Hall's first morning. Stand-breaker and Victor to their second tier, four
 * first tiers besides, and one win with a lone champion on Normal — with the level-20 champion the
 * roster carries, nine tiers and one challenge: 55 + 50 = 105 renown.
 */
const STATS: Readonly<Record<string, number>> = {
  'campaign.cleared': 1_200,
  'battles.fought': 640,
  'battles.victory': 600,
  'battles.defeat': 40,
  'tavern.levelUps': 30,
  'summon.pulls': 12,
  'idle.claims': 12,
  'quests.claimed': 25,
  'feat.solo': 1,
};

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
    energy: { value: energyCap(LEVEL), lastTickAt: NOW },
    stats: { ...STATS },
    tutorial: { completedSteps: steps, skippedChapters: [] },
    provisionsClaimed: paidGrants(steps),
  };
}

async function main(): Promise<void> {
  const save = chronicle();
  await mkdir(join(REPO_ROOT, 'tests', 'fixtures', 'saves'), { recursive: true });
  await writeFile(OUT, `${await encodeChronicleFile(save, APP_VERSION, NOW)}\n`);
  console.log(`[fixtures] wrote ${OUT} (level ${save.profile.level}, Hall owed: nine tiers, one challenge)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
