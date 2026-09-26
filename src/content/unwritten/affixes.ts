/** Elite and Warden affixes (docs/design/UNWRITTEN.md §6.2): marks the Unwritten puts on a foe. */
import { affix, damage, flat, guard, inflict, mend, onHit, onTurn, statik } from './dsl';
import type { AffixDef } from './types';

export const AFFIXES: readonly AffixDef[] = [
  affix({
    slug: 'vampiric',
    icon: 'spell.blood_nightwing',
    values: { a: 25 },
    passives: ({ a }) => [onHit({ kind: 'lifesteal', percent: a })],
  }),
  affix({
    slug: 'thorned',
    icon: 'spell.fx_thorn_bloom',
    values: { a: 50 },
    passives: ({ a }) => [statik({ kind: 'counterattack', chance: a })],
  }),
  affix({
    slug: 'unyielding',
    icon: 'spell.hero_voidguard',
    values: { a: 30 },
    passives: ({ a }) => [statik({ kind: 'survive_lethal', hpPercent: a, oncePerBattle: true })],
  }),
  affix({
    slug: 'frenzied',
    icon: 'spell.hero_berserker',
    values: { a: 30, h: 50 },
    passives: ({ a, h }) => [statik(damage(a, { selfHpBelow: h }))],
  }),
  affix({
    slug: 'warded',
    icon: 'spell.crest_ember_shield',
    values: { a: 20 },
    passives: ({ a }) => [statik(guard(a))],
  }),
  affix({
    slug: 'swift',
    icon: 'spell.hunt_bird_flight',
    values: { a: 15 },
    passives: ({ a }) => [statik(flat('spd', a))],
  }),
  affix({
    slug: 'regenerating',
    icon: 'spell.earth_crystal_bloom',
    values: { a: 5 },
    passives: ({ a }) => [onTurn(mend(a, 'self'))],
  }),
  affix({
    slug: 'hexing',
    icon: 'spell.blood_hex_circle',
    values: { a: 35, t: 2 },
    passives: ({ a, t }) => [onHit(inflict('weaken', t, 'single_enemy', a))],
  }),
];
