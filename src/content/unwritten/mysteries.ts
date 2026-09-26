/**
 * The twenty mysteries (docs/design/UNWRITTEN.md §10). A mystery is a scene and two or three
 * choices; a choice says what it costs and what it may bring, and a gamble names its odds once
 * the Scriptorium's Keen Reader is written. Drawn without repeat within an expedition.
 */
import { mystery } from './dsl';
import type { MysteryDef } from './types';

export const MYSTERIES: readonly MysteryDef[] = [
  mystery({
    slug: 'weeping_scribe',
    art: 'spell.hero_lone_wanderer',
    choices: [
      {
        key: 'pay',
        requires: { gilt: 30, inscriptions: 1 },
        outcomes: [{ kind: 'gilt', amount: -30 }, { kind: 'deepen' }],
      },
      { key: 'write', outcomes: [{ kind: 'inscribe', rarity: 'rare' }, { kind: 'blot' }] },
      { key: 'leave', outcomes: [] },
    ],
  }),
  mystery({
    slug: 'page_torn_in_two',
    art: 'spell.earth_fissure_web',
    choices: [
      { key: 'left', outcomes: [{ kind: 'relic' }, { kind: 'wound', share: 0.1, whom: 'all' }] },
      { key: 'right', outcomes: [{ kind: 'gilt', amount: 60 }] },
    ],
  }),
  mystery({
    slug: 'hungry_library',
    art: 'spell.blood_necromancer',
    choices: [
      {
        key: 'feed',
        requires: { relics: 1 },
        outcomes: [{ kind: 'lose_relic' }, { kind: 'inscribe' }, { kind: 'inscribe' }],
      },
      { key: 'leave', outcomes: [] },
    ],
  }),
  mystery({
    slug: 'mirror_of_ink',
    art: 'spell.orb_voidspiral',
    choices: [
      { key: 'look', requires: { inscriptions: 1 }, outcomes: [{ kind: 'deepen' }, { kind: 'blot' }] },
      { key: 'break', outcomes: [{ kind: 'gilt', amount: 25 }] },
    ],
  }),
  mystery({
    slug: 'drowned_choir',
    art: 'spell.hero_blue_cultist',
    choices: [
      { key: 'listen', outcomes: [{ kind: 'heal', share: 0.25, whom: 'all' }] },
      { key: 'sing', outcomes: [{ kind: 'inscribe', ink: 'azure' }] },
    ],
  }),
  mystery({
    slug: 'unfinished_duel',
    art: 'spell.hero_duelist',
    choices: [
      { key: 'accept', outcomes: [{ kind: 'duel' }] },
      { key: 'refuse', outcomes: [] },
    ],
  }),
  mystery({
    slug: 'ashen_pilgrims',
    art: 'spell.hero_nightwatch',
    choices: [
      {
        key: 'share',
        requires: { gilt: 20 },
        outcomes: [
          { kind: 'gilt', amount: -20 },
          { kind: 'inscribe', ink: 'gold' },
        ],
      },
      {
        key: 'rob',
        outcomes: [
          { kind: 'gilt', amount: 50 },
          { kind: 'blot', id: 'blot.ill_omen' },
        ],
      },
    ],
  }),
  mystery({
    slug: 'well_of_names',
    art: 'spell.blood_fountain',
    choices: [
      {
        key: 'coin',
        requires: { gilt: 10 },
        outcomes: [{ kind: 'gilt', amount: -10 }, { kind: 'relic' }],
        gamble: { chance: 0.5, otherwise: [{ kind: 'gilt', amount: -10 }] },
      },
      { key: 'drink', requires: { fallen: 1 }, outcomes: [{ kind: 'rekindle', share: 0.3 }] },
      { key: 'leave', outcomes: [] },
    ],
  }),
  mystery({
    slug: 'bound_echo',
    art: 'spell.hero_voidguard',
    choices: [
      { key: 'free', outcomes: [{ kind: 'echo' }] },
      { key: 'take', outcomes: [{ kind: 'inscribe', ink: 'violet' }] },
    ],
  }),
  mystery({
    slug: 'candle_in_the_void',
    art: 'spell.fire_void_flame',
    choices: [
      {
        key: 'light',
        requires: { blots: 1 },
        outcomes: [{ kind: 'scrape' }, { kind: 'wound', share: 0.15, whom: 'all' }],
      },
      { key: 'snuff', outcomes: [{ kind: 'pages', amount: 3 }] },
    ],
  }),
  mystery({
    slug: 'scriptorium_ruins',
    art: 'spell.earth_monolith',
    choices: [
      {
        key: 'search',
        outcomes: [{ kind: 'deepen' }],
        gamble: { chance: 0.6, otherwise: [{ kind: 'ambush' }] },
      },
      { key: 'leave', outcomes: [] },
    ],
  }),
  mystery({
    slug: 'merchant_of_last_things',
    art: 'spell.hero_green_sorceress',
    choices: [
      { key: 'buy', requires: { gilt: 40 }, outcomes: [{ kind: 'gilt_all' }, { kind: 'relic' }] },
      { key: 'leave', outcomes: [] },
    ],
  }),
  mystery({
    slug: 'silent_twins',
    art: 'spell.fire_twin_flames',
    choices: [
      { key: 'left', outcomes: [{ kind: 'relic' }], gamble: { chance: 0.5, otherwise: [{ kind: 'blot' }] } },
      { key: 'right', outcomes: [{ kind: 'gilt', amount: 30 }] },
    ],
  }),
  mystery({
    slug: 'echo_of_a_friend',
    art: 'spell.hero_spellblade',
    choices: [
      { key: 'rise', requires: { fallen: 1 }, outcomes: [{ kind: 'rekindle', share: 0.5 }] },
      { key: 'remember', outcomes: [{ kind: 'gilt', amount: 30 }] },
    ],
  }),
  mystery({
    slug: 'ink_tide',
    art: 'spell.blood_soul_ribbon',
    choices: [
      {
        key: 'yield',
        requires: { inscriptions: 1 },
        outcomes: [{ kind: 'unwrite' }, { kind: 'gilt', amount: 40 }],
      },
      { key: 'wade', outcomes: [{ kind: 'wound', share: 0.1, whom: 'all' }] },
    ],
  }),
  mystery({
    slug: 'wardens_herald',
    art: 'spell.hero_demon_lord',
    choices: [
      { key: 'bow', outcomes: [{ kind: 'warden_hp', delta: -0.15 }] },
      { key: 'mock', outcomes: [{ kind: 'warden_hp', delta: 0.15 }, { kind: 'warden_relic' }] },
    ],
  }),
  mystery({
    slug: 'crimson_altar',
    art: 'spell.blood_crimson_gate',
    choices: [
      {
        key: 'bleed',
        outcomes: [
          { kind: 'wound', share: 0.3, whom: 'strongest' },
          { kind: 'inscribe', ink: 'crimson' },
        ],
      },
      { key: 'leave', outcomes: [] },
    ],
  }),
  mystery({
    slug: 'scales_of_veyrath',
    art: 'spell.icon_blade_chalice',
    choices: [
      { key: 'purse', outcomes: [{ kind: 'gilt_double', cap: 60 }] },
      { key: 'company', outcomes: [{ kind: 'heal', share: 0.2, whom: 'all' }] },
    ],
  }),
  mystery({
    slug: 'lantern_bearer',
    art: 'spell.hero_emberknight',
    choices: [
      { key: 'follow', outcomes: [{ kind: 'double_gilt_next' }] },
      { key: 'ask', outcomes: [{ kind: 'reveal_affixes' }] },
    ],
  }),
  mystery({
    slug: 'last_chronicler',
    art: 'spell.icon_meditation',
    choices: [
      { key: 'listen', outcomes: [{ kind: 'pages', amount: 5 }] },
      {
        key: 'ask',
        outcomes: [
          { kind: 'inscribe', rarity: 'rare' },
          { kind: 'wound', share: 0.1, whom: 'all' },
        ],
      },
    ],
  }),
];
