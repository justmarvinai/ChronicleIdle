/**
 * The fourteen EA-0.1 gear sets (docs/design/GEAR.md §5). Eight two-piece sets are flat stat
 * bonuses; six four-piece sets carry behaviour, all of it expressed with the passive vocabulary
 * from `BATTLE.md` §6.
 */
import type { SpellKey } from '@assets/manifest.generated';
import type { PassiveDef, PassiveEffect, PassiveTrigger } from '@content/champions/types';
import type { GearSetDef, SetSize } from './types';

interface Grant {
  trigger?: PassiveTrigger;
  effects: PassiveEffect[];
}

interface SetInput {
  slug: string;
  pieces: SetSize;
  icon: SpellKey;
  /** One entry per passive the complete group grants; the trigger defaults to `static`. */
  grants: Grant[];
  homes: readonly number[];
}

function set(input: SetInput): GearSetDef {
  const id = `gear_set.${input.slug}`;
  const passives: PassiveDef[] = input.grants.map((grant, index) => ({
    id: index === 0 ? `${id}.bonus` : `${id}.bonus_${index + 1}`,
    name: `${id}.name`,
    description: `${id}.description`,
    icon: input.icon,
    trigger: grant.trigger ?? 'static',
    effects: grant.effects,
  }));
  return {
    id,
    name: `${id}.name`,
    description: `${id}.description`,
    pieces: input.pieces,
    passives,
    homes: input.homes,
    version: 1,
  };
}

export const GEAR_SETS: readonly GearSetDef[] = [
  set({
    slug: 'ember_guard',
    pieces: 2,
    icon: 'spell.crest_ember_shield',
    grants: [{ effects: [{ kind: 'stat_mod', stat: 'hp', percent: 15 }] }],
    homes: [1, 5],
  }),
  set({
    slug: 'ironhide',
    pieces: 2,
    icon: 'spell.crest_stone_guard',
    grants: [{ effects: [{ kind: 'stat_mod', stat: 'def', percent: 15 }] }],
    homes: [2, 6],
  }),
  set({
    slug: 'warcry',
    pieces: 2,
    icon: 'spell.crest_warmark',
    grants: [{ effects: [{ kind: 'stat_mod', stat: 'atk', percent: 15 }] }],
    homes: [1, 7],
  }),
  set({
    slug: 'swiftfoot',
    pieces: 2,
    icon: 'spell.orb_frostwind',
    grants: [{ effects: [{ kind: 'stat_mod', stat: 'spd', percent: 12 }] }],
    homes: [2, 8],
  }),
  set({
    slug: 'keen_eye',
    pieces: 2,
    icon: 'spell.fire_ember_eye',
    grants: [{ effects: [{ kind: 'stat_mod', stat: 'critRate', flat: 12 }] }],
    homes: [3, 10],
  }),
  set({
    slug: 'executioner',
    pieces: 2,
    icon: 'spell.blood_sanguine_blade',
    grants: [{ effects: [{ kind: 'stat_mod', stat: 'critDmg', flat: 20 }] }],
    homes: [4, 9],
  }),
  set({
    slug: 'warding',
    pieces: 2,
    icon: 'spell.crest_warded_shield',
    grants: [{ effects: [{ kind: 'stat_mod', stat: 'res', flat: 30 }] }],
    homes: [3, 11],
  }),
  set({
    slug: 'truesight',
    pieces: 2,
    icon: 'spell.hunt_bird_flight',
    grants: [{ effects: [{ kind: 'stat_mod', stat: 'acc', flat: 40 }] }],
    homes: [4],
  }),
  set({
    slug: 'lifedrinker',
    pieces: 4,
    icon: 'spell.blood_chalice',
    grants: [{ trigger: 'onHit', effects: [{ kind: 'lifesteal', percent: 30 }] }],
    homes: [5, 12],
  }),
  set({
    slug: 'retaliation',
    pieces: 4,
    icon: 'spell.hero_voidguard',
    grants: [{ effects: [{ kind: 'counterattack', chance: 30 }] }],
    homes: [6, 11],
  }),
  set({
    slug: 'relentless',
    pieces: 4,
    icon: 'spell.hero_stormblade',
    grants: [{ effects: [{ kind: 'extra_turn_chance', chance: 18 }] }],
    homes: [7, 12],
  }),
  set({
    slug: 'immortal',
    pieces: 4,
    icon: 'spell.crest_sacred_anchor',
    grants: [
      // The stat half has to be its own static passive: a `stat_mod` on a trigger is never read.
      { effects: [{ kind: 'stat_mod', stat: 'hp', percent: 15 }] },
      {
        trigger: 'onTurnStart',
        effects: [{ kind: 'heal', target: 'self', mult: 0.03, stat: 'CASTER_MAX_HP' }],
      },
    ],
    homes: [8],
  }),
  set({
    slug: 'stunlock',
    pieces: 4,
    icon: 'spell.earth_lightspike',
    grants: [
      {
        trigger: 'onHit',
        effects: [{ kind: 'apply_status', target: 'single_enemy', status: 'stun', turns: 1, chance: 18 }],
      },
    ],
    homes: [9],
  }),
  set({
    slug: 'bulwark',
    pieces: 4,
    icon: 'spell.tech_energy_shield',
    grants: [
      {
        trigger: 'onWaveStart',
        effects: [
          { kind: 'apply_status', target: 'self', status: 'shield', value: 0.2, turns: 3, chance: 100 },
        ],
      },
    ],
    homes: [10],
  }),
];

export const GEAR_SET_BY_ID: Readonly<Record<string, GearSetDef>> = Object.fromEntries(
  GEAR_SETS.map((s) => [s.id, s]),
);
