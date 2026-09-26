/**
 * The forty-one achievements (docs/design/ACHIEVEMENTS.md §5), ledger by ledger in the order
 * the Hall lists them. The first tier of most is days into a chronicle; the fifth is a year or more.
 *
 * Where a part of the game has a top — the Tower's hundredth floor, the Mine's tenth level, the
 * Palace's last node, the Path's last page — reaching it is a challenge (`challenges.ts`), and the
 * achievement that climbs towards it stops a rung below, so nothing is paid twice.
 */
import type { Difficulty } from '@content/balance/battle';
import { BOSS_STAGE_NUMBER } from '@content/balance/campaign';
import type { Goal } from '@content/quests/types';
import { achievement, counts, type Five } from './dsl';
import type { AchievementDef } from './types';

/** A settlement's boss stand on a difficulty — the Long Road's milestones. */
const boss = (settlement: number, difficulty: Difficulty): Goal => ({
  type: 'clear_stage',
  settlement,
  stage: BOSS_STAGE_NUMBER,
  difficulty,
});

/** Five of one goal shape, one number apart. */
const five = <T extends number>(targets: Five<T>, make: (target: T) => Goal): Five<Goal> => [
  make(targets[0]),
  make(targets[1]),
  make(targets[2]),
  make(targets[3]),
  make(targets[4]),
];

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  // ── The campaign ─────────────────────────────────────────────────────────────────────────────
  achievement({
    slug: 'stand_breaker',
    ledger: 'campaign',
    icon: 'glyph.crossed_swords',
    place: 'campaign',
    goals: counts('campaign.cleared', [100, 1_000, 4_000, 10_000, 25_000]),
  }),
  achievement({
    slug: 'star_gatherer',
    ledger: 'campaign',
    icon: 'glyph.shooting_stars',
    place: 'campaign',
    // Every star is 1,080; the three Masters are the challenges that ask for all of them.
    goals: counts('campaign.stars', [30, 120, 360, 720, 1_000]),
  }),
  achievement({
    slug: 'long_road',
    ledger: 'campaign',
    icon: 'glyph.thorny_branch',
    place: 'campaign',
    goals: [boss(3, 'intro'), boss(6, 'intro'), boss(12, 'intro'), boss(12, 'normal'), boss(12, 'hard')],
  }),
  achievement({
    slug: 'written_not_fought',
    ledger: 'campaign',
    icon: 'glyph.magic_feather',
    place: 'campaign',
    goals: counts('campaign.instant', [10, 100, 500, 2_000, 5_000]),
  }),
  achievement({
    slug: 'energy_well_spent',
    ledger: 'campaign',
    icon: 'glyph.spell_casting',
    place: 'campaign',
    goals: counts('energy.spent', [1_000, 10_000, 40_000, 120_000, 250_000]),
  }),
  achievement({
    slug: 'victor',
    ledger: 'campaign',
    icon: 'glyph.sword_clash',
    place: 'campaign',
    goals: counts('battles.victory', [50, 500, 2_500, 7_500, 20_000]),
  }),
  achievement({
    slug: 'own_hand',
    ledger: 'campaign',
    icon: 'glyph.fist_punch',
    place: 'campaign',
    goals: counts('battles.won.manual', [10, 50, 200, 500, 1_000]),
  }),

  // ── Champions ────────────────────────────────────────────────────────────────────────────────
  achievement({
    slug: 'recruiter',
    ledger: 'champions',
    icon: 'glyph.cloaked_figure',
    place: 'portal',
    // Different champions, not copies: rank-ups eat copies, and a collection is who is in it.
    goals: five([5, 10, 14, 18, 22], (count) => ({ type: 'own_champions', count, distinct: true })),
  }),
  achievement({
    slug: 'starborn',
    ledger: 'champions',
    icon: 'glyph.celestial_body',
    place: 'tavern',
    goals: [
      { type: 'champion_reach_stars', stars: 3, count: 1 },
      { type: 'champion_reach_stars', stars: 4, count: 1 },
      { type: 'champion_reach_stars', stars: 5, count: 1 },
      { type: 'champion_reach_stars', stars: 6, count: 1 },
      { type: 'champion_reach_stars', stars: 6, count: 3 },
    ],
  }),
  achievement({
    slug: 'tempered',
    ledger: 'champions',
    icon: 'glyph.stomp_impact',
    place: 'tavern',
    goals: [
      { type: 'champion_reach_level', level: 20, count: 1 },
      { type: 'champion_reach_level', level: 40, count: 1 },
      { type: 'champion_reach_level', level: 50, count: 1 },
      { type: 'champion_reach_level', level: 60, count: 1 },
      { type: 'champion_reach_level', level: 60, count: 6 },
    ],
  }),
  achievement({
    slug: 'tavern_regular',
    ledger: 'champions',
    icon: 'glyph.health_potion',
    place: 'tavern',
    goals: counts('tavern.levelUps', [25, 150, 600, 2_000, 5_000]),
  }),
  achievement({
    slug: 'sharpened',
    ledger: 'champions',
    icon: 'glyph.thorn_staff',
    place: 'tavern',
    goals: counts('tavern.skillUpgrades', [5, 25, 100, 250, 500]),
  }),
  achievement({
    slug: 'same_blood',
    ledger: 'champions',
    icon: 'glyph.phoenix',
    place: 'tavern',
    goals: counts('tavern.rankUps', [1, 10, 40, 100, 250]),
  }),

  // ── Gear ─────────────────────────────────────────────────────────────────────────────────────
  achievement({
    slug: 'smith',
    ledger: 'gear',
    icon: 'glyph.hammer_hit',
    place: 'armoury',
    goals: counts('gear.levels', [50, 500, 2_500, 8_000, 20_000]),
  }),
  achievement({
    slug: 'forgemaster',
    ledger: 'gear',
    icon: 'glyph.spiked_cleaver',
    place: 'forge',
    goals: counts('forge.crafts', [5, 30, 120, 400, 1_000]),
  }),
  achievement({
    slug: 'salvager',
    ledger: 'gear',
    icon: 'glyph.exploding_bomb',
    place: 'forge',
    goals: counts('forge.dismantles', [25, 250, 1_000, 4_000, 10_000]),
  }),
  achievement({
    slug: 'refiner',
    ledger: 'gear',
    icon: 'glyph.magic_staff',
    place: 'forge',
    goals: counts('forge.refines', [5, 25, 100, 300, 800]),
  }),
  achievement({
    slug: 'plunderer',
    ledger: 'gear',
    icon: 'glyph.ribcage_armor',
    place: 'armoury',
    goals: counts('gear.drops', [25, 250, 1_000, 4_000, 10_000]),
  }),

  // ── The Portal ───────────────────────────────────────────────────────────────────────────────
  achievement({
    slug: 'summoner',
    ledger: 'portal',
    icon: 'glyph.spirit_vortex',
    place: 'portal',
    goals: counts('summon.pulls', [10, 100, 500, 1_500, 4_000]),
  }),
  achievement({
    slug: 'epic_tidings',
    ledger: 'portal',
    icon: 'glyph.arcane_symbol',
    place: 'portal',
    goals: counts('summon.rarity.epic', [1, 10, 40, 120, 300]),
  }),
  achievement({
    slug: 'legend_seeker',
    ledger: 'portal',
    icon: 'glyph.magic_arrow',
    place: 'portal',
    goals: counts('summon.rarity.legendary', [1, 5, 15, 40, 100]),
  }),

  // ── The trials ───────────────────────────────────────────────────────────────────────────────
  achievement({
    slug: 'stonebreaker',
    ledger: 'trials',
    icon: 'glyph.flaming_skull',
    place: 'gargoyle',
    // Two keys a day: the fifth tier is a year and a quarter of them.
    goals: five([10, 60, 200, 450, 900], (count) => ({ type: 'boss_fights', boss: 'boss.gargoyle', count })),
  }),
  achievement({
    slug: 'titans_due',
    ledger: 'trials',
    icon: 'glyph.cursed_eye',
    place: 'titan',
    // Three keys a week: the fifth tier is a year and a half of them.
    goals: five([3, 15, 50, 120, 240], (count) => ({ type: 'boss_fights', boss: 'boss.titan', count })),
  }),
  achievement({
    slug: 'chest_taker',
    ledger: 'trials',
    icon: 'glyph.evil_eye',
    place: 'gargoyle',
    goals: counts('boss.chests', [10, 100, 400, 1_000, 2_000]),
  }),
  achievement({
    slug: 'climber',
    ledger: 'trials',
    icon: 'glyph.holy_totem',
    place: 'tower',
    // The hundredth floor is Sovereign of the Tower's.
    goals: counts('tower.best', [10, 25, 50, 75, 90]),
  }),

  // ── The halls ────────────────────────────────────────────────────────────────────────────────
  achievement({
    slug: 'brewmaster',
    ledger: 'halls',
    icon: 'glyph.magic_flame',
    place: 'brewery',
    goals: counts('brewery.brews', [50, 500, 2_500, 8_000, 20_000]),
  }),
  achievement({
    slug: 'hall_walker',
    ledger: 'halls',
    icon: 'glyph.holy_cross',
    place: 'brewery',
    goals: counts('brewery.cleared', [2, 5, 10, 15, 20]),
  }),
  achievement({
    slug: 'keep_raider',
    ledger: 'halls',
    icon: 'glyph.skull_wreath',
    place: 'dungeons',
    goals: counts('dungeon.gear', [10, 100, 500, 1_500, 4_000]),
  }),
  achievement({
    slug: 'rung_by_rung',
    ledger: 'halls',
    icon: 'glyph.shield_block',
    place: 'dungeons',
    goals: counts('dungeon.cleared', [5, 20, 60, 120, 160]),
  }),

  // ── The Unwritten ────────────────────────────────────────────────────────────────────────────
  achievement({
    slug: 'folios_turned',
    ledger: 'unwritten',
    icon: 'glyph.burning_scroll',
    place: 'unwritten',
    // A Warden felled turns its folio; an expedition won is three.
    goals: counts('unwritten.folios', [3, 30, 100, 250, 500]),
  }),
  achievement({
    slug: 'inscribed',
    ledger: 'unwritten',
    icon: 'glyph.quill',
    place: 'unwritten',
    goals: counts('unwritten.inscriptions', [10, 100, 400, 1_000, 2_500]),
  }),
  achievement({
    slug: 'relic_bearer',
    ledger: 'unwritten',
    icon: 'glyph.chest',
    place: 'unwritten',
    goals: counts('unwritten.relics', [5, 50, 200, 500, 1_200]),
  }),
  achievement({
    slug: 'omens_read',
    ledger: 'unwritten',
    icon: 'glyph.cursed_eye',
    place: 'unwritten',
    // Omens won, Omen 0 counted as one; Omen 15, the last, is The Last Page Turned's.
    goals: counts('unwritten.omens', [1, 4, 7, 10, 13]),
  }),

  // ── Emberhold ────────────────────────────────────────────────────────────────────────────────
  achievement({
    slug: 'deep_pockets',
    ledger: 'emberhold',
    icon: 'glyph.pickaxe',
    place: 'mine',
    goals: counts('mine.gems', [30, 300, 1_500, 4_000, 8_000]),
  }),
  achievement({
    slug: 'dockhand',
    ledger: 'emberhold',
    icon: 'glyph.hourglass',
    place: 'idle_chest',
    goals: counts('idle.claims', [10, 100, 500, 1_500, 3_500]),
  }),
  achievement({
    slug: 'patron',
    ledger: 'emberhold',
    icon: 'glyph.trophy_cup',
    place: 'market',
    goals: counts('market.purchases', [10, 100, 500, 1_500, 4_000]),
  }),
  achievement({
    slug: 'faithful',
    ledger: 'emberhold',
    icon: 'glyph.peace_dove',
    place: 'login',
    goals: counts('login.claims', [7, 30, 90, 180, 365]),
  }),
  achievement({
    slug: 'glorious',
    ledger: 'emberhold',
    icon: 'glyph.eagle_staff',
    place: 'palace',
    // The last node is Every Hall Lit's.
    goals: five([5, 20, 50, 90, 120], (count) => ({ type: 'palace_nodes', count })),
  }),

  // ── The ledgers ──────────────────────────────────────────────────────────────────────────────
  achievement({
    slug: 'errand_runner',
    ledger: 'ledgers',
    icon: 'glyph.burning_scroll',
    place: 'quests',
    goals: counts('quests.claimed', [20, 200, 800, 2_000, 4_000]),
  }),
  achievement({
    slug: 'diligent',
    ledger: 'ledgers',
    icon: 'glyph.owl',
    place: 'quests',
    goals: counts('quests.daily.days', [3, 15, 60, 180, 365]),
  }),
  achievement({
    slug: 'pathfinder',
    ledger: 'ledgers',
    icon: 'glyph.spell_book',
    place: 'missions',
    // The last page is the Path's End's.
    goals: five([10, 30, 60, 90, 110], (missions) => ({ type: 'path_walked', missions })),
  }),
];
