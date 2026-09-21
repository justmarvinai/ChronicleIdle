/**
 * Reference teams and the win-rate bands the campaign is tuned against
 * (ROADMAP.md Phase 3 acceptance criteria).
 *
 * A band is a promise about the difficulty curve, not about a particular roster: "a starting
 * roster at level 10 clears Intro through settlement 3", "a mid-Epic roster clears Intro",
 * "Hard's last settlement needs an endgame roster". `pnpm sim:balance --strict` fails when one
 * breaks, so a balance edit that quietly walls the campaign off cannot ship.
 *
 * Rank-up (Phase 5) and gear (Phase 6) do not exist yet, so the later teams model them: `stars`
 * raises the star tier by hand and `gearMult` multiplies authored HP/ATK/DEF the way a full set of
 * gear eventually will (GEAR.md §5: roughly +120 % on a finished six-piece set).
 */
import type { Difficulty } from '@content/balance/battle';
import type { ChampionDef } from '@content/champions/types';
import { content } from '@content/registry';
import { createInstance } from '@engine/champions/instance';
import { levelCap } from '@engine/champions/stats';
import type { PartyMember } from '@engine/battle/create';

export interface SimTeam {
  id: string;
  label: string;
  /** Champion ids in slot order; slot 0 leads, so its aura applies. */
  champions: readonly string[];
  /** Star tier per champion; defaults to the rarity's base tier (what Phase 3 can reach). */
  stars?: readonly number[];
  /** A level, or the star tier's cap. */
  level: number | 'cap';
  /** Modelled gear: a flat multiplier on authored HP/ATK/DEF (1 = ungeared). */
  gearMult: number;
  /** Skill Tome steps applied to every ability (Phase 5). */
  skillUpgrades: number;
}

export const SIM_TEAMS: readonly SimTeam[] = [
  {
    id: 'starter_lv10',
    label: 'starter Lv10 (what a new save fields)',
    champions: ['champ.ser_corvin', 'champ.wenna_novice', 'champ.gil_scrapper'],
    level: 10,
    gearMult: 1,
    skillUpgrades: 0,
  },
  {
    id: 'starter_capped',
    label: 'starter at its star caps (3★30 + 1★10)',
    champions: ['champ.ser_corvin', 'champ.wenna_novice', 'champ.gil_scrapper'],
    level: 'cap',
    gearMult: 1,
    skillUpgrades: 0,
  },
  {
    id: 'mid_epic',
    label: 'mid Epic (4★40, ungeared)',
    champions: ['champ.khazgor', 'champ.anuria', 'champ.maruan'],
    level: 'cap',
    gearMult: 1,
    skillUpgrades: 1,
  },
  {
    id: 'late_game',
    // The mid roster one rank-up and one set of gear later — the yardstick the Brewery's fourth
    // stage is pitched at (BREWERY.md §7), since "late game" is not yet "finished".
    label: 'late game (5★50 Epic, half-geared)',
    champions: ['champ.khazgor', 'champ.anuria', 'champ.maruan'],
    stars: [5, 5, 5],
    level: 'cap',
    gearMult: 1.6,
    skillUpgrades: 2,
  },
  {
    id: 'endgame',
    label: 'endgame (6★60 Legendary/Mythic, geared)',
    champions: ['champ.aurelia_dawnwarden', 'champ.varkos_sundered_king', 'champ.seraphine_vale'],
    stars: [6, 6, 6],
    level: 'cap',
    gearMult: 2.2,
    skillUpgrades: 4,
  },
];

export const TEAM_BY_ID: Readonly<Record<string, SimTeam>> = Object.fromEntries(
  SIM_TEAMS.map((t) => [t.id, t]),
);

export interface Band {
  team: string;
  difficulty: Difficulty;
  /** 1..12 — the band is checked over that settlement's ten stages. */
  settlement: number;
  /** Inclusive bounds on the win rate over the settlement's stages. */
  min?: number;
  max?: number;
  why: string;
}

export const BANDS: readonly Band[] = [
  // The on-ramp: the roster a new chronicle is given walks Intro's first three settlements. It
  // cannot grow much in Phase 3 — no rank-up, no gear, no summoning — so "clearable" here means
  // clearable, with a retry or two on the boss stands.
  { team: 'starter_lv10', difficulty: 'intro', settlement: 1, min: 0.95, why: 'the tutorial stands here' },
  { team: 'starter_lv10', difficulty: 'intro', settlement: 3, min: 0.7, why: 'ROADMAP Phase 3 band' },
  {
    team: 'starter_capped',
    difficulty: 'intro',
    settlement: 5,
    min: 0.5,
    why: 'levelling alone carries this far',
  },
  // …and it must run out, or there is no reason to collect champions.
  {
    team: 'starter_lv10',
    difficulty: 'intro',
    settlement: 8,
    max: 0.35,
    why: 'a starting roster must stall',
  },
  { team: 'mid_epic', difficulty: 'intro', settlement: 12, min: 0.8, why: 'ROADMAP Phase 3 band' },
  { team: 'mid_epic', difficulty: 'normal', settlement: 1, min: 0.8, why: 'Normal opens as a farm' },
  {
    team: 'mid_epic',
    difficulty: 'hard',
    settlement: 12,
    max: 0.25,
    why: "Hard's end is not for mid rosters",
  },
  { team: 'endgame', difficulty: 'hard', settlement: 12, min: 0.7, why: 'ROADMAP Phase 3 band' },
];

/**
 * A promise about the Brewery's five-stage ladder (`BREWERY.md` §7): stage 1 is clearable the day
 * a chronicle starts and stage 5 is endgame. Because the four halls are held by four different
 * factions, a `min` band is checked against the *hardest* hall and a `max` band against the
 * *easiest* one — so "clearable on day one" means clearable in every hall, and "a mid roster must
 * stall" means it stalls even where the guards are weakest.
 */
export interface BreweryBand {
  team: string;
  /** 1..5. */
  stage: number;
  min?: number;
  max?: number;
  why: string;
}

export const BREWERY_BANDS: readonly BreweryBand[] = [
  { team: 'starter_lv10', stage: 1, min: 0.9, why: "day one, in every hall — the owner's brief" },
  { team: 'starter_lv10', stage: 2, max: 0.5, why: 'early game has to be something to grow into' },
  { team: 'starter_capped', stage: 2, min: 0.7, why: 'early game: levelling alone clears it' },
  { team: 'starter_capped', stage: 3, max: 0.3, why: 'mid game is past an ungeared starter' },
  { team: 'mid_epic', stage: 3, min: 0.7, why: 'mid game: a 4★ Epic roster farms it' },
  { team: 'mid_epic', stage: 4, max: 0.35, why: 'late game needs rank-ups and gear' },
  { team: 'late_game', stage: 4, min: 0.7, why: 'late game: a 5★ geared roster farms it' },
  { team: 'late_game', stage: 5, max: 0.35, why: 'the endgame stage is not for a late-game roster' },
  { team: 'endgame', stage: 5, min: 0.5, why: 'endgame: winnable in every hall, once finished' },
];

/** The champion definition a team fights with: authored stats times its modelled gear. */
function geared(def: ChampionDef, gearMult: number): ChampionDef {
  if (gearMult === 1) return def;
  return {
    ...def,
    stats: {
      ...def.stats,
      hp: Math.round(def.stats.hp * gearMult),
      atk: Math.round(def.stats.atk * gearMult),
      def: Math.round(def.stats.def * gearMult),
    },
  };
}

export function buildParty(team: SimTeam): PartyMember[] {
  return team.champions.map((id, i) => {
    const authored = content.championById(id as never);
    if (!authored) throw new Error(`sim team ${team.id}: unknown champion ${id}`);
    const def = geared(authored, team.gearMult);
    const instance = createInstance(def, { instanceId: `${team.id}-${i}`, now: 0, source: 'summon' });
    instance.stars = team.stars?.[i] ?? instance.stars;
    instance.level =
      team.level === 'cap' ? levelCap(instance.stars) : Math.min(team.level, levelCap(instance.stars));
    if (team.skillUpgrades > 0)
      for (const ability of def.abilities) instance.skillUpgrades[ability.id] = team.skillUpgrades;
    return { def, instance };
  });
}
