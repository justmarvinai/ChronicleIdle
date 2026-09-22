/**
 * The five Dungeons (docs/design/DUNGEONS.md).
 *
 * Four keeps are open from the first hour and the fifth is shut until accessories exist. Each one
 * holds a share of the game's fourteen gear sets, and the share is the whole point of choosing
 * one: the harder the keep, the better the sets behind it. `validateDungeons` proves every set
 * belongs to exactly one dungeon, so a set can never be unreachable and never be farmable in two
 * places at once.
 *
 * The ladder itself is not here — it is `balance/dungeon.ts`, because all four climb the same one.
 */
import { DUNGEON_KEEPERS } from './keepers';
import type { DungeonDef } from './types';

/**
 * The split, easiest keep first.
 *
 * - **Cindervault** takes the four sets a roster is built on: flat HP, DEF and ATK, and the shield
 *   that keeps a wave alive. Nothing here wins a fight on its own, and everything here is what a
 *   new chronicle is missing.
 * - **The Pale Expanse** takes the three that decide whether a debuff lands — resistance, accuracy
 *   and the regeneration that outlasts one. The stats a player stops ignoring on their second
 *   roster.
 * - **Velkora's Cradle** takes crit rate, crit damage and the counterattack, which together are
 *   the difference between damage and *damage*.
 * - **Ashenreach** takes the four that bend the turn order: speed, the extra turn, the lifesteal
 *   that makes a fast team unkillable, and the stun that takes a turn away. These are the best
 *   sets in the game, and this is the hardest place in the game to stand.
 */
const cindervault: DungeonDef = {
  id: 'dungeon.cindervault',
  slug: 'cindervault',
  name: 'dungeon.cindervault.name',
  description: 'dungeon.cindervault.description',
  lore: 'dungeon.cindervault.lore',
  order: 1,
  sets: ['gear_set.ember_guard', 'gear_set.ironhide', 'gear_set.warcry', 'gear_set.bulwark'],
  keeperId: 'enemy.cinder_warden',
  factionId: 'faction.ashen_legion',
  backdrop: 'bg.bg9',
  glyph: 'glyph.hammer_hit',
  surface: 'stone',
  version: 1,
};

const paleExpanse: DungeonDef = {
  id: 'dungeon.pale_expanse',
  slug: 'pale_expanse',
  name: 'dungeon.pale_expanse.name',
  description: 'dungeon.pale_expanse.description',
  lore: 'dungeon.pale_expanse.lore',
  order: 2,
  sets: ['gear_set.warding', 'gear_set.truesight', 'gear_set.immortal'],
  keeperId: 'enemy.pale_herald',
  factionId: 'faction.frostvein_tribe',
  backdrop: 'bg.bg5',
  glyph: 'glyph.holy_totem',
  surface: 'stone',
  version: 1,
};

const velkorasCradle: DungeonDef = {
  id: 'dungeon.velkoras_cradle',
  slug: 'velkoras_cradle',
  name: 'dungeon.velkoras_cradle.name',
  description: 'dungeon.velkoras_cradle.description',
  lore: 'dungeon.velkoras_cradle.lore',
  order: 3,
  sets: ['gear_set.keen_eye', 'gear_set.executioner', 'gear_set.retaliation'],
  keeperId: 'enemy.velkora',
  factionId: 'faction.marsh_horrors',
  backdrop: 'bg.bg2',
  glyph: 'glyph.cursed_eye',
  surface: 'water',
  version: 1,
};

const ashenreach: DungeonDef = {
  id: 'dungeon.ashenreach',
  slug: 'ashenreach',
  name: 'dungeon.ashenreach.name',
  description: 'dungeon.ashenreach.description',
  lore: 'dungeon.ashenreach.lore',
  order: 4,
  sets: ['gear_set.swiftfoot', 'gear_set.relentless', 'gear_set.lifedrinker', 'gear_set.stunlock'],
  keeperId: 'enemy.ashwake',
  factionId: 'faction.eclipse_cult',
  backdrop: 'bg.bg8',
  glyph: 'glyph.spirit_vortex',
  surface: 'dirt',
  version: 1,
};

/**
 * The fifth keep. It pays necklaces, rings and trinkets, and the game has no such slots yet — so
 * it ships shut, with its name, its story and the reason on its card, rather than open and paying
 * something it was not built to pay (`CLAUDE.md` §2.1). It holds no gear sets for the same reason:
 * its rewards are a slot family, not a set, and inventing sets for it now would be inventing the
 * wrong ones.
 */
const gildedVeil: DungeonDef = {
  id: 'dungeon.gilded_veil',
  slug: 'gilded_veil',
  name: 'dungeon.gilded_veil.name',
  description: 'dungeon.gilded_veil.description',
  lore: 'dungeon.gilded_veil.lore',
  order: 5,
  sets: [],
  keeperId: '',
  factionId: '',
  backdrop: 'bg.bg3',
  glyph: 'glyph.trophy_cup',
  surface: 'stone',
  lock: 'accessories',
  version: 1,
};

export const DUNGEONS: readonly DungeonDef[] = [
  cindervault,
  paleExpanse,
  velkorasCradle,
  ashenreach,
  gildedVeil,
];

export const DUNGEON_BY_ID: Readonly<Record<string, DungeonDef>> = Object.fromEntries(
  DUNGEONS.map((d) => [d.id, d]),
);
export const DUNGEON_BY_SLUG: Readonly<Record<string, DungeonDef>> = Object.fromEntries(
  DUNGEONS.map((d) => [d.slug, d]),
);

/** The keeps a chronicle can actually walk into — everything but the shut one. */
export const OPEN_DUNGEONS: readonly DungeonDef[] = DUNGEONS.filter((d) => d.lock === undefined);

export { DUNGEON_KEEPERS };
