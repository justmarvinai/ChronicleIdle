import { battle } from './battle';
import { bosses } from './bosses';
import { brewery } from './brewery';
import { missions } from './missions';
import { palace } from './palace';
import { places } from './places';
import { quests } from './quests';
import { campaign } from './campaign';
import { champions } from './champions';
import { currencies } from './currencies';
import { deeds } from './deeds';
import { dungeons } from './dungeons';
import { market } from './market';
import { mine } from './mine';
import { enemies } from './enemies';
import { features } from './features';
import { gear } from './gear';
import { idle } from './idle';
import { instant } from './instant';
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
  ...titles,
  ...features,
  ...gear,
  ...idle,
  ...instant,
  ...indexScreen,
  ...sets,
  ...summoning,
  ...tavern,
  ...battle,
  ...bosses,
  ...brewery,
  ...dungeons,
  ...market,
  ...mine,
  ...palace,
  ...places,
  ...quests,
  ...missions,
  ...tower,
  ...tutorial,
  ...deeds,
} as const;
