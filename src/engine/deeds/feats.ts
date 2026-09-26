/**
 * Feats only a battle can tell (docs/design/ACHIEVEMENTS.md §7).
 *
 * A challenge that names *how* a fight was won cannot be read off the save afterwards: nothing
 * keeps who fought, who was left standing or whether anyone was scratched. So the moment a win is
 * recorded, the state layer hands its report here and bumps a lifetime counter for each feat it
 * shows (`feat.*`), which the challenges' goals read like any other counter. Pure: a function of
 * the battle's report, the stand it was and the fielded champions' definitions.
 */
import type { Difficulty } from '@content/balance/battle';
import {
  FEAT_HARD_DIFFICULTY,
  FEAT_MIN_WAVES,
  FEAT_PARTY_MIN,
  FEAT_PROVING_DIFFICULTIES,
  FEAT_RABBLE_RARITIES,
  FEAT_SWIFT_ALLY_TURNS,
} from '@content/balance/deeds';
import type { Element, Rarity } from '@content/champions/types';
import type { BattleOutcome } from '@engine/battle/types';
import type { CounterKey } from '@engine/progression/counters';

/** The feats a win can show, as the counters they bump. */
export type FeatKey = Extract<CounterKey, `feat.${string}`>;

/** The campaign stand a fight was. */
export interface FeatStand {
  difficulty: Difficulty;
  /** The settlement's boss — its tenth stand. */
  boss: boolean;
}

/** What a fielded champion is, for the feats that ask about the party's make-up. */
export interface FeatChampion {
  rarity: Rarity;
  element: Element;
}

export interface FeatInput {
  outcome: BattleOutcome;
  /** The campaign stand the fight was, or null for every other mode. */
  stand: FeatStand | null;
  /** A fielded champion's definition, by definition id. */
  champion: (defId: string) => FeatChampion | undefined;
}

/**
 * The feats a battle showed, in the order the Hall lists their challenges. Only a victory shows
 * any, and only the champions the player fielded count as the party — a unit the fight itself
 * brought in has no instance behind it.
 *
 * - `feat.solo` — one champion, a Normal or Hard stand.
 * - `feat.giant_slayer` — one champion, a settlement's boss on Hard.
 * - `feat.last_stand` — three or more fielded, exactly one standing at the end.
 * - `feat.untouched` — three waves or more, and no champion lost a point of health.
 * - `feat.swift` — a Normal or Hard stand of three waves in six ally turns or fewer.
 * - `feat.kindred` — a Hard stand, three or more champions, one element.
 * - `feat.rabble` — a Hard stand, nobody better than Uncommon.
 */
export function featsOf(input: FeatInput): FeatKey[] {
  const { outcome, stand } = input;
  if (outcome.kind !== 'victory') return [];
  const party = outcome.units.filter((unit) => unit.side === 'ally' && unit.instanceId !== null);
  if (party.length === 0) return [];

  const proving = stand !== null && FEAT_PROVING_DIFFICULTIES.includes(stand.difficulty);
  const hard = stand !== null && stand.difficulty === FEAT_HARD_DIFFICULTY;
  const alone = party.length === 1;
  const long = outcome.waveCount >= FEAT_MIN_WAVES;
  const feats: FeatKey[] = [];

  if (alone && proving) feats.push('feat.solo');
  if (alone && hard && stand?.boss === true) feats.push('feat.giant_slayer');
  if (party.length >= FEAT_PARTY_MIN && party.filter((unit) => unit.alive).length === 1)
    feats.push('feat.last_stand');
  if (long && party.every((unit) => unit.damageTaken === 0)) feats.push('feat.untouched');
  if (long && proving && outcome.allyTurns <= FEAT_SWIFT_ALLY_TURNS) feats.push('feat.swift');

  if (hard) {
    const defs = party.map((unit) => input.champion(unit.defId));
    const known = defs.filter((def): def is FeatChampion => def !== undefined);
    // A champion the content no longer knows cannot vouch for an element or a rarity.
    if (known.length === party.length) {
      if (party.length >= FEAT_PARTY_MIN && new Set(known.map((def) => def.element)).size === 1)
        feats.push('feat.kindred');
      if (known.every((def) => FEAT_RABBLE_RARITIES.includes(def.rarity))) feats.push('feat.rabble');
    }
  }
  return feats;
}
