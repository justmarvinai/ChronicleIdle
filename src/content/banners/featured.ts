import { SHARD_IDS } from '@content/balance/summon';
import type { BannerDef, RotationDef } from './types';

/**
 * The featured cycle of SUMMONING.md §3, in order. Rotation 4 (index 3) is the Primordial
 * Rotation: Varkos is featured, and the Mythic pity climbs sooner there (`balance/summon.ts`).
 * The cycle continues from the top, so a sixth rotation is the first Legendary again with
 * different Epics — which is exactly what the table's last row says.
 */
const rotations: readonly RotationDef[] = [
  { legendary: 'champ.aurelia_dawnwarden', epics: ['champ.khazgor', 'champ.maruan'] },
  { legendary: 'champ.vorrak_bloodhowl', epics: ['champ.thordakk', 'champ.sethlurias'] },
  { legendary: 'champ.seraphine_vale', epics: ['champ.maruan', 'champ.anuria'] },
  {
    legendary: 'champ.morrigan_nightweaver',
    epics: ['champ.rattledagger', 'champ.darius'],
    mythic: 'champ.varkos_sundered_king',
  },
  { legendary: 'champ.kaelith_stormcaller', epics: ['champ.anuria', 'champ.darius'] },
  { legendary: 'champ.aurelia_dawnwarden', epics: ['champ.khazgor', 'champ.thordakk'] },
];

const featured: BannerDef = {
  id: 'banner.featured',
  kind: 'featured',
  name: 'banner.featured.name',
  description: 'banner.featured.description',
  shards: SHARD_IDS,
  rotations,
  version: 1,
};

export default featured;
