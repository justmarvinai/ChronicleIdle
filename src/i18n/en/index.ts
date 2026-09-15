import { battle } from './battle';
import { campaign } from './campaign';
import { champions } from './champions';
import { currencies } from './currencies';
import { enemies } from './enemies';
import { features } from './features';
import { gear } from './gear';
import { idle } from './idle';
import { sets } from './sets';
import { summoning } from './summoning';
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
  ...gear,
  ...idle,
  ...sets,
  ...summoning,
  ...tavern,
  ...battle,
} as const;
