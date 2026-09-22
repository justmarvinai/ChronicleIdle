/**
 * `pnpm sim:balance` — the campaign difficulty-curve report (ROADMAP.md Phase 3).
 *
 *   pnpm sim:balance                 the curve for every difficulty, then the band check
 *   pnpm sim:balance --strict        exit 1 when a band in tools/sim/teams.ts breaks
 *   pnpm sim:balance --runs 30       more runs per stage (default 12)
 *   pnpm sim:balance --difficulty hard --team endgame     narrow the report
 *   pnpm sim:balance --scan          the enemy scale each band's team can actually take, the
 *                                    table a tuning pass fits the balance constants to
 *   pnpm sim:balance --brewery       only the Brewery's five-stage ladder and its bands
 */
import { DIFFICULTY_MULT, stageScale, type Difficulty } from '@content/balance/battle';
import { BREWERY_STAGE_SCALE, BREWERY_STAGES } from '@content/balance/brewery';
import { dungeonScale, type DungeonDifficulty } from '@content/balance/dungeon';
import { globalStageIndex } from '@content/balance/campaign';
import { ELEMENTS } from '@content/champions/types';
import { content } from '@content/registry';
import { BANDS, BREWERY_BANDS, DUNGEON_BANDS_CHECK, SIM_TEAMS, TEAM_BY_ID, type SimTeam } from './teams';
import {
  requiredBreweryScale,
  requiredScale,
  simulateBrewery,
  simulateDungeon,
  simulateSettlement,
} from './run';

/** The four keeps a chronicle can walk into; the Gilded Veil has no fights yet. */
const KEEPS = ['cindervault', 'pale_expanse', 'velkoras_cradle', 'ashenreach'] as const;

const argv = process.argv.slice(2);
const flag = (name: string): boolean => argv.includes(`--${name}`);
const option = (name: string): string | undefined => {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 ? argv[at + 1] : undefined;
};

const RUNS = Number(option('runs') ?? 12);
const DIFFICULTIES: Difficulty[] = ((): Difficulty[] => {
  const only = option('difficulty');
  return only ? [only as Difficulty] : ['intro', 'normal', 'hard'];
})();
const TEAMS: readonly SimTeam[] = ((): readonly SimTeam[] => {
  const only = option('team');
  if (!only) return SIM_TEAMS;
  const team = TEAM_BY_ID[only];
  if (!team) throw new Error(`unknown team ${only}; try ${SIM_TEAMS.map((t) => t.id).join(', ')}`);
  return [team];
})();

const pct = (value: number): string => `${Math.round(value * 100)}%`.padStart(4);

function curve(): void {
  console.log(`\nCampaign curve — ${RUNS} runs per stage, ten stages per settlement, auto battles`);
  for (const team of TEAMS) console.log(`  ${team.id.padEnd(15)} ${team.label}`);
  for (const difficulty of DIFFICULTIES) {
    const scale = (g: number): string => (DIFFICULTY_MULT[difficulty] * stageScale(g)).toFixed(1);
    console.log(
      `\n${difficulty.toUpperCase()}  (enemy scale ×${scale(0)} at settlement 1 → ×${scale(119)} at settlement 12)`,
    );
    console.log(`  settlement  ${TEAMS.map((t) => t.id.padEnd(14)).join('')}`);
    for (const settlement of content.settlements) {
      const cells = TEAMS.map((team) => {
        const { rate, threeStarRate } = simulateSettlement(settlement.index, difficulty, team, RUNS);
        return `${pct(rate)} ${pct(threeStarRate)}★  `;
      });
      const name = `${String(settlement.index).padStart(2)} ${settlement.id.split('.')[2] ?? ''}`;
      console.log(`  ${name.padEnd(24)} ${cells.join('')}`);
    }
  }
}

function bands(): boolean {
  console.log('\nBands (ROADMAP Phase 3 acceptance criteria)');
  let ok = true;
  for (const band of BANDS) {
    const team = TEAM_BY_ID[band.team];
    if (!team) throw new Error(`band names unknown team ${band.team}`);
    const { rate } = simulateSettlement(band.settlement, band.difficulty, team, RUNS);
    const low = band.min !== undefined && rate < band.min;
    const high = band.max !== undefined && rate > band.max;
    const want = [
      band.min !== undefined ? `≥ ${pct(band.min)}` : '',
      band.max !== undefined ? `≤ ${pct(band.max)}` : '',
    ]
      .filter(Boolean)
      .join(' ');
    const mark = low || high ? '✗' : '✓';
    if (low || high) ok = false;
    console.log(
      `  ${mark} ${band.team.padEnd(15)} ${band.difficulty.padEnd(6)} settlement ${String(band.settlement).padStart(2)}  ${pct(rate)} (want ${want})  — ${band.why}`,
    );
  }
  return ok;
}

const STAGES = Array.from({ length: BREWERY_STAGES }, (_, i) => i + 1);

/**
 * The Brewery's ladder: one row per hall and stage (BREWERY.md §7). Four halls share one scale
 * ladder but are held by four different factions, so the rows say where a stage is hardest.
 */
function breweryCurve(): void {
  console.log(`\nBrewery ladder — ${RUNS} runs per stage, auto battles`);
  console.log(`  hall      stage  scale  ${TEAMS.map((t) => t.id.padEnd(15)).join('')}`);
  for (const element of ELEMENTS) {
    for (const stage of STAGES) {
      const cells = TEAMS.map((team) => {
        const result = simulateBrewery(element, stage, team, RUNS);
        return `${pct(result.rate)} ${result.avgTurns ? `${result.avgTurns.toFixed(0)}t` : '  —'}    `;
      });
      const encounter = content.breweryEncounter(element, stage);
      const scale = (BREWERY_STAGE_SCALE[stage - 1] ?? 1).toFixed(1);
      const guards = encounter?.waves[0]?.enemies.length ?? 0;
      console.log(
        `  ${element.padEnd(9)} ${stage}      ${scale.padStart(4)}   ${cells.join('')} lv${String(
          encounter?.enemyLevel ?? 0,
        ).padStart(2)} ${guards}u`,
      );
    }
  }
}

/** The bands from `BREWERY_BANDS`: a `min` against the hardest hall, a `max` against the easiest. */
function breweryBands(): boolean {
  console.log('\nBrewery bands (BREWERY.md §7 — min = hardest hall, max = easiest hall)');
  let ok = true;
  for (const band of BREWERY_BANDS) {
    const team = TEAM_BY_ID[band.team];
    if (!team) throw new Error(`brewery band names unknown team ${band.team}`);
    const rates = ELEMENTS.map((element) => ({
      element,
      rate: simulateBrewery(element, band.stage, team, RUNS).rate,
    }));
    // A promise of clearability has to hold in the hall where it is hardest to keep, and a promise
    // of a wall in the hall where it is easiest to walk through.
    const worst = rates.reduce((a, b) => (b.rate < a.rate ? b : a));
    const best = rates.reduce((a, b) => (b.rate > a.rate ? b : a));
    const measured = band.min !== undefined ? worst : best;
    const low = band.min !== undefined && measured.rate < band.min;
    const high = band.max !== undefined && measured.rate > band.max;
    const want = [
      band.min !== undefined ? `≥ ${pct(band.min)}` : '',
      band.max !== undefined ? `≤ ${pct(band.max)}` : '',
    ]
      .filter(Boolean)
      .join(' ');
    if (low || high) ok = false;
    console.log(
      `  ${low || high ? '✗' : '✓'} ${band.team.padEnd(15)} stage ${band.stage}  ${pct(
        measured.rate,
      )} in ${measured.element.padEnd(8)} (want ${want})  — ${band.why}`,
    );
  }
  return ok;
}

/** What each band's team can actually take, as an enemy stat multiplier, stage by stage. */
function scan(): void {
  console.log('\nScale a team survives at an 85 % win rate (fit the balance constants to this)');
  const probes = [1, 3, 6, 9, 12];
  console.log(
    `  team             stage   ${probes.map((s) => `s${String(s).padStart(2)}`.padEnd(8)).join('')}`,
  );
  for (const team of TEAMS) {
    for (const stage of [1, 5, 10]) {
      const cells = probes.map((settlement) => {
        const id = `stage.${String(settlement).padStart(2, '0')}.${String(stage).padStart(2, '0')}`;
        const needed = requiredScale(id, 'intro', team, 0.85, Math.max(8, Math.round(RUNS / 2)));
        const g = globalStageIndex(settlement, stage);
        // Absolute: what the stage could carry in archetype-base units.
        return `${(needed * DIFFICULTY_MULT.intro * stageScale(g)).toFixed(2)}`.padEnd(8);
      });
      console.log(`  ${team.id.padEnd(16)} ${String(stage).padStart(2)}      ${cells.join('')}`);
    }
  }
}

/**
 * How much room each brewery stage has left: the factor on the shipped `BREWERY_STAGE_SCALE` at
 * which a team still wins 85 % of its runs. ×1 means the stage sits exactly on that line for that
 * team, so the ladder is fitted by reading down a column for the team each stage is pitched at.
 */
function breweryHeadroom(): void {
  console.log('\nBrewery headroom: × the shipped scale a team still wins 85 % of the time at');
  const runs = Math.max(8, Math.round(RUNS / 2));
  for (const team of TEAMS) {
    console.log(`\n  ${team.id} — ${team.label}`);
    console.log(`    hall      ${STAGES.map((stage) => `stage ${stage}`.padEnd(9)).join('')}`);
    for (const element of ELEMENTS) {
      const cells = STAGES.map((stage) =>
        `×${requiredBreweryScale(element, stage, team, 0.85, runs).toFixed(2)}`.padEnd(9),
      );
      console.log(`    ${element.padEnd(9)} ${cells.join('')}`);
    }
  }
}

/** The Dungeons' ladder: the rungs the bands name, across all four keeps (DUNGEONS.md §7). */
function dungeonCurve(): void {
  const rungs: readonly { difficulty: DungeonDifficulty; stage: number }[] = [
    { difficulty: 'normal', stage: 1 },
    { difficulty: 'normal', stage: 5 },
    { difficulty: 'normal', stage: 10 },
    { difficulty: 'normal', stage: 15 },
    { difficulty: 'normal', stage: 20 },
    { difficulty: 'hard', stage: 1 },
    { difficulty: 'hard', stage: 10 },
    { difficulty: 'hard', stage: 20 },
  ];
  console.log(`\nDungeon ladder — Cindervault, ${RUNS} runs per rung, auto battles`);
  console.log(`  rung        scale  ${TEAMS.map((t) => t.id.padEnd(15)).join('')}`);
  for (const rung of rungs) {
    const cells = TEAMS.map((team) => {
      const result = simulateDungeon('cindervault', rung.difficulty, rung.stage, team, RUNS);
      return `${pct(result.rate)} ${result.avgTurns ? `${result.avgTurns.toFixed(0)}t` : '  —'}    `;
    });
    const label = `${rung.difficulty === 'hard' ? 'H' : 'N'}${rung.stage}`;
    const scale = dungeonScale(rung.stage, rung.difficulty).toFixed(1);
    console.log(`  ${label.padEnd(11)} ${scale.padStart(5)}  ${cells.join('')}`);
  }
}

/** The bands from `DUNGEON_BANDS_CHECK`: a `min` against the hardest keep, a `max` against the easiest. */
function dungeonBands(): boolean {
  console.log('\nDungeon bands (DUNGEONS.md §7 — min = hardest keep, max = easiest keep)');
  let ok = true;
  for (const band of DUNGEON_BANDS_CHECK) {
    const team = TEAM_BY_ID[band.team];
    if (!team) throw new Error(`dungeon band names unknown team ${band.team}`);
    const rates = KEEPS.map((slug) => ({
      slug,
      rate: simulateDungeon(slug, band.difficulty, band.stage, team, RUNS).rate,
    }));
    // The same rule the Brewery's bands use: a promise of clearability has to hold where it is
    // hardest to keep, and a promise of a wall where it is easiest to walk through.
    const worst = rates.reduce((a, b) => (b.rate < a.rate ? b : a));
    const best = rates.reduce((a, b) => (b.rate > a.rate ? b : a));
    const measured = band.min !== undefined ? worst : best;
    const low = band.min !== undefined && measured.rate < band.min;
    const high = band.max !== undefined && measured.rate > band.max;
    const want = [
      band.min !== undefined ? `≥ ${pct(band.min)}` : '',
      band.max !== undefined ? `≤ ${pct(band.max)}` : '',
    ]
      .filter(Boolean)
      .join(' ');
    if (low || high) ok = false;
    const label = `${band.difficulty === 'hard' ? 'H' : 'N'}${band.stage}`;
    console.log(
      `  ${low || high ? '✗' : '✓'} ${band.team.padEnd(15)} ${label.padEnd(4)} ${pct(
        measured.rate,
      )} in ${measured.slug.padEnd(16)} (want ${want})  — ${band.why}`,
    );
  }
  return ok;
}

const started = Date.now();
if (flag('scan')) {
  // `--scan --brewery` narrows the fit to the Brewery's own ladder.
  if (!flag('brewery')) scan();
  breweryHeadroom();
} else if (flag('dungeon')) {
  dungeonCurve();
  const ok = dungeonBands();
  console.log(`\n${((Date.now() - started) / 1000).toFixed(1)} s`);
  if (!ok && flag('strict')) {
    console.error('[sim] a dungeon band is out of range — retune before shipping.');
    process.exit(1);
  }
} else if (flag('brewery')) {
  breweryCurve();
  const ok = breweryBands();
  console.log(`\n${((Date.now() - started) / 1000).toFixed(1)} s`);
  if (!ok && flag('strict')) {
    console.error('[sim] a brewery band is out of range — retune before shipping.');
    process.exit(1);
  }
} else {
  curve();
  const campaignOk = bands();
  breweryCurve();
  const breweryOk = breweryBands();
  dungeonCurve();
  const dungeonOk = dungeonBands();
  console.log(`\n${((Date.now() - started) / 1000).toFixed(1)} s`);
  if (!(campaignOk && breweryOk && dungeonOk) && flag('strict')) {
    console.error('[sim] a band is out of range — retune before shipping.');
    process.exit(1);
  }
}
