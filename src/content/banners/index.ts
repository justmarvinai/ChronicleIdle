/** The two EA-0.1 banners (docs/design/SUMMONING.md §3). */
import featured from './featured';
import standard from './standard';
import type { BannerDef } from './types';

export const BANNERS: readonly BannerDef[] = [standard, featured];

export const BANNER_BY_ID: Readonly<Record<string, BannerDef>> = Object.fromEntries(
  BANNERS.map((banner) => [banner.id, banner]),
);
