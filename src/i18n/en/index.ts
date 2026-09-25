import { battle } from './battle';
import { bosses } from './bosses';
import { brewery } from './brewery';
import { missions } from './missions';
import { palace } from './palace';
import { places } from './places';
import { quests } from './quests';
import { campaign } from './campaign';
import { changelog } from './changelog';
import { champions } from './champions';
import { currencies } from './currencies';
import { dungeons } from './dungeons';
import { market } from './market';
import { enemies } from './enemies';
import { features } from './features';
import { gear } from './gear';
import { idle } from './idle';
import { indexScreen } from './index-screen';
import { sets } from './sets';
import { summoning } from './summoning';
import { tavern } from './tavern';
import { titles } from './titles';
import { tower } from './tower';
import { tutorial } from './tutorial';
import { ui } from './ui';

export const en = {
  ...currencies,
  ...ui,
  ...champions,
  ...enemies,
  ...campaign,
  ...changelog,
  ...titles,
  ...features,
  ...gear,
  ...idle,
  ...indexScreen,
  ...sets,
  ...summoning,
  ...tavern,
  ...battle,
  ...bosses,
  ...brewery,
  ...dungeons,
  ...market,
  ...palace,
  ...places,
  ...quests,
  ...missions,
  ...tower,
  ...tutorial,
} as const;
