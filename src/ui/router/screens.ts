/** Lazy screen registry: each screen is its own chunk (docs/tech/ARCHITECTURE.md §6). */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { Route, RouteName } from '@state/ui-types';

export interface ScreenProps<R extends Route = Route> {
  route: R;
}

type Lazy = LazyExoticComponent<ComponentType<ScreenProps>>;

export const SCREENS: Record<RouteName, Lazy> = {
  title: lazy(() => import('@ui/screens/title/TitleScreen')),
  hub: lazy(() => import('@ui/screens/hub/HubScreen')),
  'game-modes': lazy(() => import('@ui/screens/game-modes/GameModesScreen')),
  locked: lazy(() => import('@ui/screens/locked/LockedScreen')),
  devkit: lazy(() => import('@ui/screens/devkit/DevKitScreen')),
};
