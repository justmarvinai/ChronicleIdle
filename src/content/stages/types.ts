/**
 * Campaign content types (docs/design/CAMPAIGN.md §1, §8). A settlement is authored once and the
 * three difficulties are derived from it, so a stage is a wave list plus its limits — never three
 * near-copies.
 */
import type { BackdropKey } from '@assets/manifest.generated';
import type { Element } from '@content/champions/types';

export interface StageDef {
  /** `stage.<settlement:02>.<stage:02>`, e.g. `stage.03.07`. */
  id: string;
  /** 1..10 inside its settlement. */
  number: number;
  /** Enemy ids per wave, in slot order. */
  waves: readonly (readonly string[])[];
  /** Stage 10: the settlement's named boss leads the last wave. */
  boss: boolean;
  /** Ally turns for the third star, and the limit past which the run is lost. */
  turnLimit3Star: number;
  turnLimitDefeat: number;
}

export interface SettlementDef {
  /** `settlement.<index:02>.<slug>`. */
  id: string;
  /** 1..12; drives enemy scaling, energy cost and the unlock chain. */
  index: number;
  /** i18n keys. */
  name: string;
  description: string;
  /** `faction.<slug>` — its roster fills the waves. */
  faction: string;
  /** Dominant element: which champions the settlement rewards bringing. */
  element: Element;
  backdrop: BackdropKey;
  /** Colour grade over the backdrop, so reused art reads as a different place. */
  grade: string;
  music: 'battle' | 'boss';
  surface: 'dirt' | 'stone' | 'water' | 'wood';
  /** Gear sets this settlement favours when a gear drop lands (Phase 6). */
  setPool: readonly string[];
  /** Exactly ten stages. */
  stages: readonly StageDef[];
  version: number;
}
