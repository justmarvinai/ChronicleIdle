/**
 * Crimson ink — Valor, the Blade: damage, criticals, momentum (docs/design/UNWRITTEN.md §7.4).
 * Volume I first, then the four the Scriptorium's Second Volume adds.
 */
import {
  damage,
  flat,
  inflict,
  inscription,
  meter,
  onHit,
  onKill,
  onWave,
  pct,
  statik,
} from '@content/unwritten/dsl';
import type { InscriptionDef } from '@content/unwritten/types';

export const CRIMSON: readonly InscriptionDef[] = [
  inscription({
    slug: 'bloodlust',
    ink: 'crimson',
    rarity: 'common',
    icon: 'spell.fx_crimson_shock',
    values: { a: [10, 15, 20] },
    grant: ({ a }) => ({ passives: [statik(pct('atk', a))] }),
  }),
  inscription({
    slug: 'keen_edge',
    ink: 'crimson',
    rarity: 'common',
    icon: 'spell.earth_stone_blade',
    values: { a: [8, 12, 16] },
    grant: ({ a }) => ({ passives: [statik(flat('critRate', a))] }),
  }),
  inscription({
    slug: 'savagery',
    ink: 'crimson',
    rarity: 'common',
    icon: 'spell.fire_crimson_swirl',
    values: { a: [8, 12, 16] },
    grant: ({ a }) => ({ passives: [statik(damage(a))] }),
  }),
  inscription({
    slug: 'cruel_strokes',
    ink: 'crimson',
    rarity: 'rare',
    icon: 'spell.weapon_runeblade',
    values: { a: [20, 30, 40] },
    grant: ({ a }) => ({ passives: [statik(flat('critDmg', a))] }),
  }),
  inscription({
    slug: 'momentum',
    ink: 'crimson',
    rarity: 'rare',
    icon: 'spell.fire_searing_streak',
    values: { a: [20, 30, 40] },
    grant: ({ a }) => ({ passives: [onKill(meter(a, 'self'))] }),
  }),
  inscription({
    slug: 'berserkers_due',
    ink: 'crimson',
    rarity: 'epic',
    icon: 'spell.fire_immolation',
    // `missing_hp_10` counts every tenth of HP missing: the line's "every {s} %".
    values: { a: [3, 4, 5], b: [30, 40, 50] },
    fixed: { s: 10 },
    grant: ({ a, b }) => ({
      passives: [statik({ kind: 'damage_bonus_per', per: 'missing_hp_10', value: a / 100, max: b / 100 })],
    }),
  }),
  inscription({
    slug: 'headsman',
    ink: 'crimson',
    rarity: 'epic',
    icon: 'spell.weapon_magma_sword',
    values: { a: [20, 30, 40] },
    fixed: { h: 50 },
    grant: ({ a, h }) => ({ passives: [statik(damage(a, { targetHpBelow: h }, 'crit'))] }),
  }),
  inscription({
    slug: 'frenzy_of_valor',
    ink: 'crimson',
    rarity: 'legendary',
    icon: 'spell.fire_firenado',
    values: { a: [10, 15, 20] },
    grant: ({ a }) => ({ passives: [onKill({ kind: 'extra_turn', target: 'self' }), statik(damage(a))] }),
  }),

  // ── Volume II ──
  inscription({
    slug: 'opening_salvo',
    ink: 'crimson',
    rarity: 'rare',
    volume: 2,
    icon: 'spell.fire_flame_volley',
    values: { a: [2, 3, 4] },
    grant: ({ a }) => ({ passives: [onWave(inflict('atk_up', a, 'self'))] }),
  }),
  inscription({
    slug: 'bleeding_edge',
    ink: 'crimson',
    rarity: 'rare',
    volume: 2,
    icon: 'spell.blood_vein_crack',
    values: { a: [15, 25, 35] },
    fixed: { t: 2 },
    grant: ({ a, t }) => ({ passives: [onHit(inflict('bleed', t, 'single_enemy', a))] }),
  }),
  inscription({
    slug: 'kinship_of_crimson',
    ink: 'crimson',
    rarity: 'rare',
    volume: 2,
    bearer: { element: 'valor' },
    icon: 'spell.fire_dragon_roar',
    values: { a: [12, 18, 24], b: [5, 8, 10] },
    grant: ({ a, b }) => ({ passives: [statik(pct('atk', a), flat('critRate', b))] }),
  }),
  inscription({
    slug: 'relentless',
    ink: 'crimson',
    rarity: 'epic',
    volume: 2,
    icon: 'spell.fire_flame_lance',
    values: { a: [6, 9, 12] },
    grant: ({ a }) => ({ passives: [statik({ kind: 'extra_turn_chance', chance: a })] }),
  }),
];
