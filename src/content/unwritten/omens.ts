/**
 * The Omen ladder (docs/design/UNWRITTEN.md §13): sixteen rungs, each raising the curve and adding
 * its twist to every twist below it. The curve itself is `OMEN_SCALE` in `balance/unwritten.ts`.
 */
import { OMEN_SCALE } from '@content/balance/unwritten';
import { omen, rule } from './dsl';
import type { OmenDef, RuleEffect } from './types';

/** Each rung's own twist, by Omen. */
const TWISTS: readonly (readonly [string, readonly RuleEffect[]])[] = [
  ['the_first_page', []],
  ['hardened_echoes', [rule('enemy_hp', 0.1)]],
  ['sharper_quills', [rule('enemy_atk', 0.1)]],
  ['bitter_ink', [rule('rest_heal', 0.3)]],
  ['marked_elites', [rule('elite_affixes', 1)]],
  ['a_stain_remembered', [rule('start_blots', 1)]],
  ['quickened_dark', [rule('enemy_spd', 6)]],
  ['the_peddlers_greed', [rule('price_mult', 0.25)]],
  ['wardens_stir', [rule('warden_hp', 0.2), rule('warden_affixes', 1)]],
  ['a_worn_company', [rule('start_hp', 0.8)]],
  ['crowded_margins', [rule('skirmish_extra_foe', 1)]],
  ['fading_light', [rule('rest_heal', 0.25)]],
  ['thrice_marked', [rule('elite_affixes', 1)]],
  ['eclipse_rising', [rule('enemy_hp', 0.1), rule('enemy_atk', 0.1)]],
  ['no_quarter', [rule('rekindle_mult', -0.5)]],
  ['the_blotted_heart', [rule('unwriter_hp', 0.3), rule('unwriter_last_phase', 0.5)]],
];

export const OMENS: readonly OmenDef[] = TWISTS.map(([slug, rules], index) =>
  omen({ omen: index, slug, scale: OMEN_SCALE[index] ?? 1, rules }),
);
