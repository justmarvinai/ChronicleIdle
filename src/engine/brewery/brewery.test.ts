/**
 * The Brewery's engine (docs/design/BREWERY.md): the day's allowance, which stage is open next,
 * what a clear pays, and the calendar the Eclipse hall keeps.
 */
import { describe, expect, it } from 'vitest';
import { BREWERY_DAILY_RUNS, BREWERY_STAGES } from '@content/balance/brewery';
import { BREWERY_BY_ELEMENT } from '@content/brewery/index';
import { DAILY_RESET_HOUR } from '@content/balance/economy';
import { dailyKey, gameWeekday, MS_PER_DAY, MS_PER_HOUR } from '@engine/time/clock';
import type { BrewerySave } from '@engine/schema/save';
import {
  breweryDay,
  breweryEncounterId,
  breweryRewards,
  clearedStage,
  daysUntilOpen,
  isBreweryOpen,
  isStageUnlocked,
  msUntilBreweryOpens,
  nextOpenWeekday,
  parseBreweryEncounterId,
  runsLeft,
  stageState,
} from './index';

/** 2026-09-21 is a Monday; noon, so a few hours either way is the same day. */
const MONDAY = new Date(2026, 8, 21, 12, 0).getTime();
const day = (offset: number): number => MONDAY + offset * MS_PER_DAY;
const key = (now: number): string => dailyKey(now, DAILY_RESET_HOUR);

const empty = (over: Partial<BrewerySave> = {}): BrewerySave => ({
  periodKey: '',
  runs: 0,
  cleared: {},
  ...over,
});

describe('the day’s twenty runs', () => {
  it('starts full and counts down across every hall together', () => {
    const save = empty({ periodKey: key(MONDAY), runs: 3 });
    expect(runsLeft(save, key(MONDAY))).toBe(BREWERY_DAILY_RUNS - 3);
    // Spent to the last one, and never past it.
    expect(runsLeft(empty({ periodKey: key(MONDAY), runs: BREWERY_DAILY_RUNS }), key(MONDAY))).toBe(0);
    expect(runsLeft(empty({ periodKey: key(MONDAY), runs: 99 }), key(MONDAY))).toBe(0);
  });

  it('comes back at the door when the day turns, not at midnight', () => {
    const spent = empty({ periodKey: key(MONDAY), runs: BREWERY_DAILY_RUNS });
    expect(runsLeft(spent, key(MONDAY))).toBe(0);
    // A record stamped with yesterday reads as a fresh day, whatever ran while the game was shut.
    expect(runsLeft(spent, key(day(1)))).toBe(BREWERY_DAILY_RUNS);
    expect(breweryDay(spent, key(day(1)))).toEqual({
      periodKey: key(day(1)),
      runs: 0,
      cleared: {},
    });
    // …and rolling the day keeps what the halls have been taken to.
    const deep = empty({ periodKey: key(MONDAY), runs: 20, cleared: { 'brewery.valor': 3 } });
    expect(breweryDay(deep, key(day(1))).cleared).toEqual({ 'brewery.valor': 3 });
  });
});

describe('a hall’s five stages', () => {
  it('opens stage 1 to everyone and each next one on the clear before it', () => {
    expect(isStageUnlocked(0, 1)).toBe(true);
    expect(isStageUnlocked(0, 2)).toBe(false);
    expect(isStageUnlocked(3, 4)).toBe(true);
    expect(isStageUnlocked(3, 5)).toBe(false);
    expect(isStageUnlocked(BREWERY_STAGES, BREWERY_STAGES)).toBe(true);
  });

  it('says what the screen draws each stage as', () => {
    expect(stageState(2, 1)).toBe('cleared');
    expect(stageState(2, 2)).toBe('cleared');
    expect(stageState(2, 3)).toBe('next');
    expect(stageState(2, 4)).toBe('locked');
  });

  it('remembers how deep each hall has been taken, and only that hall', () => {
    const save = empty({ cleared: { 'brewery.eclipse': 4 } });
    expect(clearedStage(save, 'brewery.eclipse')).toBe(4);
    expect(clearedStage(save, 'brewery.faith')).toBe(0);
  });

  it('pays the stage’s own number, in its hall’s brew', () => {
    for (const hall of Object.values(BREWERY_BY_ELEMENT))
      for (const stage of hall.stages)
        expect(breweryRewards(hall, stage)).toEqual([{ currency: hall.brew, amount: stage.number }]);
  });

  it('round-trips a stage through its encounter id', () => {
    expect(breweryEncounterId('eclipse', 3)).toBe('encounter.brewery.eclipse.3');
    expect(parseBreweryEncounterId('encounter.brewery.eclipse.3')).toEqual({
      element: 'eclipse',
      stage: 3,
    });
    expect(parseBreweryEncounterId('encounter.brewery.nowhere.3')).toBeNull();
    expect(parseBreweryEncounterId('encounter.tower.010')).toBeNull();
  });
});

describe('the Eclipse hall’s calendar', () => {
  const eclipse = BREWERY_BY_ELEMENT.eclipse;
  const valor = BREWERY_BY_ELEMENT.valor;

  it('takes the weekday from the player’s own day', () => {
    expect(gameWeekday(MONDAY, DAILY_RESET_HOUR)).toBe(1);
    // A minute before their midnight is still Monday; a minute after is Tuesday.
    expect(gameWeekday(new Date(2026, 8, 21, 23, 59).getTime(), DAILY_RESET_HOUR)).toBe(1);
    expect(gameWeekday(new Date(2026, 8, 22, 0, 1).getTime(), DAILY_RESET_HOUR)).toBe(2);
  });

  it('opens on Wednesday and for the weekend, and stays shut the rest of the week', () => {
    expect(eclipse.openDays).toEqual([3, 6, 0]);
    const open = [0, 3, 6];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      // 2026-09-20 is a Sunday, so `weekday` days on from it is that weekday.
      const at = new Date(2026, 8, 20 + weekday, 12, 0).getTime();
      expect(gameWeekday(at, DAILY_RESET_HOUR)).toBe(weekday);
      expect(isBreweryOpen(eclipse, at)).toBe(open.includes(weekday));
      // The other three brew every day of the week.
      expect(isBreweryOpen(valor, at)).toBe(true);
    }
  });

  it('counts the days to its next opening, and the hours to the door', () => {
    // Monday: shut, and Wednesday is two days out.
    expect(daysUntilOpen(eclipse, MONDAY)).toBe(2);
    expect(nextOpenWeekday(eclipse, MONDAY)).toBe(3);
    // Noon Monday to midnight Wednesday is 36 hours.
    expect(msUntilBreweryOpens(eclipse, MONDAY)).toBe(36 * MS_PER_HOUR);
    // Open today: no wait at all.
    const wednesday = day(2);
    expect(isBreweryOpen(eclipse, wednesday)).toBe(true);
    expect(msUntilBreweryOpens(eclipse, wednesday)).toBe(0);
    expect(msUntilBreweryOpens(valor, MONDAY)).toBe(0);
    // Thursday: shut again, and Saturday is two days out.
    expect(daysUntilOpen(eclipse, day(3))).toBe(2);
    // Sunday rolls into Monday, so from Sunday the next opening is four days on (Wednesday).
    expect(daysUntilOpen(eclipse, day(6))).toBe(0);
    expect(daysUntilOpen(eclipse, day(7))).toBe(2);
  });
});
