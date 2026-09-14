/**
 * The featured rotation (docs/design/SUMMONING.md §3). Fourteen days per turn, counted from a
 * fixed UTC epoch: the same instant gives the same rotation index in every time zone and after
 * every reload, which is what lets a single-player game have a "current banner" with no server.
 *
 * Nothing here reads the clock — the caller passes the instant, as everywhere in `engine/`.
 */
import {
  PRIMORDIAL_EVERY,
  PRIMORDIAL_ROTATION_PITY,
  ROTATION_EPOCH,
  ROTATION_MS,
  SHARD_PITY,
  type PityRule,
  type ShardId,
} from '@content/balance/summon';
import type { BannerDef, RotationDef } from '@content/banners/types';
import type { ChampionId } from '@content/champions/types';

export interface RotationView {
  /** Turns since the epoch; 0 is the first rotation, and it never goes negative. */
  index: number;
  /** 1-based number a player sees. */
  number: number;
  rotation: RotationDef;
  /** Featured champions, Legendary first, then the Epics, then the Mythic if this is one. */
  featured: ChampionId[];
  /** Every fourth turn features the Mythic and hurries its mercy. */
  primordial: boolean;
  startsAt: number;
  endsAt: number;
}

/** Turns of the wheel since the epoch. Instants before it all read as the first rotation. */
export function rotationIndex(now: number): number {
  return Math.max(0, Math.floor((now - ROTATION_EPOCH) / ROTATION_MS));
}

/** When the rotation holding `now` began, to the millisecond. */
export function rotationStart(now: number): number {
  return ROTATION_EPOCH + rotationIndex(now) * ROTATION_MS;
}

/** Milliseconds until the wheel turns again. */
export function msUntilRotation(now: number): number {
  return rotationStart(now) + ROTATION_MS - now;
}

/** Whether the rotation at `index` is a Primordial Rotation (every fourth: 4, 8, 12 …). */
export function isPrimordialRotation(index: number): boolean {
  return (index + 1) % PRIMORDIAL_EVERY === 0;
}

/**
 * The banner as it stands at `now`. The cycle repeats when it runs out of authored rotations, so
 * a chronicle played far past the last row still sees a coherent banner.
 */
export function rotationAt(banner: BannerDef, now: number): RotationView | null {
  const rotations = banner.rotations ?? [];
  if (rotations.length === 0) return null;
  const index = rotationIndex(now);
  const rotation = rotations[index % rotations.length];
  if (!rotation) return null;
  const primordial = isPrimordialRotation(index);
  const featured: ChampionId[] = [rotation.legendary, ...rotation.epics];
  if (primordial && rotation.mythic) featured.push(rotation.mythic);
  const startsAt = rotationStart(now);
  return {
    index,
    number: index + 1,
    rotation,
    featured,
    primordial,
    startsAt,
    endsAt: startsAt + ROTATION_MS,
  };
}

/**
 * The mercy rules in force for a pull. A Primordial Rotation replaces the Primordial shard's own
 * Mythic rule with the faster one (SUMMONING.md §3); every other shard keeps its rules.
 */
export function pityRules(shard: ShardId, primordialRotation: boolean): readonly PityRule[] {
  const rules = SHARD_PITY[shard];
  if (!primordialRotation || shard !== 'primordial') return rules;
  return rules.map((rule) => (rule.rarity === 'mythic' ? PRIMORDIAL_ROTATION_PITY : rule));
}
