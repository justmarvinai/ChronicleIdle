/**
 * The four inks' illuminations (docs/design/UNWRITTEN.md §7.5): what three inscriptions of an ink
 * grant, and what six grant instead. Carried by every fielded champion.
 */
import {
  damage,
  flat,
  illumination,
  inflict,
  meter,
  mend,
  onHit,
  onKill,
  onTurn,
  onWave,
  statik,
} from './dsl';
import type { IlluminationDef, InkId } from './types';

export const ILLUMINATIONS: Readonly<Record<InkId, IlluminationDef>> = {
  gold: illumination({
    ink: 'gold',
    icon: 'spell.rune_radiance',
    glyph: 'glyph.holy_cross',
    colour: '#e8c15a',
    values: { a: [12, 20] },
    fixed: { t: 2 },
    grant: ({ a, t }, tier) => ({
      passives: [
        onWave(inflict('shield', t, 'self', 100, a), ...(tier === 2 ? [inflict('counter', t, 'self')] : [])),
      ],
    }),
  }),
  crimson: illumination({
    ink: 'crimson',
    icon: 'spell.fire_sun_sigil',
    glyph: 'glyph.flaming_skull',
    colour: '#d4493f',
    values: { a: [12, 12] },
    fixed: { b: 25, c: 20 },
    grant: ({ a, b, c }, tier) => ({
      passives:
        tier === 1
          ? [statik(flat('critRate', a))]
          : [statik(flat('critRate', a), flat('critDmg', b)), onKill(meter(c, 'self'))],
    }),
  }),
  azure: illumination({
    ink: 'azure',
    icon: 'spell.rune_nova_star',
    glyph: 'glyph.peace_dove',
    colour: '#5aa7e8',
    values: { a: [3, 5] },
    fixed: { b: 25 },
    grant: ({ a, b }, tier) => ({
      passives: [
        onTurn(mend(a, 'self')),
        ...(tier === 2 ? [statik({ kind: 'survive_lethal', hpPercent: b, oncePerBattle: true })] : []),
      ],
    }),
  }),
  violet: illumination({
    ink: 'violet',
    icon: 'spell.rune_eclipse_mark',
    glyph: 'glyph.celestial_body',
    colour: '#a070e0',
    values: { a: [15, 25] },
    fixed: { t: 2, b: 20 },
    grant: ({ a, b, t }, tier) => ({
      passives: [
        onHit(inflict('poison', t, 'single_enemy', a)),
        ...(tier === 2 ? [statik(damage(b, { targetHas: 'poison' }))] : []),
      ],
    }),
  }),
};
