import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PLAYER_MAX_LEVEL } from '@content/balance/unlocks';
import { content } from '@content/registry';
import { xpToNextLevel } from '@engine/progression/player-level';
import type { SaveGame } from '@engine/schema/save';
import { migrateSave } from '@state/migrations';
import { awayLabel, chronicleCardView } from './title-view';

/** A played chronicle (level 28, eight champions), brought up to today's save version. */
const played = (): SaveGame =>
  migrateSave(JSON.parse(readFileSync('tests/fixtures/saves/v22.json', 'utf8')) as unknown).save;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe('the chronicle card on the title screen', () => {
  it('reads who the chronicle is and how far it has come from the save', () => {
    const save = played();
    const view = chronicleCardView(save, 'frame.gold', save.updatedAt, null);
    expect(view.name).toBe(save.profile.name);
    expect(view.level).toBe(save.profile.level);
    expect(view.frameId).toBe('frame.gold');
    expect(view.champions).toBe(Object.keys(save.roster).length);
    expect(view.power).toBeGreaterThan(0);
    // Experience is shown against what this level asks, never past a full bar.
    const next = xpToNextLevel(save.profile.level);
    expect(view.xpLine).toEqual({ now: save.profile.xp, next });
    expect(view.xp).toBeCloseTo(Math.min(1, save.profile.xp / next));
    expect(view.campaign).not.toBeNull();
  });

  it('names the worn title and fills the bar at the level cap', () => {
    const save = played();
    const title = content.titles[0];
    expect(title).toBeDefined();
    const capped: SaveGame = {
      ...save,
      profile: { ...save.profile, level: PLAYER_MAX_LEVEL, xp: 0, title: title?.id ?? null },
    };
    const view = chronicleCardView(capped, null, save.updatedAt, null);
    expect(view.titleName).toBe(title?.name);
    expect(view.xp).toBe(1);
    expect(view.xpLine).toBeNull();
  });

  it('prefers the absence the boot measured, and falls back to the save’s own stamp', () => {
    const save = played();
    expect(chronicleCardView(save, null, save.updatedAt + 5 * HOUR, 3 * MINUTE).awayMs).toBe(3 * MINUTE);
    expect(chronicleCardView(save, null, save.updatedAt + 5 * HOUR, null).awayMs).toBe(5 * HOUR);
    // A clock behind the save never reads as a negative absence.
    expect(chronicleCardView(save, null, save.updatedAt - HOUR, null).awayMs).toBe(0);
    expect(chronicleCardView({ ...save, updatedAt: 0 }, null, HOUR, null).awayMs).toBeNull();
  });
});

describe('saying how long ago the chronicle was played', () => {
  it('speaks in minutes, then hours, then days — never seconds', () => {
    expect(awayLabel(0)).toEqual({ key: 'now', count: 0 });
    expect(awayLabel(59_000)).toEqual({ key: 'now', count: 0 });
    expect(awayLabel(MINUTE)).toEqual({ key: 'minutes', count: 1 });
    expect(awayLabel(59 * MINUTE)).toEqual({ key: 'minutes', count: 59 });
    expect(awayLabel(HOUR)).toEqual({ key: 'hours', count: 1 });
    // Up to two days still reads in hours, so "1 days" is never said.
    expect(awayLabel(47 * HOUR + 59 * MINUTE)).toEqual({ key: 'hours', count: 47 });
    expect(awayLabel(48 * HOUR)).toEqual({ key: 'days', count: 2 });
    expect(awayLabel(14 * 24 * HOUR + 5 * HOUR)).toEqual({ key: 'days', count: 14 });
  });
});
