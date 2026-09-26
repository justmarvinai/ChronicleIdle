/** Blots (docs/design/UNWRITTEN.md §9): the stains the Unwritten leaves on the careless. */
import { blot, flat, inflict, onHit, rule, statik } from './dsl';
import type { BlotDef } from './types';

export const BLOTS: readonly BlotDef[] = [
  blot({
    slug: 'smudged_offer',
    icon: 'spell.blood_hex_mark',
    values: { a: 1 },
    grant: ({ a }) => ({ rules: [rule('offer_size', -a)] }),
  }),
  blot({
    slug: 'heavy_ink',
    icon: 'spell.earth_fungal_stone',
    values: { a: 8 },
    grant: ({ a }) => ({ passives: [statik(flat('spd', -a))] }),
  }),
  blot({
    slug: 'bleeding_margin',
    icon: 'spell.blood_bleeding_knife',
    values: { a: 5 },
    grant: ({ a }) => ({ rules: [rule('after_fight_wound', a / 100)] }),
  }),
  blot({
    slug: 'ill_omen',
    icon: 'spell.blood_cursed_beast',
    values: { a: 20 },
    grant: ({ a }) => ({ rules: [rule('elite_hp', a / 100)] }),
  }),
  blot({
    slug: 'torn_purse',
    icon: 'spell.earth_falling_gem',
    values: { a: 30 },
    grant: ({ a }) => ({ rules: [rule('gilt_mult', -a / 100)] }),
  }),
  blot({
    slug: 'frayed_binding',
    icon: 'spell.earth_mossy_stone',
    values: { a: 50 },
    grant: ({ a }) => ({ rules: [rule('rest_heal_mult', -a / 100)] }),
  }),
  blot({
    slug: 'creeping_rot',
    icon: 'spell.blood_toxin_flow',
    values: { a: 15, t: 2 },
    // The rot is in the Unwritten's own foes: their hits carry it into the company.
    grant: ({ a, t }) => ({ foes: [onHit(inflict('poison', t, 'single_enemy', a))] }),
  }),
  blot({
    slug: 'brittle_will',
    icon: 'spell.earth_scorched_plain',
    values: { a: 20 },
    grant: ({ a }) => ({ passives: [statik(flat('res', -a))] }),
  }),
];
