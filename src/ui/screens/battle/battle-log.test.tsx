import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setManifestForTests } from '@assets/manifest';
import type { AssetManifest } from '@assets/manifest-types';
import type { BattleEvent, BattleView, UnitView } from '@engine/battle/index';
import { describeEvents, lineText } from './battle-log';
import { InfoPanel } from './InfoPanel';

setManifestForTests(
  JSON.parse(readFileSync('public/assets/generated/manifest.json', 'utf8')) as AssetManifest,
);

function unitView(over: Partial<UnitView> & Pick<UnitView, 'id' | 'side' | 'defId' | 'name'>): UnitView {
  return {
    instanceId: null,
    slot: 0,
    level: 30,
    element: 'valor',
    role: 'attack',
    hp: 1_000,
    maxHp: 1_000,
    shield: 0,
    tm: 0,
    alive: true,
    isBoss: false,
    guarding: null,
    statuses: [],
    abilities: [],
    art: { model: 'teritorial_lizard', tint: null, facing: 'right', scale: 1, desaturate: false },
    boss: null,
    ...over,
  };
}

const VARKOS = unitView({
  id: 'a0',
  side: 'ally',
  defId: 'champ.varkos_sundered_king',
  name: 'champ.varkos_sundered_king.name',
  element: 'eclipse',
});
const HALVAR = unitView({
  id: 'w1e0',
  side: 'enemy',
  defId: 'enemy.redcap_halvar',
  name: 'enemy.redcap_halvar.name',
});

const view: BattleView = {
  encounterId: 'stage.01.10',
  units: [VARKOS, HALVAR],
  wave: 1,
  waveCount: 1,
  turn: 4,
  allyTurns: 2,
  turnLimit: 50,
  phase: 'running',
  control: 'manual',
  focusId: null,
  pending: null,
  outcome: null,
};

const hit = (over: Partial<Extract<BattleEvent, { type: 'hit' }>> = {}): BattleEvent => ({
  type: 'hit',
  sourceId: 'a0',
  targetId: 'w1e0',
  abilityId: 'ab.varkos_sundered_king.sovereign_will',
  damage: 2_250,
  absorbed: 0,
  crit: false,
  match: 'neutral',
  hpAfter: 0,
  shieldAfter: 0,
  killed: false,
  redirectedFrom: null,
  ...over,
});

describe('battle log lines', () => {
  it('names a unit in its rarity (ally) or its element (enemy)', () => {
    const [line] = describeEvents([hit()], view);
    expect(line?.kind).toBe('hit');
    expect(line?.values.source).toEqual({
      kind: 'unit',
      id: 'a0',
      name: 'Varkos Sunderking',
      side: 'ally',
      colour: 'var(--r-mythic)',
      boss: false,
    });
    expect(line?.values.target).toMatchObject({ colour: 'var(--el-valor)' });
    expect(line?.values.damage).toEqual({ kind: 'amount', value: 2_250, tone: 'damage' });
  });

  it('marks a crit as its own kind', () => {
    const [line] = describeEvents([hit({ crit: true })], view);
    expect(line?.kind).toBe('crit');
    expect(line?.template).toBe('battle.log.crit');
  });

  it('tells a heal from a shield absorbing the blow', () => {
    const lines = describeEvents(
      [
        hit({ damage: 0, absorbed: 400 }),
        { type: 'heal', sourceId: 'a0', targetId: 'a0', amount: 300, hpAfter: 900, reason: 'ability' },
      ],
      view,
    );
    expect(lines.map((l) => l.kind)).toEqual(['shield', 'heal']);
    expect(lines[0]?.values.amount).toMatchObject({ tone: 'shield' });
    expect(lines[1]?.values.amount).toMatchObject({ tone: 'heal' });
  });

  it('carries a status as a status, so the panel can draw its icon', () => {
    const lines = describeEvents(
      [
        {
          type: 'status.applied',
          targetId: 'a0',
          sourceId: 'a0',
          status: 'atk_up',
          turns: 2,
          value: 0.5,
          stacks: 1,
          refreshed: false,
        },
        {
          type: 'status.applied',
          targetId: 'w1e0',
          sourceId: 'a0',
          status: 'heal_reduction',
          turns: 2,
          value: 0.5,
          stacks: 1,
          refreshed: false,
        },
      ],
      view,
    );
    expect(lines.map((l) => l.kind)).toEqual(['buff', 'debuff']);
    expect(lines[0]?.values.status).toEqual({
      kind: 'status',
      id: 'atk_up',
      name: 'ATK Up',
      status: 'buff',
    });
    expect(lines[1]?.values.status).toMatchObject({ name: 'Heal Reduction', status: 'debuff' });
  });

  it('reads back as the plain English sentence', () => {
    const [line] = describeEvents([hit({ crit: true })], view);
    expect(line && lineText(line)).toBe('Varkos Sunderking crits Redcap Halvar, Bandit King for 2,250!');
    const [died] = describeEvents([{ type: 'unit.died', unitId: 'w1e0', killerId: 'a0' }], view);
    expect(died?.kind).toBe('death');
    expect(died && lineText(died)).toBe('Redcap Halvar, Bandit King falls.');
  });
});

describe('the Info panel', () => {
  it('draws every line with its kind, its names in colour and its statuses as icons', () => {
    render(
      <InfoPanel
        log={[
          { type: 'wave.started', wave: 1, waveCount: 1, enemyIds: ['w1e0'], units: [] },
          hit({ crit: true }),
          {
            type: 'status.applied',
            targetId: 'a0',
            sourceId: 'a0',
            status: 'atk_up',
            turns: 2,
            value: 0.5,
            stacks: 1,
            refreshed: false,
          },
          { type: 'unit.died', unitId: 'w1e0', killerId: 'a0' },
        ]}
        view={view}
      />,
    );
    const rows = screen.getAllByRole('listitem');
    expect(rows.map((r) => r.dataset.kind)).toEqual(['system', 'crit', 'buff', 'death']);
    // A row is readable as one sentence, whatever its parts are drawn as.
    expect(rows[1]?.getAttribute('aria-label')).toBe(
      'Varkos Sunderking crits Redcap Halvar, Bandit King for 2,250!',
    );
    // The fallen enemy keeps its element colour; the crit keeps its ally's rarity.
    expect(screen.getAllByText('Varkos Sunderking')[0]).toHaveStyle({ color: 'var(--r-mythic)' });
    expect(screen.getAllByText('Redcap Halvar, Bandit King')[0]).toHaveStyle({
      color: 'var(--el-valor)',
    });
    expect(screen.getByText('ATK Up')).toBeInTheDocument();
  });

  it('says so when nothing has happened yet', () => {
    render(<InfoPanel log={[]} view={view} />);
    expect(screen.getByText('Nothing has happened yet.')).toBeInTheDocument();
  });

  it('only asks the stylesheet for classes the bundler will hand it', () => {
    const tsx = readFileSync('src/ui/screens/battle/InfoPanel.tsx', 'utf8');
    const css = readFileSync('src/ui/screens/battle/BattleScreen.module.css', 'utf8');
    const asked = [...tsx.matchAll(/\bstyles\.(\w+)/g)].flatMap((m) => (m[1] ? [m[1]] : []));
    expect(asked.length).toBeGreaterThan(10);
    for (const name of new Set(asked)) {
      // Only camel-case locals survive `css.modules.localsConvention` (vite.config.ts), so a rule
      // written `.log_turn` reaches the DOM as nothing at all — the rails and tints just vanish.
      expect(name, `${name} is not camelCase`).toMatch(/^[a-z][A-Za-z0-9]*$/);
      expect(new RegExp(`\\.${name}\\b`).test(css), `.${name} is missing from the stylesheet`).toBe(true);
    }
  });
});
