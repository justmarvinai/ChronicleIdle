/**
 * The six enemy archetypes every faction re-skins (docs/design/CAMPAIGN.md §5). Stats are the
 * Intro, stage-index-0 bases; the encounter scales them (BATTLE.md §4.5).
 *
 * Kits are shared: a faction's Cutpurse and another's Corsair Cutlass swing the same ability, so
 * ability ids and strings live once per archetype (`ab.arch.raider.cleave`) and a faction unit
 * only brings its own name, element and tint. A faction that needs a genuinely new mechanic gets
 * a named enemy of its own instead (the stage bosses do).
 */
import { heal, hit, status } from '@content/champions/dsl';
import type { AbilityAi, AbilitySlot, Effect, Role } from '@content/champions/types';
import type { SpellKey } from '@assets/manifest.generated';
import type { FactionArchetype } from './types';

export interface ArchetypeAbility {
  slot: AbilitySlot;
  /** Shared key: the ability's id is `ab.arch.<archetype>.<key>`. */
  key: string;
  icon: SpellKey;
  cooldown?: number;
  effects: Effect[];
  ai?: AbilityAi;
}

export interface ArchetypeKit {
  role: Role;
  /** HP / ATK / DEF / SPD / C.RATE / C.DMG / RES / ACC. */
  stats: [number, number, number, number, number, number, number, number];
  /** Sprite scale relative to a rank-and-file unit. */
  scale?: number;
  abilities: ArchetypeAbility[];
}

export const ARCHETYPES: Readonly<Record<FactionArchetype, ArchetypeKit>> = {
  /** Plain damage, a heavier swing every third turn. */
  raider: {
    role: 'attack',
    stats: [900, 100, 60, 92, 10, 50, 10, 10],
    abilities: [
      { slot: 'a1', key: 'cleave', icon: 'spell.weapon_hatchet', effects: [hit(3.0)] },
      {
        slot: 'a2',
        key: 'reckless_swing',
        icon: 'spell.weapon_cleaver_axe',
        cooldown: 3,
        effects: [hit(4.2)],
      },
    ],
  },
  /** Fast and fragile; picks off the weakest and rakes the party every fourth turn. */
  marksman: {
    role: 'attack',
    stats: [775, 105, 50, 98, 15, 60, 10, 15],
    abilities: [
      {
        slot: 'a1',
        key: 'quick_shot',
        icon: 'spell.hunt_crossbow',
        effects: [hit(3.2)],
        ai: { priority: 1, prefer: 'lowest_hp_percent' },
      },
      {
        slot: 'a2',
        key: 'scatter_volley',
        icon: 'spell.hunt_arrow_storm',
        cooldown: 4,
        effects: [hit(2.2, 'all_enemies')],
      },
    ],
  },
  /** Big HP, Weaken on the basic, a stunning slam. */
  brute: {
    role: 'health',
    stats: [1_700, 85, 70, 86, 10, 50, 15, 5],
    scale: 1.1,
    abilities: [
      {
        slot: 'a1',
        key: 'club',
        icon: 'spell.skill_iron_fist',
        effects: [hit(2.8), status('weaken', 2, { chance: 25, value: 15 })],
      },
      {
        slot: 'a2',
        key: 'earthshaker',
        icon: 'spell.skill_titan_fist',
        cooldown: 4,
        effects: [hit(5.0), status('stun', 1, { chance: 30 })],
      },
    ],
  },
  /** DEF-scaling hits; buffs the line and provokes the party onto itself. */
  warden: {
    role: 'defense',
    stats: [1_225, 70, 125, 88, 10, 50, 20, 5],
    abilities: [
      {
        slot: 'a1',
        key: 'shield_slam',
        icon: 'spell.crest_stone_guard',
        effects: [hit(2.6, 'single_enemy', { stat: 'DEF' })],
      },
      {
        slot: 'a2',
        key: 'hold_the_line',
        icon: 'spell.crest_ember_shield',
        cooldown: 4,
        effects: [
          status('def_up', 2, { target: 'all_allies', value: 30 }),
          status('provoke', 1, { target: 'all_enemies', chance: 100 }),
        ],
      },
    ],
  },
  /** ATK Down on the basic, Poison on everyone every fourth turn. */
  hexer: {
    role: 'support',
    stats: [975, 90, 65, 100, 10, 50, 20, 25],
    abilities: [
      {
        slot: 'a1',
        key: 'hex_bolt',
        icon: 'spell.blood_hex_mark',
        effects: [hit(2.8), status('atk_down', 2, { chance: 35, value: 25 })],
      },
      {
        slot: 'a2',
        key: 'miasma',
        icon: 'spell.blood_toxin_flow',
        cooldown: 4,
        effects: [status('poison', 2, { target: 'all_enemies', chance: 60, value: 5 })],
      },
    ],
  },
  /** Keeps the line alive; the party learns to focus it first. */
  mender: {
    role: 'support',
    stats: [1_050, 80, 70, 96, 10, 50, 20, 15],
    abilities: [
      { slot: 'a1', key: 'thorn_lash', icon: 'spell.fx_vine_lash', effects: [hit(2.6)] },
      {
        slot: 'a2',
        key: 'mending_chant',
        icon: 'spell.fx_lotus_spring',
        cooldown: 3,
        effects: [heal(0.2, 'all_allies')],
        ai: { priority: 3, when: { alliesBelowHp: { percent: 80, count: 1 } } },
      },
    ],
  },
};
