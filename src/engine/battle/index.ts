/** Public surface of the battle engine (docs/tech/ARCHITECTURE.md §3.2). */
export {
  createBattle,
  type BattleSetup,
  type BattleShaping,
  type PartyMember,
  scaledEnemyStats,
} from './create';
export { step, retreat, runAuto, replay, setControl, setFocus, advanceTurnMeter } from './step';
export { autoDecide, pickTarget, estimateDamage } from './ai';
export { snapshot, type BattleView, type BossUnitView, type UnitView } from './snapshot';
export { effectiveStat, hpFraction, shieldTotal } from './stats';
export {
  damage,
  healing,
  mitigation,
  mitigationK,
  elementMatch,
  elementDamageMod,
  elementCritShift,
  critLands,
  debuffLands,
  ticksToNextTurn,
} from './formulas';
export type * from './types';
