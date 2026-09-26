import { SHARD_IDS } from '@content/balance/summon';
import type { ChampionId } from '@content/champions/types';
import type { BannerDef, RotationDef } from './types';

/**
 * The featured cycle of SUMMONING.md §3. Two wheels turn together, one notch per rotation: the
 * five summonable Legendaries in order, and six pairs of Epics. Five and six share no factor, so
 * every Legendary meets every pair once in thirty rotations and no Legendary ever stands on two
 * rotations running — which a single list of six rows could not promise with only five Legendaries
 * to fill it (until 0.9.10 Aurelia led two rotations back to back every time the list wrapped).
 */
const LEGENDARIES: readonly ChampionId[] = [
  'champ.aurelia_dawnwarden',
  'champ.vorrak_bloodhowl',
  'champ.seraphine_vale',
  'champ.morrigan_nightweaver',
  'champ.kaelith_stormcaller',
];

const EPIC_PAIRS: readonly (readonly ChampionId[])[] = [
  ['champ.khazgor', 'champ.maruan'],
  ['champ.thordakk', 'champ.sethlurias'],
  ['champ.maruan', 'champ.anuria'],
  ['champ.rattledagger', 'champ.darius'],
  ['champ.anuria', 'champ.darius'],
  ['champ.khazgor', 'champ.thordakk'],
];

/**
 * The Mythic every Primordial Rotation features. A Primordial Rotation is every fourth one, and the
 * thirty-row cycle meets them on different rows each time round, so every row names it and the
 * engine shows it only when the rotation is Primordial (`@engine/summon/rotation`).
 */
const PRIMORDIAL_MYTHIC: ChampionId = 'champ.varkos_sundered_king';

/**
 * Where the Legendary wheel starts. The cycle was re-cut in 0.9.10 while the nineteenth rotation
 * (opened 14 September 2026, Aurelia) was running; starting the wheel two notches on keeps the
 * Legendary and the Epics of that rotation and of the five after it exactly as they were, and
 * changes only what came next.
 */
const LEGENDARY_PHASE = 2;

function nth<T>(list: readonly T[], index: number): T {
  const value = list[index % list.length];
  if (value === undefined) throw new Error(`featured cycle: nothing at ${index} of ${list.length}`);
  return value;
}

const rotations: readonly RotationDef[] = Array.from(
  { length: LEGENDARIES.length * EPIC_PAIRS.length },
  (_, index): RotationDef => ({
    legendary: nth(LEGENDARIES, index + LEGENDARY_PHASE),
    epics: nth(EPIC_PAIRS, index),
    mythic: PRIMORDIAL_MYTHIC,
  }),
);

const featured: BannerDef = {
  id: 'banner.featured',
  kind: 'featured',
  name: 'banner.featured.name',
  description: 'banner.featured.description',
  shards: SHARD_IDS,
  rotations,
  version: 2,
};

export default featured;
