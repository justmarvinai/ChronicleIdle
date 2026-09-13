import { describe, expect, it } from 'vitest';
import { SETTLEMENT_COUNT } from '@content/balance/campaign';
import { content } from '@content/registry';
import { levelCap } from '@engine/champions/stats';
import { simulateStage } from './run';
import { BANDS, SIM_TEAMS, TEAM_BY_ID, buildParty } from './teams';

describe('balance harness', () => {
  it('builds every reference team inside its own star caps', () => {
    for (const team of SIM_TEAMS) {
      const party = buildParty(team);
      expect(party, team.id).toHaveLength(3);
      for (const { def, instance } of party) {
        expect(instance.level, `${team.id}/${def.id}`).toBeLessThanOrEqual(levelCap(instance.stars));
        expect(instance.level, `${team.id}/${def.id}`).toBeGreaterThan(0);
      }
      // Gear is modelled as a multiplier over the authored stats, never as edited content.
      for (const { def } of party) {
        const authored = content.championById(def.id);
        if (!authored) throw new Error(def.id);
        if (team.gearMult > 1) expect(def.stats.atk, def.id).toBeGreaterThan(authored.stats.atk);
        else expect(def.stats, def.id).toEqual(authored.stats);
      }
    }
  });

  it('simulates a stage reproducibly and reports sane numbers', () => {
    const team = TEAM_BY_ID['starter_lv10'];
    if (!team) throw new Error('starter_lv10');
    const first = simulateStage('stage.01.01', 'intro', team, 5);
    const again = simulateStage('stage.01.01', 'intro', team, 5);
    expect(first).toEqual(again);
    expect(first.rate).toBe(1);
    expect(first.threeStars).toBeGreaterThan(0);
    expect(first.avgTurns).toBeGreaterThan(0);
    expect(first.avgWaves).toBe(2);
  });

  it('makes a fight harder when the tuning knob raises enemy stats', () => {
    const team = TEAM_BY_ID['starter_lv10'];
    if (!team) throw new Error('starter_lv10');
    const tuned = simulateStage('stage.01.01', 'intro', team, 5, 1, { hp: 6, atk: 3, def: 2 });
    expect(tuned.rate).toBeLessThan(1);
  });

  it('writes every band against a team and settlement that exist', () => {
    for (const band of BANDS) {
      expect(TEAM_BY_ID[band.team], band.team).toBeDefined();
      expect(band.settlement).toBeGreaterThanOrEqual(1);
      expect(band.settlement).toBeLessThanOrEqual(SETTLEMENT_COUNT);
      expect(band.min ?? band.max, `${band.team} ${band.difficulty}`).toBeDefined();
      expect(band.why.length).toBeGreaterThan(8);
    }
  });
});
