/**
 * The Unwritten's Wardens (docs/design/UNWRITTEN.md §6.3): the bosses that hold the end of each
 * folio. Each is a champion the Unwritten has twisted, drawn in that champion's own sheet as an
 * Echo (`ECHO_INK`), with a boss's rotation, phases and immunities. Stats are at Intro, stage 0;
 * the Omen curve and the folio's `wardenScale` do the rest.
 */
import { cleanse, heal, hit, status } from '@content/champions/dsl';
import { defineEnemy } from '@content/enemies/dsl';
import type { EnemyDef } from '@content/enemies/types';

/** What no Warden can be held by: a boss is a fight, not a lock. */
const WARDEN_IMMUNITIES = ['stun', 'freeze', 'sleep', 'fear'] as const;

/** Folio I — a knight drowned in ink, who keeps the oath he was written with. */
export const INK_DROWNED_KNIGHT: EnemyDef = defineEnemy({
  id: 'enemy.unwritten_ink_drowned_knight',
  archetype: 'boss',
  element: 'justice',
  role: 'defense',
  stats: [2_600, 90, 110, 88, 10, 50, 60, 40],
  art: { model: 'model.khazgor', echo: true, scale: 1.3 },
  abilities: [
    {
      slot: 'a1',
      key: 'drowning_blade',
      icon: 'spell.weapon_frost_axe',
      effects: [hit(3.0), status('weaken', 2, { chance: 30 })],
    },
    {
      slot: 'a2',
      key: 'black_tide',
      icon: 'spell.fx_frost_comet',
      cooldown: 3,
      effects: [hit(2.2, 'all_enemies'), status('spd_down', 2, { target: 'all_enemies', chance: 40 })],
    },
    {
      slot: 'a3',
      key: 'oath_unwritten',
      icon: 'spell.crest_stone_guard',
      cooldown: 4,
      startsOnCooldown: true,
      effects: [
        status('shield', 2, { target: 'self', value: 25 }),
        status('counter', 2, { target: 'self' }),
        status('provoke', 1, { target: 'all_enemies', chance: 50 }),
      ],
    },
    {
      slot: 'a4',
      key: 'undertow',
      icon: 'spell.orb_frostwind',
      cooldown: 3,
      minPhase: 2,
      effects: [hit(2.8, 'all_enemies'), status('weaken', 2, { target: 'all_enemies', chance: 50 })],
    },
  ],
  boss: {
    rotation: ['a1', 'a2', 'a4', 'a1', 'a3'],
    immunities: [...WARDEN_IMMUNITIES],
    enrageAfterTurn: 14,
    damageTakenMult: 1,
    phases: [0.5],
  },
});

/** The Hollow Cantor's choir: they fall, and are sung back up. */
export const INKLING_CHORISTER: EnemyDef = defineEnemy({
  id: 'enemy.unwritten_inkling_chorister',
  archetype: 'mender',
  element: 'faith',
  role: 'support',
  stats: [900, 60, 55, 100, 5, 50, 40, 40],
  art: { tint: '#3b2a5c', scale: 0.9 },
  abilities: [
    {
      slot: 'a1',
      key: 'ink_hymn',
      icon: 'spell.blood_soul_ribbon',
      effects: [hit(2.4), status('poison', 2, { chance: 25 })],
    },
  ],
});

/** Folio II — the hooded cantor who leads a choir that will not stay dead. */
export const HOLLOW_CANTOR: EnemyDef = defineEnemy({
  id: 'enemy.unwritten_hollow_cantor',
  archetype: 'boss',
  element: 'faith',
  role: 'support',
  stats: [2_300, 85, 80, 95, 10, 50, 70, 50],
  art: { model: 'model.rattledagger', echo: true, scale: 1.3 },
  abilities: [
    {
      slot: 'a1',
      key: 'dirge',
      icon: 'spell.blood_skull',
      effects: [hit(3.0), status('heal_reduction', 2, { chance: 60 })],
    },
    {
      slot: 'a2',
      key: 'chorus_of_ink',
      icon: 'spell.blood_toxin_flow',
      cooldown: 3,
      effects: [hit(2.0, 'all_enemies'), status('poison', 2, { target: 'all_enemies', chance: 40 })],
    },
    {
      slot: 'a3',
      key: 'requiem',
      icon: 'spell.icon_meditation',
      cooldown: 4,
      startsOnCooldown: true,
      effects: [heal(0.15, 'self', 'CASTER_MAX_HP'), cleanse('self', 'all')],
    },
  ],
  boss: {
    rotation: ['a1', 'a2', 'a1', 'a3'],
    immunities: [...WARDEN_IMMUNITIES],
    enrageAfterTurn: 16,
    damageTakenMult: 1,
    adds: {
      enemyId: 'enemy.unwritten_inkling_chorister',
      count: 2,
      guardPercent: 20,
      reviveEvery: 3,
      revivedHpPercent: 50,
    },
  },
});

/** Folio III — the scribe who unwrites: the last Warden of the Unwritten. */
export const UNWRITER: EnemyDef = defineEnemy({
  id: 'enemy.unwritten_unwriter',
  archetype: 'boss',
  element: 'eclipse',
  role: 'attack',
  stats: [2_800, 105, 80, 98, 20, 70, 60, 60],
  art: { model: 'model.darius', echo: true, scale: 1.45 },
  abilities: [
    {
      slot: 'a1',
      key: 'erase',
      icon: 'spell.blood_void_lance',
      effects: [hit(3.4), { kind: 'steal_buff', target: 'single_enemy', count: 1 }],
    },
    {
      slot: 'a2',
      key: 'blot_out',
      icon: 'spell.orb_voidspiral',
      cooldown: 3,
      effects: [hit(2.4, 'all_enemies'), status('block_buffs', 2, { target: 'all_enemies', chance: 60 })],
    },
    {
      slot: 'a3',
      key: 'rewrite',
      icon: 'spell.rune_eclipse_mark',
      cooldown: 4,
      minPhase: 2,
      effects: [
        heal(0.1, 'self', 'CASTER_MAX_HP'),
        cleanse('self', 'all'),
        status('atk_up', 2, { target: 'self' }),
      ],
    },
    {
      slot: 'a4',
      key: 'the_last_line',
      icon: 'spell.fire_void_flame',
      cooldown: 4,
      minPhase: 3,
      effects: [hit(3.0, 'all_enemies', { defIgnore: 0.3 })],
    },
  ],
  boss: {
    rotation: ['a1', 'a2', 'a3', 'a1', 'a4'],
    immunities: [...WARDEN_IMMUNITIES],
    enrageAfterTurn: 20,
    damageTakenMult: 1,
    phases: [0.7, 0.35],
  },
});

/** Every enemy the Unwritten fields that the campaign does not. */
export const UNWRITTEN_ENEMIES: readonly EnemyDef[] = [
  INK_DROWNED_KNIGHT,
  INKLING_CHORISTER,
  HOLLOW_CANTOR,
  UNWRITER,
];
