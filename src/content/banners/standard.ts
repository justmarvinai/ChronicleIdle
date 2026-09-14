import { SHARD_IDS } from '@content/balance/summon';
import type { BannerDef } from './types';

/** The standard portal: always open, all four shards, nobody weighted (SUMMONING.md §3). */
const standard: BannerDef = {
  id: 'banner.standard',
  kind: 'standard',
  name: 'banner.standard.name',
  description: 'banner.standard.description',
  shards: SHARD_IDS,
  version: 1,
};

export default standard;
