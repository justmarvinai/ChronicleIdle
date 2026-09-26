/**
 * The Hall of Deeds' numbers (docs/design/ACHIEVEMENTS.md).
 *
 * The Hall pays once in a chronicle's life — a tier, a challenge and a rank each — so none of this
 * is a rate: `sim:economy` does not model it, and ECONOMY.md §7 lists the whole pool instead.
 * Raising a tier's reward raises every achievement's; the per-ledger table is what makes a
 * campaign achievement feel like the campaign's and a Portal one like the Portal's.
 */
import type { Rarity } from '@content/champions/types';
import type { CurrencyAmount } from '@content/currencies/types';
import type { DeedLedger } from '@content/deeds/types';
import type { Difficulty } from './battle';

/** Tiers per achievement, I–V. */
export const ACHIEVEMENT_TIERS = 5;

/**
 * Renown per tier, I–V (ACHIEVEMENTS.md §2): doubling, so a finished achievement is worth 155 and
 * its last tier alone is worth half of that. Ranks stand on the sum, so changing a number here
 * moves how far into the Hall every rank sits.
 */
export const TIER_RENOWN: readonly number[] = [5, 10, 20, 40, 80];

/** What every tier pays, whichever achievement it belongs to (ACHIEVEMENTS.md §5). */
export const TIER_REWARDS: readonly (readonly CurrencyAmount[])[] = [
  [{ currency: 'gold', amount: 10_000 }],
  [{ currency: 'gems', amount: 20 }],
  [{ currency: 'gems', amount: 50 }],
  [{ currency: 'gems', amount: 100 }],
  [
    { currency: 'gems', amount: 150 },
    { currency: 'shard_ancient', amount: 1 },
  ],
];

/**
 * What each ledger adds on top of `TIER_REWARDS`, tier by tier: what that part of the game runs
 * on. Energy for the campaign, brews and tomes for champions, the Forge's materials for gear,
 * shards for the Portal, gold for the trials and for Emberhold, brews for the halls and tomes for
 * the ledgers. No keys: a key is a period's allowance, not a thing to bank.
 */
export const LEDGER_TIER_REWARDS: Readonly<Record<DeedLedger, readonly (readonly CurrencyAmount[])[]>> = {
  campaign: [
    [{ currency: 'energy', amount: 20 }],
    [{ currency: 'energy', amount: 40 }],
    [{ currency: 'energy', amount: 60 }],
    [{ currency: 'energy', amount: 80 }],
    [{ currency: 'energy', amount: 120 }],
  ],
  champions: [
    [{ currency: 'brew_universal', amount: 3 }],
    [{ currency: 'brew_universal', amount: 6 }],
    [{ currency: 'tome_epic', amount: 1 }],
    [{ currency: 'tome_epic', amount: 2 }],
    [{ currency: 'tome_legendary', amount: 1 }],
  ],
  gear: [
    [{ currency: 'mat_arcane_dust', amount: 10 }],
    [{ currency: 'mat_refining_core', amount: 2 }],
    [{ currency: 'mat_refining_core', amount: 4 }],
    [{ currency: 'mat_glyph_sigil', amount: 2 }],
    [{ currency: 'mat_glyph_sigil', amount: 5 }],
  ],
  portal: [
    [{ currency: 'shard_faded', amount: 1 }],
    [{ currency: 'shard_faded', amount: 2 }],
    [{ currency: 'shard_ancient', amount: 1 }],
    [{ currency: 'shard_ancient', amount: 2 }],
    [{ currency: 'shard_sacred', amount: 1 }],
  ],
  trials: [
    [{ currency: 'gold', amount: 10_000 }],
    [{ currency: 'gold', amount: 20_000 }],
    [{ currency: 'gold', amount: 40_000 }],
    [{ currency: 'gold', amount: 80_000 }],
    [{ currency: 'gold', amount: 160_000 }],
  ],
  halls: [
    [{ currency: 'brew_universal', amount: 3 }],
    [{ currency: 'brew_universal', amount: 6 }],
    [{ currency: 'brew_universal', amount: 10 }],
    [{ currency: 'brew_universal', amount: 15 }],
    [{ currency: 'brew_universal', amount: 25 }],
  ],
  emberhold: [
    [{ currency: 'gold', amount: 10_000 }],
    [{ currency: 'gold', amount: 25_000 }],
    [{ currency: 'gold', amount: 50_000 }],
    [{ currency: 'gold', amount: 100_000 }],
    [{ currency: 'gold', amount: 200_000 }],
  ],
  ledgers: [
    [{ currency: 'tome_rare', amount: 1 }],
    [{ currency: 'tome_rare', amount: 2 }],
    [{ currency: 'tome_epic', amount: 1 }],
    [{ currency: 'tome_epic', amount: 2 }],
    [{ currency: 'tome_legendary', amount: 1 }],
  ],
};

// ── Feats only a battle can tell (ACHIEVEMENTS.md §7) ─────────────────────────────────────────

/** Waves a fight must have had for "untouched" and "swift" to mean anything. */
export const FEAT_MIN_WAVES = 3;
/** Ally turns a three-wave stand may take and still be swift. */
export const FEAT_SWIFT_ALLY_TURNS = 6;
/** Champions a party must have fielded for "one left standing" and "one element" to be a feat. */
export const FEAT_PARTY_MIN = 3;
/** The rarities the Rabble may field — nobody better than Uncommon. */
export const FEAT_RABBLE_RARITIES: readonly Rarity[] = ['common', 'uncommon'];
/**
 * Where a lone champion's win and a swift clear count: Normal and Hard. Intro is where every
 * chronicle's first stands are fought alone, before there is anyone to field beside the starter.
 */
export const FEAT_PROVING_DIFFICULTIES: readonly Difficulty[] = ['normal', 'hard'];
/** The difficulty the Rabble, the Kindred and the Giant-slayer are asked on. */
export const FEAT_HARD_DIFFICULTY: Difficulty = 'hard';
