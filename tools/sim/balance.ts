/**
 * `pnpm sim:balance` — the campaign difficulty-curve report (ROADMAP.md Phase 3).
 *
 *   pnpm sim:balance                 the curve for every difficulty, then the band check
 *   pnpm sim:balance --strict        exit 1 when a band in tools/sim/teams.ts breaks
 *   pnpm sim:balance --runs 30       more runs per stage (default 12)
 *   pnpm sim:balance --difficulty hard --team endgame     narrow the report
 *   pnpm sim:balance --scan          the enemy scale each band's team can actually take, the
 *                                    table a tuning pass fits the balance constants to
 */
import { DIFFICULTY_MULT, stageScale, type Difficulty } from '@content/balance/battle';
import { globalStageIndex } from '@content/balance/campaign';
import { content } from '@content/registry';
import { BANDS, SIM_TEAMS, TEAM_BY_ID, type SimTeam } from './teams';
import { requiredScale, simulateSettlement } from './run';

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

const started = Date.now();
if (flag('scan')) scan();
else {
  curve();
  const ok = bands();
  console.log(`\n${((Date.now() - started) / 1000).toFixed(1)} s`);
  if (!ok && flag('strict')) {
    console.error('[sim] a band is out of range — retune before shipping.');
    process.exit(1);
  }
}
