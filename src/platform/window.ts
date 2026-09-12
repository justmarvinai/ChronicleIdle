/**
 * Window helpers: fullscreen (offered, never forced — owner's answer Q27) and standalone (PWA)
 * detection. The Electron adapter later maps the same functions to BrowserWindow.
 */
export function isFullscreen(): boolean {
  return typeof document !== 'undefined' && document.fullscreenElement !== null;
}

export function fullscreenSupported(): boolean {
  return typeof document !== 'undefined' && typeof document.documentElement.requestFullscreen === 'function';
}

export async function requestFullscreen(): Promise<boolean> {
  if (!fullscreenSupported() || isFullscreen()) return isFullscreen();
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    return true;
  } catch {
    return false;
  }
}

export async function exitFullscreen(): Promise<void> {
  if (isFullscreen()) {
    try {
      await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  }
}

export async function toggleFullscreen(): Promise<boolean> {
  if (isFullscreen()) {
    await exitFullscreen();
    return false;
  }
  return requestFullscreen();
}

export function onFullscreenChange(listener: (active: boolean) => void): () => void {
  const handler = (): void => listener(isFullscreen());
  document.addEventListener('fullscreenchange', handler);
  return () => document.removeEventListener('fullscreenchange', handler);
}

/** True when running as an installed PWA (standalone window) rather than a browser tab. */
export function isStandalone(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      window.matchMedia?.('(display-mode: fullscreen)').matches)
  );
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
