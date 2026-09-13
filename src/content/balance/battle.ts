/**
 * Battle tunables (docs/design/BATTLE.md §4, §5 and §11). Every number the simulation uses lives
 * here; changing one changes every battle in the game, so each carries what it affects.
 */
import type { StatusId } from '@content/champions/types';

/** Champions fielded per encounter type (BATTLE.md §1). */
export const PARTY_SIZE_CAMPAIGN = 3;
export const PARTY_SIZE_BOSS = 4;

/** Turn-meter gain per point of SPD per tick; lower = more ticks between turns (only relative SPD matters). */
export const TM_PER_SPD = 0.001;
/** A unit acts at TM ≥ 1; TM boosts may push it up to this cap before it acts. */
export const TM_OVERFLOW_CAP = 1.5;

/** Mitigation constant `K = DEF_K_BASE + DEF_K_PER_LEVEL × attackerLevel` (BATTLE.md §4.1): raising K weakens DEF. */
export const DEF_K_BASE = 1800;
export const DEF_K_PER_LEVEL = 15;

/** Damage variance band; every hit rolls uniformly inside it. */
export const VARIANCE_MIN = 0.95;
export const VARIANCE_MAX = 1.05;

/** A unit can carry at most this many statuses; further applications fail as "full". */
export const MAX_STATUSES_PER_UNIT = 10;

/** DoT and regen ticks as a fraction of max HP per turn start (BATTLE.md §5). */
export const POISON_PCT = 0.05;
export const BURN_PCT = 0.04;
/** Burn adds this multiple of the placer's ATK on top of the max-HP fraction. */
export const BURN_ATK_MULT = 0.6;
export const REGEN_PCT = 0.075;
/** Bleed repeats this fraction of the placing hit's damage each turn (`value` on the effect overrides, in %). */
export const BLEED_PCT = 0.05;

/** Counterattacks (the Counter buff and the `counterattack` passive) use A1 at this damage multiplier. */
export const COUNTER_DMG_MULT = 0.75;
/** Revive on Death brings the unit back at this fraction of max HP when the status carries no value. */
export const REVIVE_ON_DEATH_HP = 0.3;
/** Freeze makes the unit take this much more damage while frozen. */
export const FREEZE_DAMAGE_TAKEN = 0.1;
/** Fear: chance to skip the turn (bosses only). */
export const FEAR_SKIP_CHANCE = 0.5;

/** Turn limits (ally turns) per encounter type; encounters may override. */
export const CAMPAIGN_TURN_LIMIT_DEFAULT = 40;
export const BOSS_TURN_LIMIT_DAILY = 50;
export const BOSS_TURN_LIMIT_WEEKLY = 100;

/** Enemy scaling (BATTLE.md §4.5): `base × DIFFICULTY_MULT × (1 + STAGE_GROWTH × stageIndex)`. */
export const DIFFICULTY_MULT = { intro: 1.0, normal: 2.6, hard: 6.5 } as const;
export type Difficulty = keyof typeof DIFFICULTY_MULT;
export const STAGE_GROWTH = 0.055;
/** Stage bosses on top of the archetype: HP ×1.8, ATK/DEF ×1.25, SPD +4 (CAMPAIGN.md §5). */
export const BOSS_HP_MULT = 1.8;
export const BOSS_ATK_DEF_MULT = 1.25;
export const BOSS_SPD_ADD = 4;
/** Enrage: boss ATK grows by this fraction every `enrageEvery` own turns. */
export const BOSS_ENRAGE_STEP = 0.1;
export const BOSS_ENRAGE_EVERY = 8;

/** Stack limits for stackable debuffs (others refresh in place). */
export const STATUS_MAX_STACKS: Partial<Record<StatusId, number>> = { poison: 3, bleed: 2 };

/**
 * Default `value` per status when the effect gives none (BATTLE.md §5 tables): percentages for
 * stat buffs, flat RES for `res_up`, % of the caster's max HP for shields, % of damage
 * redirected for Ally Protection, % HP for Revive on Death, % more damage for Weaken, %
 * less healing for Heal Reduction; DoT fractions are the constants above.
 */
export const STATUS_DEFAULT_VALUE: Readonly<Record<StatusId, number>> = {
  atk_up: 25,
  def_up: 30,
  spd_up: 15,
  crit_rate_up: 15,
  res_up: 40,
  shield: 20,
  regen: 7.5,
  block_debuffs: 0,
  counter: 0,
  ally_protection: 30,
  revive_on_death: 30,
  veil: 0,
  atk_down: 25,
  def_down: 30,
  spd_down: 15,
  weaken: 15,
  poison: 5,
  burn: 4,
  bleed: 5,
  stun: 0,
  freeze: 0,
  sleep: 0,
  provoke: 0,
  heal_reduction: 50,
  block_buffs: 0,
  fear: 0,
};

/** Auto-battle policy thresholds (BATTLE.md §7 global rules). */
export const AI_HEAL_SKIP_TEAM_HP = 0.9;
export const AI_TM_BOOST_ALLIES_BELOW = 0.5;
export const AI_TM_BOOST_MIN_ALLIES = 2;
/** Priority added to buff abilities on the first ally action of a wave. */
export const AI_WAVE_START_BUFF_BONUS = 1;
