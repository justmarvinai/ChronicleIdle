/**
 * The fourteen EA-0.1 gear sets (docs/design/GEAR.md §5), one file each. Eight two-piece sets are
 * flat stat bonuses; six four-piece sets carry behaviour, all of it expressed with the passive
 * vocabulary from `BATTLE.md` §6.
 */
import type { GearSetDef } from './types';
import bulwark from './bulwark';
import emberGuard from './ember_guard';
import executioner from './executioner';
import immortal from './immortal';
import ironhide from './ironhide';
import keenEye from './keen_eye';
import lifedrinker from './lifedrinker';
import relentless from './relentless';
import retaliation from './retaliation';
import stunlock from './stunlock';
import swiftfoot from './swiftfoot';
import truesight from './truesight';
import warcry from './warcry';
import warding from './warding';

export const GEAR_SETS: readonly GearSetDef[] = [
  emberGuard,
  ironhide,
  warcry,
  swiftfoot,
  keenEye,
  executioner,
  warding,
  truesight,
  lifedrinker,
  retaliation,
  relentless,
  immortal,
  stunlock,
  bulwark,
];

export const GEAR_SET_BY_ID: Readonly<Record<string, GearSetDef>> = Object.fromEntries(
  GEAR_SETS.map((s) => [s.id, s]),
);
