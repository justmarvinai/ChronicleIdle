/**
 * Energy (docs/design/ECONOMY.md §5, owner's answer Q15). Energy paces campaign play; the model
 * is deliberately generous in the first days.
 */

/** Energy cap at player level 1. Cap = ENERGY_BASE_CAP + ENERGY_CAP_PER_LEVEL × (level − 1). */
export const ENERGY_BASE_CAP = 60;
/** Cap growth per player level (Q15: +10 per level). */
export const ENERGY_CAP_PER_LEVEL = 10;
/** One energy regenerates every N seconds while below the cap (Q15: +1 per minute). */
export const ENERGY_REGEN_SECONDS = 60;
/** Gem price of one refill and the energy it grants (no daily limit). */
export const ENERGY_REFILL_GEMS = 50;
export const ENERGY_REFILL_AMOUNT = 100;

/**
 * Chronicler's Provisions and other fixed early grants (docs/design/ECONOMY.md §5.1). Each grant
 * is claimed at most once per chronicle; the id is stored in the save.
 */
export const ENERGY_PROVISIONS = {
  'tutorial.awakening': 500,
  'tutorial.the_hold': 250,
  'tutorial.the_binding': 250,
  'tutorial.routine': 250,
  'tutorial.the_path': 250,
} as const satisfies Readonly<Record<string, number>>;

/** The grants above, by id — the tutorial's chapters name one each (`TUTORIAL.md` §Provisions). */
export type ProvisionId = keyof typeof ENERGY_PROVISIONS;
