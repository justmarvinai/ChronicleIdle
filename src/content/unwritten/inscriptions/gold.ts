/**
 * Gold ink — Justice, the Law: protection, retribution, judgement (docs/design/UNWRITTEN.md §7.4).
 * Volume I first, then the four the Scriptorium's Second Volume adds.
 */
import {
  damage,
  guard,
  inflict,
  inscription,
  onAllyHit,
  onDeath,
  onHitTaken,
  onWave,
  pct,
  statik,
} from '@content/unwritten/dsl';
import type { InscriptionDef } from '@content/unwritten/types';

export const GOLD: readonly InscriptionDef[] = [
  inscription({
    slug: 'oath_of_iron',
    ink: 'gold',
    rarity: 'common',
    icon: 'spell.earth_slate_slabs',
    values: { a: [10, 15, 20] },
    grant: ({ a }) => ({ passives: [statik(pct('def', a))] }),
  }),
  inscription({
    slug: 'vow_of_the_wall',
    ink: 'gold',
    rarity: 'common',
    icon: 'spell.earth_stone_ring',
    values: { a: [8, 12, 16] },
    grant: ({ a }) => ({ passives: [statik(pct('hp', a))] }),
  }),
  inscription({
    slug: 'stalwart',
    ink: 'gold',
    rarity: 'common',
    icon: 'spell.hero_warrior_stand',
    values: { a: [6, 9, 12] },
    grant: ({ a }) => ({ passives: [statik(guard(a))] }),
  }),
  inscription({
    slug: 'first_light',
    ink: 'gold',
    rarity: 'rare',
    icon: 'spell.fx_golden_eruption',
    values: { a: [10, 15, 20] },
    fixed: { t: 2 },
    // A shield's value is a share of its placer's max HP: here, the champion's own.
    grant: ({ a, t }) => ({ passives: [onWave(inflict('shield', t, 'self', 100, a))] }),
  }),
  inscription({
    slug: 'retribution',
    ink: 'gold',
    rarity: 'rare',
    icon: 'spell.earth_stone_spike',
    values: { a: [20, 30, 40] },
    grant: ({ a }) => ({ passives: [statik({ kind: 'counterattack', chance: a })] }),
  }),
  inscription({
    slug: 'sentence',
    ink: 'gold',
    rarity: 'epic',
    icon: 'spell.weapon_ceremonial_mace',
    values: { a: [20, 30, 40] },
    fixed: { h: 30 },
    grant: ({ a, h }) => ({ passives: [statik(damage(a, { targetHpBelow: h }))] }),
  }),
  inscription({
    slug: 'verdict',
    ink: 'gold',
    rarity: 'epic',
    icon: 'spell.earth_rune_arch',
    values: { a: [25, 35, 45] },
    fixed: { t: 2 },
    grant: ({ a, t }) => ({ passives: [onHitTaken(inflict('weaken', t, 'attacker', a))] }),
  }),
  inscription({
    slug: 'the_last_word',
    ink: 'gold',
    rarity: 'legendary',
    icon: 'spell.fire_sunburst',
    values: { a: [25, 35, 45] },
    fixed: { t: 2 },
    grant: ({ a, t }) => ({
      passives: [onDeath(inflict('shield', t, 'all_allies', 100, a), inflict('counter', t, 'all_allies'))],
    }),
  }),

  // ── Volume II ──
  inscription({
    slug: 'shieldbearers_rite',
    ink: 'gold',
    rarity: 'rare',
    volume: 2,
    bearer: 'leader',
    icon: 'spell.crest_warded_shield',
    values: { a: [15, 20, 25] },
    fixed: { h: 35, t: 2 },
    grant: ({ a, h, t }) => ({
      passives: [
        onAllyHit({
          kind: 'shield_ally_below',
          hpPercent: h,
          shield: a,
          turns: t,
          oncePerAllyPerWave: true,
        }),
      ],
    }),
  }),
  inscription({
    slug: 'kinship_of_gold',
    ink: 'gold',
    rarity: 'rare',
    volume: 2,
    bearer: { element: 'justice' },
    icon: 'spell.earth_gilded_rock',
    values: { a: [12, 18, 24] },
    grant: ({ a }) => ({ passives: [statik(pct('hp', a), pct('def', a))] }),
  }),
  inscription({
    slug: 'aegis_oath',
    ink: 'gold',
    rarity: 'epic',
    volume: 2,
    icon: 'spell.earth_runestone_disc',
    values: { a: [2, 3, 3], b: [2, 2, 3] },
    grant: ({ a, b }) => ({
      passives: [onWave(inflict('def_up', a, 'self'), inflict('counter', b, 'self'))],
    }),
  }),
  inscription({
    slug: 'unbending',
    ink: 'gold',
    rarity: 'epic',
    volume: 2,
    icon: 'spell.hero_stone_golem',
    values: { a: [20, 28, 36] },
    fixed: { h: 40 },
    grant: ({ a, h }) => ({ passives: [statik(guard(a, { selfHpBelow: h }))] }),
  }),
];
