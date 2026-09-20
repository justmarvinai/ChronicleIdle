/**
 * The Chronicle of Changes: the game's own news, written for the person playing it
 * (docs/tech/CONTENT_AUTHORING.md §13). `CHANGELOG.md` is the engineering record and says what
 * moved in the repository; this says what changed in the game, in one sentence per line.
 */

/** What a line is about. It picks the line's icon and its colour. */
export const CHANGE_KINDS = ['added', 'content', 'changed', 'balance', 'fixed'] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];

export interface ChangeDef {
  kind: ChangeKind;
  /** i18n key: one sentence a player understands, never a commit subject. */
  text: string;
  /** The one or two lines of a release worth reading first; the panel calls them out. */
  highlight: boolean;
}

export interface ReleaseDef {
  /** `release.<version with dots as underscores>`, e.g. `release.0_4_2`. */
  id: string;
  /** i18n key: what the release is called, e.g. "The Eternal Tower". */
  name: string;
  /** The version the game shipped under, exactly as `package.json` stamped it. */
  release: string;
  /** The day it shipped, `YYYY-MM-DD`. */
  date: string;
  changes: readonly ChangeDef[];
  /** Content schema version (CLAUDE.md §8), not the game's. */
  version: number;
}
