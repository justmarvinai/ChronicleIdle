/**
 * Titles (docs/design/ECONOMY.md §4). A title is earned, never bought: each one names a condition
 * the save either meets or does not, so the set is recomputed rather than stored (CLAUDE.md §5.5).
 */
import type { Difficulty } from '@content/balance/battle';

export type TitleCondition =
  /** Reach a chronicle level. */
  | { kind: 'level'; level: number }
  /** Clear every stand of a difficulty. */
  | { kind: 'difficulty_cleared'; difficulty: Difficulty }
  /** Three stars on every stand of a difficulty. */
  | { kind: 'difficulty_mastered'; difficulty: Difficulty }
  /** Beat a settlement's boss on a difficulty. */
  | { kind: 'settlement_boss'; settlement: number; difficulty: Difficulty }
  /** Own this many champions. */
  | { kind: 'champions_owned'; count: number };

export interface TitleDef {
  /** `title.<snake_case>`. */
  id: string;
  /** i18n keys. */
  name: string;
  description: string;
  condition: TitleCondition;
  version: number;
}
