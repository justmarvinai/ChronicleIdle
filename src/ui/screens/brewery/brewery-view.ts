/**
 * What the Brewery screen prints (docs/tech/UI_DESIGN.md §5.23).
 *
 * Display only: which element to bring, which days a hall keeps, what a stage is pitched at, and
 * whose art the hall wears. The rules are the engine's and the numbers are content's.
 */
import { ELEMENT_BEATS } from '@content/balance/element';
import { DAILY_RESET_HOUR, WEEKLY_RESET_WEEKDAY } from '@content/balance/economy';
import type { BackdropKey } from '@assets/manifest.generated';
import type { BreweryDef, BreweryStageDef } from '@content/brewery/types';
import { ELEMENTS, type Element } from '@content/champions/types';
import type { EncounterDef } from '@content/encounters/types';
import type { EnemyDef } from '@content/enemies/types';
import { content } from '@content/registry';
import { breweryEncounterId } from '@engine/brewery/index';
import { gameWeekday } from '@engine/time/clock';
import { t, type I18nKey } from '@i18n/index';
import { enemyPower } from '@ui/screens/battle-setup/setup-view';

/** What each stage is pitched at, in the words the rows print. */
export const tierKey = (stage: number): I18nKey => `brewery.tier.${stage}` as I18nKey;

/**
 * The element that has the advantage in a hall — the one that beats the guards' own. The Brewery
 * is where the element wheel is taught, and Eclipse is the hall nothing counters (`CHAMPIONS.md`
 * §1): `null` there, and the screen says so instead of naming an element.
 */
export function counterOf(element: Element): Element | null {
  return ELEMENTS.find((candidate) => ELEMENT_BEATS[candidate] === element) ?? null;
}

/**
 * `every day`, or `Wed, Sat, Sun` — in the order of the game's own week, which starts on the day
 * the weekly reset falls on rather than on `getDay`'s Sunday.
 */
export function openDaysLabel(def: BreweryDef): string {
  if (def.openDays.length >= 7) return t('brewery.everyDay');
  const fromWeekStart = (day: number): number => (day - WEEKLY_RESET_WEEKDAY + 7) % 7;
  return [...def.openDays]
    .sort((a, b) => fromWeekStart(a) - fromWeekStart(b))
    .map((day) => t(`brewery.dayShort.${day}` as I18nKey))
    .join(', ');
}

/**
 * Who holds a stage — the faction of the settlement its cellar is cut under. It is the one thing
 * about a stage a player can actually prepare for, so the row prints it.
 */
export function stageHolder(stage: BreweryStageDef): string | null {
  const settlement = content.settlementByIndex(stage.settlement);
  const faction = settlement ? content.factionById(settlement.faction) : undefined;
  return faction?.name ?? null;
}

/** The art a hall wears: the place its deepest cellar is cut into. */
export function hallBackdrop(def: BreweryDef): BackdropKey {
  const deepest = def.stages[def.stages.length - 1];
  const settlement = deepest ? content.settlementByIndex(deepest.settlement) : undefined;
  return settlement?.backdrop ?? 'bg.bg5';
}

/** The colour grade over that art, so four halls in the same kit read as four places. */
export function hallGrade(element: Element): string {
  switch (element) {
    case 'justice':
      return 'rgba(40, 30, 10, 0.62)';
    case 'valor':
      return 'rgba(44, 14, 10, 0.62)';
    case 'faith':
      return 'rgba(12, 26, 44, 0.62)';
    case 'eclipse':
      return 'rgba(26, 12, 42, 0.64)';
  }
}

/** One day of a hall's week, as the calendar strip under its name draws it. */
export interface WeekDay {
  /** `0` = Sunday … `6` = Saturday. */
  weekday: number;
  open: boolean;
  today: boolean;
}

/**
 * The hall's week from the game's own week start (the weekly reset's day), each day open or barred
 * and today marked — so the Waning Cellar's three days read at a glance rather than as a list.
 */
export function weekStrip(def: BreweryDef, now: number): WeekDay[] {
  const today = gameWeekday(now, DAILY_RESET_HOUR);
  return Array.from({ length: 7 }, (_, index) => {
    const weekday = (WEEKLY_RESET_WEEKDAY + index) % 7;
    return { weekday, open: def.openDays.includes(weekday), today: weekday === today };
  });
}

/** Who stands in a stage, at what scale, and the one number they add up to. */
export interface StageGuards {
  encounter: EncounterDef;
  guards: { def: EnemyDef; statMult: number }[];
  /** The wave's power, measured the way a champion's is, so it sits beside the team's. */
  power: number;
}

/** A stage's guards, captain first, or null for a stage the registry cannot build. */
export function stageGuards(def: BreweryDef, stage: BreweryStageDef): StageGuards | null {
  const encounter = content.encounterById(breweryEncounterId(def.element, stage.number));
  if (!encounter) return null;
  const guards = encounter.waves
    .flatMap((wave) => wave.enemies)
    .flatMap((spawn) => {
      const enemy = content.enemyById(spawn.enemyId);
      return enemy ? [{ def: enemy, statMult: spawn.statMult ?? 1 }] : [];
    });
  return { encounter, guards, power: enemyPower(encounter) };
}

/** Every stage's guards in the hall of `element`, in stage order — content alone, so built once. */
export function hallGuards(element: Element): (StageGuards | null)[] {
  const def = content.breweries.find((hall) => hall.element === element);
  return def ? def.stages.map((stage) => stageGuards(def, stage)) : [];
}

/** How many guards stand in a card's front row when no captain leads them. */
const FRONT_ROW = 2;

/**
 * A stage's guards as they stand on its card: a captain alone at the front, or the first two, with
 * everyone else a step behind — so four guards fit a narrow card without being cut at its edges.
 */
export function formation<T extends { def: EnemyDef }>(guards: readonly T[]): { front: T[]; back: T[] } {
  const captains = guards.filter((guard) => guard.def.boss);
  const rest = guards.filter((guard) => !guard.def.boss);
  return captains.length > 0
    ? { front: captains, back: rest }
    : { front: rest.slice(0, FRONT_ROW), back: rest.slice(FRONT_ROW) };
}

/** The place a stage is cut under, whose art its card wears. */
export function stageBackdrop(stage: BreweryStageDef): BackdropKey {
  return content.settlementByIndex(stage.settlement)?.backdrop ?? 'bg.bg5';
}

/** The power of the strongest team the roster can seat: its `size` strongest champions together. */
export function bestTeamPower(powers: readonly number[], size: number): number {
  return [...powers]
    .sort((a, b) => b - a)
    .slice(0, size)
    .reduce((sum, power) => sum + power, 0);
}

/** Above this share of the stage's power the team is clearly ahead of it. */
const AHEAD_RATIO = 1.15;
/** Below this share it is behind: a stage it should not expect to farm. */
const BEHIND_RATIO = 0.85;

/** How the strongest team measures up to a stage, as the card's power line colours it. */
export type PowerStanding = 'ahead' | 'close' | 'behind';

export function powerStanding(team: number, stage: number): PowerStanding {
  if (stage <= 0 || team >= stage * AHEAD_RATIO) return 'ahead';
  return team >= stage * BEHIND_RATIO ? 'close' : 'behind';
}
