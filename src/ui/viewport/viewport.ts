/**
 * Virtual-resolution contract shared by the viewport component and everything that needs to map
 * window pixels to stage pixels (tooltips, parallax, Pixi layers). docs/tech/UI_DESIGN.md §2.
 */
import { createContext, useContext } from 'react';

export const VIRTUAL_WIDTH = 1920;
export const VIRTUAL_HEIGHT = 1080;

export interface ViewportInfo {
  scale: number;
  /** Real window size in CSS px. */
  windowWidth: number;
  windowHeight: number;
  /** Offsets of the stage inside the window in CSS px (letterbox/pillarbox). */
  offsetX: number;
  offsetY: number;
}

export interface ViewportContextValue extends ViewportInfo {
  setBackdrop(url: string | null): void;
  backdrop: string | null;
}

export const ViewportContext = createContext<ViewportContextValue | null>(null);

export function useViewport(): ViewportContextValue {
  const ctx = useContext(ViewportContext);
  if (!ctx) throw new Error('useViewport must be used inside <GameViewport>');
  return ctx;
}

/** Converts a window-space pointer position into virtual stage coordinates. */
export function toStageCoords(
  info: ViewportInfo,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  return { x: (clientX - info.offsetX) / info.scale, y: (clientY - info.offsetY) / info.scale };
}
