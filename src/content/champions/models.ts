/**
 * Which way each model sheet is drawn (docs/tech/ASSETS.md §2).
 *
 * Facing is a property of the *art*, not of the champion wearing it: two champions on one sheet
 * cannot disagree about which way it points, and a champion that changes model must not have to
 * remember to change anything else. So it is declared once, here, and read twice — the asset
 * pipeline stamps it into the manifest (`tools/assets/steps/models.ts`, for `SpriteView`) and
 * `defineChampion`/`enemy()` resolve it for the battle stage.
 *
 * Every finished sheet under `/game/assets/champions` is drawn facing **right**; the placeholder
 * lizard under `/game/assets/enemies` faces **left**. That is why the stage mirrors an ally lizard
 * and leaves an enemy one alone, and does the opposite for every named champion.
 *
 * `satisfies Record<ModelKey, …>` is the guard: a new sheet in `/game` adds a `ModelKey`, and the
 * build fails here until somebody has looked at the art and said which way it faces. Five of the
 * eight were wrong before that guard existed, and every screen that draws a champion showed them
 * backwards.
 */
import type { ModelKey } from '@assets/manifest.generated';

export type Facing = 'left' | 'right';

export const MODEL_FACING = {
  'model.anuria': 'right',
  'model.bran': 'right',
  'model.corvin': 'right',
  'model.darius': 'right',
  /* The Gargoyle crouches with its horned snout to the left; the tail curls away to the right. */
  'model.gargoyle': 'left',
  'model.khazgor': 'right',
  'model.maelis': 'right',
  'model.maruan': 'right',
  'model.rattledagger': 'right',
  'model.reva': 'right',
  'model.sethlurias': 'right',
  'model.teritorial_lizard': 'left',
  'model.thordakk': 'right',
  /* The Titan holds its hammer out to the left and turns its head after it. */
  'model.titan': 'left',
  /* Varkos stands as every champion sheet does, crown and shoulder leading to the right. */
  'model.varkos': 'right',
} as const satisfies Record<ModelKey, Facing>;

/** The way a sheet is drawn; the stage mirrors it when the unit's side wants the other way. */
export const facingOf = (model: ModelKey): Facing => MODEL_FACING[model];

/** The stand-in every unit without finished art wears (`CLAUDE.md` §2.7). */
export const PLACEHOLDER_MODEL = 'model.teritorial_lizard' satisfies ModelKey;
