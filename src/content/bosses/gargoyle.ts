/**
 * Gargoyle, the Waking Stone — the daily boss (docs/design/BOSSES.md §2).
 *
 * A damage race against a wall of stone: it is Unshakeable (no Stun, Freeze, Sleep, Provoke or
 * Fear), takes every damage-over-time at full value, and eats the curses off whoever it bites, so
 * the answer is Poison/Bleed/Burn, DEF Down and Weaken rather than crowd control. Its weathering
 * softens crits until five *different* debuffs have landed on it — the fight's one puzzle.
 */
import { hit, heal, status } from '@content/champions/dsl';
import { defineBoss } from './dsl';
import type { BossChestDef } from './types';

/** One chest row: `pct` of the tier's pool, what it holds, and the piece it mints. */
const chest = (
  pct: number,
  currencies: BossChestDef['currencies'],
  gear?: BossChestDef['gear'],
): BossChestDef => (gear ? { pct, currencies, gear } : { pct, currencies });

export default defineBoss({
  slug: 'gargoyle',
  period: 'daily',
  keysPerPeriod: 2,
  unlockLevel: 10,
  feature: 'daily_boss',
  keyCurrency: 'key_daily',
  element: 'eclipse',
  role: 'health',
  // Weathered limestone over the placeholder model, twice a champion's size (CLAUDE.md §2.7): the
  // lizard's own greens are washed out first, or a pale multiply tint would do nothing at all.
  art: { tint: '#efe6d2', scale: 2, desaturate: true },
  backdrop: 'bg.bg3',
  surface: 'stone',
  immunities: ['stun', 'freeze', 'sleep', 'provoke', 'fear'],
  // A race lasts it a dozen own turns or so (tools/sim), so the steps come every other turn.
  enrageEvery: 2,
  rotation: ['a1', 'a1', 'a2', 'a1', 'a3'],
  abilities: [
    {
      slot: 'a1',
      key: 'granite_fist',
      icon: 'spell.earth_boulder_fist',
      // It goes for whoever hits hardest, which is usually the champion you least want down.
      prefer: 'highest_atk',
      effects: [hit(4), status('def_down', 2, { chance: 50, value: 30 })],
    },
    {
      slot: 'a2',
      key: 'stonequake',
      icon: 'spell.earth_fissure_web',
      cooldown: 3,
      effects: [
        hit(2.2, 'all_enemies'),
        // The ground takes one of them, never the whole party (BOSSES.md §2).
        status('stun', 1, { target: 'all_enemies', chance: 40, maxTargets: 1 }),
      ],
    },
    {
      slot: 'a3',
      key: 'devour',
      icon: 'spell.blood_skull',
      cooldown: 4,
      startsOnCooldown: true,
      effects: [
        hit(6),
        // Three per cent of its pool for every curse on the champion it bites.
        heal(0.03, 'self', 'CASTER_MAX_HP', { per: 'target_debuff' }),
        status('heal_reduction', 2, { chance: 100, value: 100 }),
      ],
    },
  ],
  passives: [
    {
      key: 'weathered_stone',
      icon: 'spell.earth_monolith',
      trigger: 'static',
      effects: [
        // Five *different* debuffs break it — stacking one kind is not the answer.
        { kind: 'damage_reduction', value: 0.2, scope: 'crit', if: { selfDistinctDebuffsBelow: 5 } },
      ],
    },
  ],
  tiers: [
    {
      id: 'easy',
      stats: [250_000, 900, 700, 100, 15, 50, 60, 60],
      turnLimit: 50,
      enrageTurn: 12,
      enemyLevel: 20,
      playerXp: 150,
      chests: [
        chest(5, [
          { currency: 'gold', amount: 5_000 },
          { currency: 'brew_justice', amount: 1 },
          { currency: 'brew_valor', amount: 1 },
        ]),
        chest(15, [
          { currency: 'gold', amount: 10_000 },
          { currency: 'tome_rare', amount: 1 },
        ]),
        chest(30, [
          { currency: 'gold', amount: 20_000 },
          { currency: 'mat_ember_alloy', amount: 5 },
        ]),
        chest(60, [
          { currency: 'gems', amount: 30 },
          { currency: 'shard_faded', amount: 1 },
        ]),
        chest(100, [{ currency: 'shard_ancient', amount: 1 }], { rarity: 'rare', stars: 3 }),
      ],
    },
    {
      id: 'normal',
      stats: [2_000_000, 1_600, 1_100, 105, 15, 50, 90, 90],
      turnLimit: 50,
      enrageTurn: 12,
      enemyLevel: 35,
      playerXp: 300,
      chests: [
        chest(5, [
          { currency: 'gold', amount: 15_000 },
          { currency: 'brew_justice', amount: 1 },
          { currency: 'brew_valor', amount: 1 },
          { currency: 'brew_universal', amount: 1 },
        ]),
        chest(15, [
          { currency: 'gold', amount: 25_000 },
          { currency: 'tome_rare', amount: 2 },
        ]),
        chest(30, [
          { currency: 'gold', amount: 40_000 },
          { currency: 'mat_ember_alloy', amount: 10 },
          { currency: 'mat_refining_core', amount: 3 },
        ]),
        chest(60, [
          { currency: 'gems', amount: 60 },
          { currency: 'tome_epic', amount: 1 },
        ]),
        chest(100, [{ currency: 'shard_ancient', amount: 1 }], { rarity: 'epic', stars: 4 }),
      ],
    },
    {
      id: 'hard',
      stats: [12_000_000, 2_600, 1_500, 110, 15, 50, 120, 120],
      turnLimit: 50,
      enrageTurn: 12,
      enemyLevel: 50,
      playerXp: 600,
      chests: [
        chest(5, [
          { currency: 'gold', amount: 40_000 },
          { currency: 'brew_justice', amount: 2 },
          { currency: 'brew_valor', amount: 2 },
        ]),
        chest(15, [
          { currency: 'gold', amount: 60_000 },
          { currency: 'tome_epic', amount: 1 },
        ]),
        chest(30, [
          { currency: 'gold', amount: 90_000 },
          { currency: 'mat_ember_alloy', amount: 15 },
          { currency: 'mat_refining_core', amount: 5 },
        ]),
        chest(60, [
          { currency: 'gems', amount: 100 },
          { currency: 'tome_epic', amount: 2 },
        ]),
        chest(100, [{ currency: 'shard_sacred', amount: 1 }], { rarity: 'legendary', stars: 5 }),
      ],
    },
    {
      id: 'brutal',
      stats: [60_000_000, 4_000, 2_100, 115, 15, 50, 160, 160],
      turnLimit: 50,
      enrageTurn: 12,
      enemyLevel: 60,
      playerXp: 1_200,
      chests: [
        chest(5, [
          { currency: 'gold', amount: 100_000 },
          { currency: 'brew_justice', amount: 3 },
          { currency: 'brew_valor', amount: 3 },
        ]),
        chest(15, [
          { currency: 'gold', amount: 150_000 },
          { currency: 'tome_epic', amount: 2 },
        ]),
        chest(30, [
          { currency: 'gold', amount: 200_000 },
          { currency: 'mat_starsteel', amount: 10 },
          { currency: 'mat_refining_core', amount: 8 },
        ]),
        chest(60, [
          { currency: 'gems', amount: 200 },
          { currency: 'tome_legendary', amount: 1 },
        ]),
        chest(
          100,
          [
            { currency: 'shard_sacred', amount: 1 },
            { currency: 'mat_glyph_sigil', amount: 1 },
          ],
          { rarity: 'legendary', stars: 6 },
        ),
      ],
    },
  ],
});
