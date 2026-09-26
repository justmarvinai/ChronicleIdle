/** Lazy screen registry: each screen is its own chunk (docs/tech/ARCHITECTURE.md §6). */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { Route, RouteName } from '@state/ui-types';

export interface ScreenProps<R extends Route = Route> {
  route: R;
}

type Lazy = LazyExoticComponent<ComponentType<ScreenProps>>;

export const SCREENS: Record<RouteName, Lazy> = {
  title: lazy(() => import('@ui/screens/title/TitleScreen')),
  starter: lazy(() => import('@ui/screens/starter/StarterScreen')),
  hub: lazy(() => import('@ui/screens/hub/HubScreen')),
  champions: lazy(() => import('@ui/screens/champions/ChampionsScreen')),
  tower: lazy(() => import('@ui/screens/tower/TowerScreen')),
  unwritten: lazy(() => import('@ui/screens/unwritten/UnwrittenScreen')),
  palace: lazy(() => import('@ui/screens/palace/PalaceScreen')),
  brewery: lazy(() => import('@ui/screens/brewery/BreweryScreen')),
  market: lazy(() => import('@ui/screens/market/MarketScreen')),
  dungeons: lazy(() => import('@ui/screens/dungeons/DungeonsScreen')),
  dungeon: lazy(() => import('@ui/screens/dungeons/DungeonScreen')),
  index: lazy(() => import('@ui/screens/index/IndexScreen')),
  'game-modes': lazy(() => import('@ui/screens/game-modes/GameModesScreen')),
  tavern: lazy(() => import('@ui/screens/tavern/TavernScreen')),
  armoury: lazy(() => import('@ui/screens/armoury/ArmouryScreen')),
  forge: lazy(() => import('@ui/screens/forge/ForgeScreen')),
  portal: lazy(() => import('@ui/screens/portal/PortalScreen')),
  'boss-menu': lazy(() => import('@ui/screens/bosses/BossMenuScreen')),
  bosses: lazy(() => import('@ui/screens/bosses/BossScreen')),
  quests: lazy(() => import('@ui/screens/quests/QuestsScreen')),
  missions: lazy(() => import('@ui/screens/missions/MissionsScreen')),
  deeds: lazy(() => import('@ui/screens/deeds/DeedsScreen')),
  campaign: lazy(() => import('@ui/screens/campaign/CampaignScreen')),
  settlement: lazy(() => import('@ui/screens/settlement/SettlementScreen')),
  'battle-setup': lazy(() => import('@ui/screens/battle-setup/BattleSetupScreen')),
  battle: lazy(() => import('@ui/screens/battle/BattleScreen')),
  'battle-result': lazy(() => import('@ui/screens/battle-result/BattleResultScreen')),
  locked: lazy(() => import('@ui/screens/locked/LockedScreen')),
  devkit: lazy(() => import('@ui/screens/devkit/DevKitScreen')),
  perf: lazy(() => import('@ui/screens/perf/PerfScreen')),
};
