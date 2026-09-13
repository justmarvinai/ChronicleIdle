/** Every faction roster, in settlement order. */
import type { FactionDef } from '@content/enemies/faction';
import f01 from './01_thornwood_bandits';
import f02 from './02_blighted_wildlife';
import f03 from './03_greyhaven_corsairs';
import f04 from './04_sand_cult';
import f05 from './05_kingsroad_deserters';
import f06 from './06_restless_dead';
import f07 from './07_ashen_legion';
import f08 from './08_frostvein_tribe';
import f09 from './09_gladiator_shades';
import f10 from './10_marsh_horrors';
import f11 from './11_citadel_knights';
import f12 from './12_eclipse_cult';

export const FACTIONS: readonly FactionDef[] = [f01, f02, f03, f04, f05, f06, f07, f08, f09, f10, f11, f12];

export const FACTION_BY_ID: Readonly<Record<string, FactionDef>> = Object.fromEntries(
  FACTIONS.map((f) => [f.id, f]),
);
