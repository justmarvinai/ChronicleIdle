/** Every settlement, in campaign order (explicit imports, like champions/index.ts). */
import s01 from './01_thornwood_crossing';
import s02 from './02_millbrook_fields';
import s03 from './03_greyhaven_harbor';
import s04 from './04_sunspire_bazaar';
import s05 from './05_old_kingsroad';
import s06 from './06_barrowdeep';
import s07 from './07_ashfall_plains';
import s08 from './08_frostvein_pass';
import s09 from './09_sunken_colosseum';
import s10 from './10_duskmere_marsh';
import s11 from './11_ironcrag_citadel';
import s12 from './12_eclipse_gate';
import type { SettlementDef, StageDef } from './types';

export const SETTLEMENTS: readonly SettlementDef[] = [
  s01,
  s02,
  s03,
  s04,
  s05,
  s06,
  s07,
  s08,
  s09,
  s10,
  s11,
  s12,
];

export const SETTLEMENT_BY_ID: Readonly<Record<string, SettlementDef>> = Object.fromEntries(
  SETTLEMENTS.map((s) => [s.id, s]),
);
export const SETTLEMENT_BY_INDEX: Readonly<Record<number, SettlementDef>> = Object.fromEntries(
  SETTLEMENTS.map((s) => [s.index, s]),
);

/** Every stage of every settlement, flattened, in campaign order. */
export const STAGES: readonly StageDef[] = SETTLEMENTS.flatMap((s) => s.stages);
export const STAGE_BY_ID: Readonly<Record<string, StageDef>> = Object.fromEntries(
  STAGES.map((s) => [s.id, s]),
);
/** Stage id → the settlement it belongs to. */
export const SETTLEMENT_OF_STAGE: Readonly<Record<string, SettlementDef>> = Object.fromEntries(
  SETTLEMENTS.flatMap((s) => s.stages.map((stage) => [stage.id, s])),
);
