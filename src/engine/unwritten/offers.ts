/**
 * Drawing an inscription offer (docs/design/UNWRITTEN.md §7.1, §7.6).
 *
 * Each card is drawn on its own: a rarity from the offer's source (a Skirmish leans Common, a
 * Warden only Epic and Legendary), one rarity higher now and then under the Scholar's Loupe; then,
 * sometimes, a blend of two inks the company already holds; otherwise an ink — half again as
 * likely if the company already writes in it — and an inscription of that ink and rarity the offer
 * does not already show. An inscription already held is offered as its next level. Draws fall back
 * gracefully when a rarity has run dry, so an offer is always as full as the pool allows.
 */
import { BLEND_CHANCE, HELD_INK_WEIGHT, INSCRIPTION_LEVELS, OFFER_WEIGHTS } from '@content/balance/unwritten';
import {
  INKS,
  INSCRIPTION_RARITIES,
  type InkId,
  type InscriptionDef,
  type InscriptionRarity,
} from '@content/unwritten/types';
import type { Rng } from '@engine/rng/rng';
import type { HeldInscription, OfferCard, Pending } from '@engine/schema/unwritten-save';
import type { Rules } from './rules';

export type OfferSource = Extract<Pending, { kind: 'offer' }>['from'];

/** The inks a company writes in, counting a blend for both of its inks. */
export function inkCounts(
  held: readonly HeldInscription[],
  byId: (id: string) => InscriptionDef | undefined,
): Record<InkId, number> {
  const counts = Object.fromEntries(INKS.map((ink) => [ink, 0])) as Record<InkId, number>;
  for (const { id } of held) for (const ink of byId(id)?.inks ?? []) counts[ink] += 1;
  return counts;
}

/** Whether an inscription may be offered at all: in a volume the Scriptorium has opened, and not maxed. */
function inPool(def: InscriptionDef, rules: Rules, held: readonly HeldInscription[]): boolean {
  const blend = def.inks.length > 1;
  if (blend ? rules.blends < 1 : def.volume > rules.volume_inscriptions) return false;
  const have = held.find((h) => h.id === def.id);
  return !have || have.level < INSCRIPTION_LEVELS;
}

function rarityFor(rng: Rng, source: OfferSource, rules: Rules): InscriptionRarity {
  if (source === 'start') return 'rare';
  const table = OFFER_WEIGHTS[source === 'duel' ? 'warden' : source];
  const legendaryOpen = source !== 'skirmish' || rules.offer_legendary_skirmish >= 1;
  const rarity = rng.weighted(
    INSCRIPTION_RARITIES.map((item) => ({
      item,
      // A Skirmish's Legendary share goes to Epic until the Master's Hand is written.
      weight:
        item === 'legendary' && !legendaryOpen
          ? 0
          : item === 'epic' && !legendaryOpen
            ? table.epic + table.legendary
            : table[item],
    })),
  );
  if (rarity !== 'legendary' && rules.offer_rarity_bump > 0 && rng.chance(rules.offer_rarity_bump)) {
    const next = INSCRIPTION_RARITIES[INSCRIPTION_RARITIES.indexOf(rarity) + 1];
    if (next && (next !== 'legendary' || legendaryOpen)) return next;
  }
  return rarity;
}

export interface OfferInput {
  rng: Rng;
  source: OfferSource;
  rules: Rules;
  held: readonly HeldInscription[];
  inscriptions: readonly InscriptionDef[];
  /** How many cards; the rules' `offer_size` unless a caller asks for fewer (the Peddler's cloth). */
  size?: number;
}

/** The cards of one offer, each at the level it would be written at. */
export function drawOffer(input: OfferInput): OfferCard[] {
  const { rng, source, rules, held } = input;
  const byId = (id: string) => input.inscriptions.find((def) => def.id === id);
  const pool = input.inscriptions.filter((def) => inPool(def, rules, held));
  const counts = inkCounts(held, byId);
  const heldInks = INKS.filter((ink) => counts[ink] > 0);
  const size = Math.max(1, Math.round(input.size ?? rules.offer_size));
  const chosen: InscriptionDef[] = [];
  const free = (def: InscriptionDef) => !chosen.includes(def);

  for (let slot = 0; slot < size; slot += 1) {
    let pick: InscriptionDef | undefined;
    if (heldInks.length >= 2 && rules.blends >= 1 && source !== 'start' && rng.chance(BLEND_CHANCE)) {
      const blends = pool.filter(
        (def) => def.inks.length > 1 && def.inks.every((ink) => counts[ink] > 0) && free(def),
      );
      if (blends.length) pick = rng.pick(blends);
    }
    if (!pick) {
      const rarity = rarityFor(rng, source, rules);
      const singles = pool.filter((def) => def.inks.length === 1 && free(def));
      const ink = rng.weighted(
        INKS.map((item) => ({ item, weight: counts[item] > 0 ? HELD_INK_WEIGHT : 1 })),
      );
      const tiers = [rarity, ...INSCRIPTION_RARITIES.filter((r) => r !== rarity)];
      // The ink and rarity drawn, then the same rarity in any ink, then the nearest rarity left.
      pick =
        pickFrom(
          rng,
          singles.filter((def) => def.inks[0] === ink && def.rarity === rarity),
        ) ??
        tiers
          .map((r) =>
            pickFrom(
              rng,
              singles.filter((def) => def.rarity === r),
            ),
          )
          .find((def) => def !== undefined);
    }
    if (!pick) break;
    chosen.push(pick);
  }
  return chosen.map((def) => ({ id: def.id, level: (held.find((h) => h.id === def.id)?.level ?? 0) + 1 }));
}

function pickFrom<T>(rng: Rng, items: readonly T[]): T | undefined {
  return items.length ? rng.pick(items) : undefined;
}
