/**
 * Nyxara, Mother of Shadows — the weekly boss (docs/design/BOSSES.md §3).
 *
 * Three keys a week against a fight that changes gear twice. Two Choristers sing beside her, and
 * while one of them stands it takes half of every hit meant for her — so the week's damage is a
 * choice: clear the chorus first and lose the turns, or accept the split. They come back at every
 * phase change and every twelve of her own turns, at half health.
 *
 * Phase II opens the Eclipse Hymn (Fear and a stolen turn meter); phase III opens Mother's Embrace
 * and turns her Un-light on, which dims every heal the party can pay for. She is Unshakeable like
 * every period boss (BOSSES.md §1), so the answer is damage over time, DEF Down and Weaken.
 */
import { hit, heal, status, tm } from '@content/champions/dsl';
import { defineBoss } from './dsl';
import type { BossChestDef } from './types';

/** One chest row: `pct` of the tier's pool, what it holds, and the piece it mints. */
const chest = (
  pct: number,
  currencies: BossChestDef['currencies'],
  gear?: BossChestDef['gear'],
): BossChestDef => (gear ? { pct, currencies, gear } : { pct, currencies });

export default defineBoss({
  slug: 'nyxara',
  period: 'weekly',
  keysPerPeriod: 3,
  unlockLevel: 15,
  feature: 'weekly_boss',
  keyCurrency: 'key_weekly',
  element: 'eclipse',
  role: 'attack',
  // Violet over the placeholder model at ×2.4 (CLAUDE.md §2.7); the lizard's greens are washed
  // out first, or a multiply tint this pale would leave them showing through.
  art: { tint: '#8b6bd6', scale: 2.4, desaturate: true },
  backdrop: 'bg.bg9',
  surface: 'stone',
  immunities: ['stun', 'freeze', 'sleep', 'provoke', 'fear'],
  // A weekly race runs long, so the steps come every third own turn from her 24th.
  enrageEvery: 3,
  /*
   * Phase I above 90 %, II between 90 and 75 %, III below 75 % (BOSSES.md §3). The thresholds are
   * shallow on purpose: this is a damage race, not a kill fight, and what matters is where a key
   * actually lands. Measured against a finished roster (`tests/fixtures/saves/weekly-boss`), a key
   * takes an eighth of the pool with the chorus taxing half of every hit — so the 70/35 the first
   * draft printed meant nobody ever saw her last two gears at all (USER_QUESTIONS.md Q41).
   */
  phases: [0.9, 0.75],
  adds: {
    slug: 'chorister',
    archetype: 'mender',
    element: 'eclipse',
    role: 'support',
    art: { tint: '#6f5bb0', scale: 1.2, desaturate: true },
    count: 2,
    // Half of every hit meant for her lands on whichever Chorister still stands.
    guardPercent: 50,
    reviveEvery: 12,
    revivedHpPercent: 50,
    abilities: [
      {
        slot: 'a1',
        key: 'discord',
        icon: 'spell.blood_soul_ribbon',
        effects: [hit(2.8)],
      },
      {
        slot: 'a2',
        key: 'antiphon',
        icon: 'spell.rune_sealed_ring',
        cooldown: 4,
        // Two per cent of her pool is small, but across a long race it is the chorus's real job.
        effects: [heal(0.02, 'single_ally', 'TARGET_MAX_HP')],
      },
    ],
  },
  rotation: ['a1', 'a2', 'a1', 'a3', 'a1', 'a4'],
  abilities: [
    {
      slot: 'a1',
      key: 'shadow_verse',
      icon: 'spell.blood_nightwing',
      effects: [
        hit(3.6, { random_enemies: 2 }),
        status('weaken', 2, { target: { random_enemies: 2 }, chance: 40, value: 25 }),
      ],
    },
    {
      slot: 'a2',
      key: 'dirge',
      icon: 'spell.blood_hex_circle',
      cooldown: 3,
      effects: [
        hit(2.6, 'all_enemies'),
        // She does not strip the party's buffs, she wears them.
        { kind: 'steal_buff', target: 'all_enemies', count: 1 },
      ],
    },
    {
      slot: 'a3',
      key: 'eclipse_hymn',
      icon: 'spell.rune_eclipse_mark',
      cooldown: 5,
      minPhase: 2,
      effects: [status('fear', 2, { target: 'all_enemies', chance: 100 }), tm(-0.3, 'all_enemies')],
    },
    {
      slot: 'a4',
      key: 'mothers_embrace',
      icon: 'spell.blood_crimson_moon',
      cooldown: 6,
      minPhase: 3,
      effects: [
        heal(0.05, 'self', 'CASTER_MAX_HP'),
        status('block_debuffs', 2, { target: 'self' }),
        status('counter', 3, { target: 'all_allies' }),
      ],
    },
  ],
  passives: [
    {
      key: 'unlight',
      icon: 'spell.orb_voidspiral',
      trigger: 'static',
      // Only in her last phase: the fight gets harder to heal through exactly when it needs it.
      effects: [{ kind: 'enemy_heal_reduction', value: 30, if: { selfPhaseAtLeast: 3 } }],
    },
  ],
  tiers: [
    {
      id: 'normal',
      stats: [5_000_000, 2_200, 1_300, 108, 15, 50, 100, 100],
      /*
       * A Chorister holds 2 % of the pool. Measured: at a tenth of that the party deletes both on
       * the turn they appear and the split never happens; at this size a mid-endgame roster has to
       * choose — clear the chorus and lose the turns, or leave them and give up half of every hit
       * — while a finished roster still kills them and barely notices (BOSSES.md §3).
       */
      addStats: [100_000, 1_300, 900, 100, 15, 50, 100, 100],
      turnLimit: 100,
      enrageTurn: 24,
      enemyLevel: 30,
      playerXp: 800,
      chests: [
        chest(2, [
          { currency: 'gold', amount: 30_000 },
          { currency: 'brew_universal', amount: 4 },
        ]),
        chest(5, [
          { currency: 'gems', amount: 60 },
          { currency: 'tome_epic', amount: 2 },
        ]),
        chest(12, [
          { currency: 'shard_ancient', amount: 1 },
          { currency: 'mat_refining_core', amount: 10 },
        ]),
        chest(25, [
          { currency: 'gems', amount: 120 },
          { currency: 'mat_glyph_sigil', amount: 1 },
        ]),
        chest(50, [
          { currency: 'shard_sacred', amount: 1 },
          { currency: 'mat_starsteel', amount: 15 },
        ]),
        chest(100, [{ currency: 'tome_legendary', amount: 1 }], { rarity: 'legendary', stars: 6 }),
      ],
    },
    {
      id: 'hard',
      stats: [40_000_000, 3_600, 1_900, 114, 15, 50, 140, 140],
      addStats: [800_000, 2_200, 1_300, 106, 15, 50, 140, 140],
      turnLimit: 100,
      enrageTurn: 24,
      enemyLevel: 50,
      playerXp: 1_600,
      chests: [
        chest(2, [
          { currency: 'gold', amount: 80_000 },
          { currency: 'brew_universal', amount: 8 },
        ]),
        chest(5, [
          { currency: 'gems', amount: 120 },
          { currency: 'tome_legendary', amount: 1 },
        ]),
        chest(12, [
          { currency: 'shard_ancient', amount: 2 },
          { currency: 'mat_refining_core', amount: 15 },
        ]),
        chest(25, [
          { currency: 'gems', amount: 200 },
          { currency: 'mat_glyph_sigil', amount: 2 },
        ]),
        chest(50, [
          { currency: 'shard_sacred', amount: 1 },
          { currency: 'mat_starsteel', amount: 30 },
        ]),
        chest(100, [{ currency: 'shard_primordial', amount: 1 }], {
          rarity: 'legendary',
          stars: 6,
        }),
      ],
    },
    {
      id: 'nightmare',
      stats: [250_000_000, 5_500, 2_600, 120, 15, 50, 180, 180],
      addStats: [5_000_000, 3_300, 1_800, 112, 15, 50, 180, 180],
      turnLimit: 100,
      enrageTurn: 24,
      enemyLevel: 60,
      playerXp: 3_200,
      chests: [
        chest(2, [
          { currency: 'gold', amount: 200_000 },
          { currency: 'brew_universal', amount: 12 },
        ]),
        chest(5, [
          { currency: 'gems', amount: 250 },
          { currency: 'tome_legendary', amount: 2 },
        ]),
        chest(12, [
          { currency: 'shard_sacred', amount: 1 },
          { currency: 'mat_refining_core', amount: 25 },
        ]),
        chest(25, [
          { currency: 'gems', amount: 400 },
          { currency: 'mat_glyph_sigil', amount: 3 },
        ]),
        chest(50, [
          { currency: 'shard_sacred', amount: 2 },
          { currency: 'mat_starsteel', amount: 50 },
        ]),
        chest(
          100,
          [
            { currency: 'shard_primordial', amount: 1 },
            { currency: 'tome_mythic', amount: 1 },
          ],
          { rarity: 'mythic', stars: 6 },
        ),
      ],
    },
  ],
});
