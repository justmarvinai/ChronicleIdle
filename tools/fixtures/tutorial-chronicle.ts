/**
 * Writes `tests/fixtures/saves/tutorial.chronicle`: a chronicle standing at the Chronicler's Hall
 * with Eldric's fifth chapter open — the first chapter walked, the three after it waved off — so
 * the e2e suite can prove the thing the ROADMAP asks about skipping: that a lesson can be waved
 * off at any point and the game is whole afterwards (`TUTORIAL.md`, owner's answer Q4).
 *
 * Deterministic: fixed clock, fixed seed.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { content } from '@content/registry';
import { STARTING_COMPANION_IDS, type ChampionId } from '@content/champions/types';
import { createInstance, instanceIdFor, type Roster } from '@engine/champions/instance';
import { walletWith } from '@engine/economy/wallet';
import { stageIdOf } from '@engine/campaign/progress';
import { createNewGame } from '@engine/save/new-game';
import { encodeChronicleFile } from '@state/chronicle-file';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const OUT = join(REPO_ROOT, 'tests', 'fixtures', 'saves', 'tutorial.chronicle');
/** 2026-09-12 12:00 local, the same instant every save fixture froze. */
const NOW = new Date(2026, 8, 12, 12, 0).getTime();
const SEED = 'fixture.tutorial';

/** The starter and the three companions a chronicle leaves chapter 1 with. */
const PARTY: readonly ChampionId[] = ['champ.ser_corvin', ...STARTING_COMPANION_IDS];

/** What a chronicle six levels in has counted; the Path's first page is already earned. */
const COUNTERS: Readonly<Record<string, number>> = {
  'battles.fought': 22,
  'battles.victory': 20,
  'battles.won.manual': 4,
  'campaign.runs': 22,
  'campaign.cleared': 9,
  'campaign.stars': 21,
  'energy.spent': 190,
  'tavern.levelUps': 6,
  'gear.drops': 7,
  'gear.levels': 4,
  'summon.pulls': 1,
  'summon.pulls.ancient': 1,
};

async function main(): Promise<void> {
  const base = createNewGame({ name: 'Marvin', now: NOW, seedRoot: SEED });
  const roster: Roster = {};
  PARTY.forEach((id, index) => {
    const def = content.championById(id);
    if (!def) throw new Error(`unknown champion ${id}`);
    const instanceId = instanceIdFor(def.id, index + 1);
    roster[instanceId] = {
      ...createInstance(def, { instanceId, now: NOW, source: 'starter' }),
      level: index === 0 ? 12 : 8,
    };
  });

  // The first settlement's opening stands, cleared on Intro.
  const stars: Record<string, number> = {};
  for (let stage = 1; stage <= 9; stage += 1) stars[`${stageIdOf(1, stage)}|intro`] = stage <= 3 ? 3 : 2;

  const chapterOne = content.tutorialChapters[0];
  if (!chapterOne) throw new Error('no first tutorial chapter');
  const waved = content.tutorialChapters.slice(1, 4);

  const full = {
    ...base,
    roster,
    counters: { ...base.counters, instances: PARTY.length },
    profile: { ...base.profile, avatarChampionId: PARTY[0] ?? null, level: 6 },
    campaign: { ...base.campaign, stars },
    stats: { ...COUNTERS },
    wallet: walletWith([
      { currency: 'gold', amount: 24_000 },
      { currency: 'gems', amount: 300 },
    ]),
    // Awakening walked, The Hold, The Binding and Routine waved off, and The Path about to open.
    tutorial: {
      completedSteps: chapterOne.steps.map((step) => step.id),
      skippedChapters: waved.map((chapter) => chapter.id),
    },
    // Their grants were handed over as those chapters ended, which is what skipping does; the
    // Path's own 250 is the one still owed.
    provisionsClaimed: [chapterOne, ...waved]
      .flatMap((chapter) => chapter.steps)
      .flatMap((step) => (step.grant ? [step.grant.id] : [])),
  };
  const text = await encodeChronicleFile(full, '0.0.14', NOW);
  await mkdir(join(OUT, '..'), { recursive: true });
  await writeFile(OUT, `${text}\n`);
  console.log(`[fixtures] wrote ${OUT} (chapter 5 open, ${waved.length} chapters waved off)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
