/** The Unwritten's engine (docs/design/UNWRITTEN.md): pure, seeded, and written into the slice it is handed. */
export {
  chooseEcho,
  chooseMystery,
  chooseOffer,
  chooseRelic,
  meets,
  peddlerServices,
  rekindleShare,
  rerollOffer,
  restShare,
  usePeddler,
  useRekindleToken,
  useShrine,
} from './choices';
export type { PeddlerAction, ShrineAction } from './choices';
export { championOf, companyStanding, fallenMembers, isStanding, standing, standingOf } from './company';
export { emptyReceipt, type UnwrittenCtx, type UnwrittenReceipt } from './context';
export { depthOf, passageFight, unwrittenEncounterId } from './encounter';
export { planFight, settleFight, type FightPlan } from './fight';
export {
  abandonExpedition,
  beginExpedition,
  currentRun,
  enterPassage,
  passageOf,
  peddlerPrice,
  rulesNow,
  type BeginInput,
} from './lifecycle';
export { WARDEN_PASSAGE, WARDEN_ROW, drawFolio, reachable } from './map';
export { drawOffer, inkCounts } from './offers';
export { bankedPages, pagesMultiplier, passagePages, titheLeft, titheOf } from './rewards';
export { combineRules, expeditionRules, groundRules, type Rules } from './rules';
export { SHELF_KEY, folioState, shelfOpen, writeFolio, type FolioState } from './scriptorium';
export { companyShaping, echoRoster, illuminationTiers } from './shaping';
export type { UnwrittenWorld } from './world';
