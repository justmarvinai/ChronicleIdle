/**
 * The twenty-four challenges (docs/design/ACHIEVEMENTS.md §6): one-off feats a chronicle has to set out
 * to do. The first seven name *how* a fight was won and read the feat counters a victory writes
 * (`@engine/deeds/feats`); the rest are the tops of the game's long climbs.
 *
 * A challenge that hangs up a frame or a title says so in `frames.ts` or `titles/index.ts`, where
 * the frame or the title names it as its source — the challenge itself only pays currencies.
 */
import { SETTLEMENT_COUNT, STARS_PER_SETTLEMENT } from '@content/balance/campaign';
import { MINE_MAX_LEVEL } from '@content/balance/mine';
import { TOWER_FLOORS } from '@content/balance/tower';
import { OMEN_SCALE } from '@content/balance/unwritten';
import { MISSIONS } from '@content/missions/index';
import { PALACE_NODES } from '@content/palace/index';
import { challenge } from './dsl';
import type { ChallengeDef } from './types';

/** Every star a difficulty holds: twelve settlements of ten stands at three stars. */
const EVERY_STAR = SETTLEMENT_COUNT * STARS_PER_SETTLEMENT;

export const CHALLENGES: readonly ChallengeDef[] = [
  // ── Feats only a battle can tell ─────────────────────────────────────────────────────────────
  challenge({
    slug: 'lone_blade',
    icon: 'glyph.bow_and_arrow',
    place: 'campaign',
    goal: { type: 'counter', key: 'feat.solo', count: 1 },
    renown: 50,
    rewards: [{ currency: 'gems', amount: 100 }],
  }),
  challenge({
    slug: 'last_standing',
    icon: 'glyph.shield_block',
    place: 'campaign',
    goal: { type: 'counter', key: 'feat.last_stand', count: 1 },
    renown: 50,
    rewards: [{ currency: 'gems', amount: 100 }],
  }),
  challenge({
    slug: 'untouched',
    icon: 'glyph.nature_shield',
    place: 'campaign',
    goal: { type: 'counter', key: 'feat.untouched', count: 1 },
    renown: 75,
    rewards: [{ currency: 'gems', amount: 150 }],
  }),
  challenge({
    slug: 'swift',
    icon: 'glyph.magic_arrow',
    place: 'campaign',
    goal: { type: 'counter', key: 'feat.swift', count: 1 },
    renown: 75,
    rewards: [{ currency: 'gems', amount: 150 }],
  }),
  challenge({
    slug: 'one_blood',
    icon: 'glyph.arcane_symbol',
    place: 'campaign',
    goal: { type: 'counter', key: 'feat.kindred', count: 1 },
    renown: 75,
    rewards: [{ currency: 'gems', amount: 150 }],
  }),
  challenge({
    slug: 'rabble',
    icon: 'glyph.fist_punch',
    place: 'campaign',
    goal: { type: 'counter', key: 'feat.rabble', count: 1 },
    renown: 100,
    rewards: [{ currency: 'gems', amount: 200 }],
  }),
  challenge({
    slug: 'giant_slayer',
    icon: 'glyph.stomp_impact',
    place: 'campaign',
    goal: { type: 'counter', key: 'feat.giant_slayer', count: 1 },
    renown: 100,
    rewards: [{ currency: 'gems', amount: 200 }],
  }),

  // ── The campaign mastered ────────────────────────────────────────────────────────────────────
  challenge({
    slug: 'master_intro',
    icon: 'glyph.shooting_stars',
    place: 'campaign',
    goal: { type: 'difficulty_stars', difficulty: 'intro', stars: EVERY_STAR },
    renown: 75,
    rewards: [{ currency: 'gems', amount: 200 }],
  }),
  challenge({
    slug: 'master_normal',
    icon: 'glyph.shooting_stars',
    place: 'campaign',
    goal: { type: 'difficulty_stars', difficulty: 'normal', stars: EVERY_STAR },
    renown: 100,
    rewards: [{ currency: 'gems', amount: 300 }],
  }),
  challenge({
    slug: 'master_hard',
    icon: 'glyph.shooting_stars',
    place: 'campaign',
    goal: { type: 'difficulty_stars', difficulty: 'hard', stars: EVERY_STAR },
    renown: 150,
    rewards: [{ currency: 'gems', amount: 500 }],
  }),

  // ── The trials ───────────────────────────────────────────────────────────────────────────────
  challenge({
    slug: 'sovereign',
    icon: 'glyph.holy_totem',
    place: 'tower',
    goal: { type: 'counter', key: 'tower.best', count: TOWER_FLOORS },
    renown: 150,
    rewards: [{ currency: 'shard_primordial', amount: 1 }],
  }),
  challenge({
    slug: 'gargoyle_broken',
    icon: 'glyph.flaming_skull',
    place: 'gargoyle',
    goal: { type: 'boss_percent', boss: 'boss.gargoyle', tier: 'brutal', pct: 100 },
    renown: 100,
    rewards: [{ currency: 'shard_sacred', amount: 1 }],
  }),
  challenge({
    slug: 'titan_falls',
    icon: 'glyph.cursed_eye',
    place: 'titan',
    goal: { type: 'boss_percent', boss: 'boss.titan', tier: 'nightmare', pct: 100 },
    renown: 150,
    rewards: [{ currency: 'shard_primordial', amount: 1 }],
  }),

  // ── The Unwritten ────────────────────────────────────────────────────────────────────────────
  challenge({
    slug: 'unbroken_company',
    icon: 'glyph.nature_shield',
    place: 'unwritten',
    goal: { type: 'counter', key: 'feat.unwritten_unbroken', count: 1 },
    renown: 100,
    rewards: [{ currency: 'gems', amount: 300 }],
  }),
  challenge({
    slug: 'company_of_one',
    icon: 'glyph.bow_and_arrow',
    place: 'unwritten',
    goal: { type: 'counter', key: 'feat.unwritten_lone', count: 1 },
    renown: 150,
    rewards: [{ currency: 'shard_sacred', amount: 1 }],
  }),
  challenge({
    slug: 'illuminated_manuscript',
    icon: 'glyph.spell_book',
    place: 'unwritten',
    goal: { type: 'counter', key: 'feat.unwritten_illuminated', count: 1 },
    renown: 100,
    rewards: [{ currency: 'gems', amount: 300 }],
  }),
  challenge({
    slug: 'last_page_turned',
    icon: 'glyph.skull_wreath',
    place: 'unwritten',
    // Every Omen won, the last one too.
    goal: { type: 'counter', key: 'unwritten.omens', count: OMEN_SCALE.length },
    renown: 150,
    rewards: [{ currency: 'shard_primordial', amount: 1 }],
  }),

  // ── Champions and gear ───────────────────────────────────────────────────────────────────────
  challenge({
    slug: 'mythic',
    icon: 'glyph.celestial_body',
    place: 'portal',
    goal: { type: 'own_champions', count: 1, rarity: 'mythic' },
    renown: 100,
    rewards: [{ currency: 'gems', amount: 300 }],
  }),
  challenge({
    slug: 'legend_perfected',
    icon: 'glyph.spell_book',
    place: 'tavern',
    goal: { type: 'all_skills_maxed', rarity: 'legendary' },
    renown: 100,
    rewards: [{ currency: 'shard_sacred', amount: 1 }],
  }),
  challenge({
    slug: 'dressed_for_war',
    icon: 'glyph.ribcage_armor',
    place: 'champions',
    goal: { type: 'equip_pieces', count: 6, minStars: 6 },
    renown: 75,
    rewards: [{ currency: 'mat_glyph_sigil', amount: 5 }],
  }),
  challenge({
    slug: 'masterwork',
    icon: 'glyph.hammer_hit',
    place: 'armoury',
    goal: { type: 'gear_reach_level', level: 16, count: 1 },
    renown: 75,
    rewards: [{ currency: 'mat_refining_core', amount: 10 }],
  }),

  // ── Emberhold and the Path ───────────────────────────────────────────────────────────────────
  challenge({
    slug: 'heart_of_the_vein',
    icon: 'glyph.pickaxe',
    place: 'mine',
    goal: { type: 'mine_level', level: MINE_MAX_LEVEL },
    renown: 100,
    rewards: [{ currency: 'gems', amount: 300 }],
  }),
  challenge({
    slug: 'every_hall_lit',
    icon: 'glyph.eagle_staff',
    place: 'palace',
    goal: { type: 'palace_nodes', count: PALACE_NODES.length },
    renown: 150,
    rewards: [{ currency: 'shard_primordial', amount: 1 }],
  }),
  challenge({
    slug: 'path_end',
    icon: 'glyph.owl',
    place: 'missions',
    goal: { type: 'path_walked', missions: MISSIONS.length },
    renown: 100,
    rewards: [{ currency: 'shard_sacred', amount: 1 }],
  }),
];
