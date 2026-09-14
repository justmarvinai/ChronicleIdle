import { battle } from './battle';
import { campaign } from './campaign';
import { champions } from './champions';
import { currencies } from './currencies';
import { enemies } from './enemies';
import { features } from './features';
import { sets } from './sets';
import { tavern } from './tavern';
import { titles } from './titles';
import { ui } from './ui';

export const en = {
  ...currencies,
  ...ui,
  ...champions,
  ...enemies,
  ...campaign,
  ...titles,
  ...features,
  ...sets,
  ...tavern,
  ...battle,
} as const;
