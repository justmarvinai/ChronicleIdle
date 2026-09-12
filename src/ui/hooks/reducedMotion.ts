/**
 * Reduced motion is decided once at boot (system preference or the player's setting) and mirrored
 * onto `<html data-reduced-motion>` by app/bootstrap so CSS and hooks read the same answer.
 */
export function prefersReducedMotion(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset['reducedMotion'] === 'true';
}
