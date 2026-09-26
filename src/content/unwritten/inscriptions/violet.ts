/**
 * Violet ink — Eclipse, the Hunger: poison, hexes, stolen time (docs/design/UNWRITTEN.md §7.4).
 * Volume I first, then the four the Scriptorium's Second Volume adds.
 */
import { STATUS_DEFAULT_VALUE } from '@content/balance/battle';
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

export const VIOLET: readonly InscriptionDef[] = [
  inscription({
    slug: 'siphon',
    ink: 'violet',
    rarity: 'common',
    icon: 'spell.blood_fountain',
    values: { a: [6, 9, 12] },
    grant: ({ a }) => ({ passives: [onHit({ kind: 'lifesteal', percent: a })] }),
  }),
  inscription({
    slug: 'venom_ink',
    ink: 'violet',
    rarity: 'common',
    icon: 'spell.hunt_venom_flask',
    values: { a: [15, 22, 30] },
    fixed: { t: 2 },
    grant: ({ a, t }) => ({ passives: [onHit(inflict('poison', t, 'single_enemy', a))] }),
  }),
  inscription({
    slug: 'plague_bearer',
    ink: 'violet',
    rarity: 'common',
    bearer: 'leader',
    icon: 'spell.blood_plague_drake',
    values: { a: [30, 45, 60] },
    grant: ({ a }) => ({ passives: [statik({ kind: 'enemy_heal_reduction', value: a })] }),
  }),
  inscription({
    slug: 'malediction',
    ink: 'violet',
    rarity: 'rare',
    icon: 'spell.blood_corruption',
    values: { a: [5, 7, 9], b: [25, 35, 45] },
    grant: ({ a, b }) => ({
      passives: [statik({ kind: 'damage_bonus_per', per: 'target_debuff', value: a / 100, max: b / 100 })],
    }),
  }),
  inscription({
    slug: 'hex_of_weakness',
    ink: 'violet',
    rarity: 'rare',
    icon: 'spell.earth_serpent_eye',
    values: { a: [12, 18, 24] },
    fixed: { t: 2 },
    grant: ({ a, t }) => ({ passives: [onHit(inflict('weaken', t, 'single_enemy', a))] }),
  }),
  inscription({
    slug: 'nightfall',
    ink: 'violet',
    rarity: 'epic',
    bearer: 'leader',
    icon: 'spell.fire_basilisk_eye',
    values: { a: [15, 20, 25] },
    grant: ({ a }) => ({ passives: [onWave(meter(-a, 'all_enemies'))] }),
  }),
  inscription({
    slug: 'blood_pact',
    ink: 'violet',
    rarity: 'epic',
    icon: 'spell.blood_altar',
    values: { a: [20, 28, 36] },
    fixed: { c: 10 },
    grant: ({ a, c }) => ({ passives: [statik(pct('hp', -c), damage(a))] }),
  }),
  inscription({
    slug: 'the_black_page',
    ink: 'violet',
    rarity: 'legendary',
    icon: 'spell.fire_inferno_eye',
    values: { a: [50, 75, 100], b: [20, 25, 30] },
    fixed: { t: 2 },
    grant: ({ a, b, t }) => ({
      passives: [
        // A poison this champion places ticks `a` % harder than the table's own.
        statik({
          kind: 'status_value_override',
          status: 'poison',
          value: STATUS_DEFAULT_VALUE.poison * (1 + a / 100),
        }),
        onHit(inflict('poison', t, 'single_enemy', b)),
      ],
    }),
  }),

  // ── Volume II ──
  inscription({
    slug: 'death_knell',
    ink: 'violet',
    rarity: 'rare',
    volume: 2,
    icon: 'spell.hunt_night_flock',
    values: { a: [50, 75, 100] },
    fixed: { t: 2 },
    grant: ({ a, t }) => ({ passives: [onKill(inflict('poison', t, { adjacent_to_target: 1 }, a))] }),
  }),
  inscription({
    slug: 'creeping_dread',
    ink: 'violet',
    rarity: 'rare',
    volume: 2,
    bearer: 'leader',
    icon: 'spell.hunt_crow_swarm',
    values: { a: [40, 55, 70] },
    fixed: { t: 2 },
    grant: ({ a, t }) => ({ passives: [onWave(inflict('spd_down', t, 'all_enemies', a))] }),
  }),
  inscription({
    slug: 'kinship_of_violet',
    ink: 'violet',
    rarity: 'rare',
    volume: 2,
    bearer: { element: 'eclipse' },
    icon: 'spell.rune_trident_mark',
    values: { a: [12, 18, 24], b: [10, 15, 20] },
    grant: ({ a, b }) => ({ passives: [statik(pct('atk', a), flat('acc', b))] }),
  }),
  inscription({
    slug: 'sapping_touch',
    ink: 'violet',
    rarity: 'epic',
    volume: 2,
    icon: 'spell.fire_frostfire',
    values: { a: [20, 28, 36] },
    fixed: { m: 10 },
    grant: ({ a, m }) => ({ passives: [onHit(meter(-m, 'single_enemy', a))] }),
  }),
];
