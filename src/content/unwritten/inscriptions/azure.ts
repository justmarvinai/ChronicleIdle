/**
 * Azure ink — Faith, the Prayer: healing, cleansing, the refusal to fall
 * (docs/design/UNWRITTEN.md §7.4). Volume I first, then the four the Second Volume adds.
 */
import {
  flat,
  inflict,
  inscription,
  mend,
  onDeath,
  onHeal,
  onTurn,
  onWave,
  once,
  pct,
  rule,
  statik,
} from '@content/unwritten/dsl';
import type { InscriptionDef } from '@content/unwritten/types';

export const AZURE: readonly InscriptionDef[] = [
  inscription({
    slug: 'blessed_vigor',
    ink: 'azure',
    rarity: 'common',
    icon: 'spell.earth_frozen_core',
    values: { a: [10, 15, 20] },
    grant: ({ a }) => ({ passives: [statik(pct('hp', a))] }),
  }),
  inscription({
    slug: 'mending_hymn',
    ink: 'azure',
    rarity: 'common',
    icon: 'spell.earth_quartz_beam',
    values: { a: [3, 4, 5] },
    grant: ({ a }) => ({ passives: [onTurn(mend(a, 'self'))] }),
  }),
  inscription({
    slug: 'harvest_hymn',
    ink: 'azure',
    rarity: 'common',
    icon: 'spell.hunt_golden_egg',
    values: { a: [5, 8, 11] },
    // The only inscription that works between fights: it is a rule, not a passive.
    grant: ({ a }) => ({ rules: [rule('heal_after_victory', a / 100)] }),
  }),
  inscription({
    slug: 'regrowth',
    ink: 'azure',
    rarity: 'rare',
    icon: 'spell.fx_verdant_bolt',
    values: { a: [2, 3, 4] },
    grant: ({ a }) => ({ passives: [onWave(inflict('regen', a, 'self'))] }),
  }),
  inscription({
    slug: 'purifying_light',
    ink: 'azure',
    rarity: 'rare',
    icon: 'spell.fx_solar_vortex',
    values: { a: [50, 75, 100] },
    grant: ({ a }) => ({
      passives: [
        onTurn({
          kind: 'conditional',
          if: { selfHpBelow: a },
          then: [{ kind: 'remove_status', target: 'self', which: 'debuffs', count: 1 }],
        }),
      ],
    }),
  }),
  inscription({
    slug: 'martyrs_grace',
    ink: 'azure',
    rarity: 'epic',
    icon: 'spell.blood_pale_priest',
    values: { a: [15, 20, 25] },
    grant: ({ a }) => ({ passives: [onDeath(mend(a, 'all_allies'))] }),
  }),
  inscription({
    slug: 'second_dawn',
    ink: 'azure',
    rarity: 'epic',
    bearer: 'leader',
    icon: 'spell.fire_phoenix_rise',
    values: { a: [30, 40, 50] },
    fixed: { t: 3 },
    grant: ({ a, t }) => ({
      passives: [once(onWave(inflict('revive_on_death', t, 'lowest_hp_ally', 100, a)))],
    }),
  }),
  inscription({
    slug: 'undying_chorus',
    ink: 'azure',
    rarity: 'legendary',
    icon: 'spell.orb_verdant_ring',
    values: { a: [20, 30, 40] },
    grant: ({ a }) => ({ passives: [statik({ kind: 'survive_lethal', hpPercent: a, oncePerBattle: true })] }),
  }),

  // ── Volume II ──
  inscription({
    slug: 'steadfast_soul',
    ink: 'azure',
    rarity: 'common',
    volume: 2,
    icon: 'spell.rune_crystal_shard',
    values: { a: [20, 30, 40] },
    grant: ({ a }) => ({ passives: [statik(flat('res', a))] }),
  }),
  inscription({
    slug: 'mercy',
    ink: 'azure',
    rarity: 'rare',
    volume: 2,
    icon: 'spell.hero_blue_cultist',
    values: { a: [2, 3, 4] },
    grant: ({ a }) => ({ passives: [onHeal({ kind: 'on_heal_grant', status: 'def_up', turns: a })] }),
  }),
  inscription({
    slug: 'kinship_of_azure',
    ink: 'azure',
    rarity: 'rare',
    volume: 2,
    bearer: { element: 'faith' },
    icon: 'spell.hunt_frost_spear',
    values: { a: [12, 18, 24], b: [20, 30, 40] },
    grant: ({ a, b }) => ({ passives: [statik(pct('hp', a), flat('res', b))] }),
  }),
  inscription({
    slug: 'benediction',
    ink: 'azure',
    rarity: 'epic',
    volume: 2,
    bearer: 'leader',
    icon: 'spell.rune_emerald_seal',
    values: { a: [5, 10, 15] },
    fixed: { t: 2 },
    grant: ({ a, t }) => ({
      passives: [
        onWave(
          { kind: 'remove_status', target: 'all_allies', which: 'debuffs', count: 'all' },
          inflict('block_debuffs', t, 'all_allies'),
          mend(a, 'all_allies'),
        ),
      ],
    }),
  }),
];
