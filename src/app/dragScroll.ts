/**
 * Drag to scroll, everywhere the wheel scrolls (the owner's third batch).
 *
 * One document-level handler rather than a prop on every list: the game grows scrollers — the
 * Armoury's racks, the tower's ladder, a dialog's body — and a behaviour that has to be wired in
 * by hand is a behaviour that is missing from the next one. This finds the nearest scrollable
 * ancestor of whatever the pointer went down on and moves it, which covers every scroller the
 * game has and every scroller it will have.
 *
 * Three things keep it out of the way of the rest of the UI: it only takes the primary mouse
 * button (touch and pen already scroll natively), it only *starts* once the pointer has moved
 * past a threshold, and the click that ends a real drag is swallowed so that dragging across a
 * champion card does not also open it.
 */

/** Movement, in CSS px, before a press becomes a drag rather than a click. */
const DRAG_THRESHOLD = 5;

/** Elements that own the pointer themselves: the custom scrollbars, sliders, text fields. */
const EXCLUDED = 'input, textarea, [contenteditable="true"], [data-no-drag-scroll]';

function scrollableAncestor(from: EventTarget | null): HTMLElement | null {
  let el = from instanceof Element ? (from as HTMLElement) : null;
  while (el && el !== document.body) {
    const style = getComputedStyle(el);
    const scrollsY =
      el.scrollHeight - el.clientHeight > 2 && (style.overflowY === 'auto' || style.overflowY === 'scroll');
    const scrollsX =
      el.scrollWidth - el.clientWidth > 2 && (style.overflowX === 'auto' || style.overflowX === 'scroll');
    if (scrollsY || scrollsX) return el;
    el = el.parentElement;
  }
  return null;
}

export function installDragScroll(root: Document = document): () => void {
  let target: HTMLElement | null = null;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let dragging = false;

  const scale = (): number =>
    Number(getComputedStyle(document.documentElement).getPropertyValue('--vp-scale')) || 1;

  const reset = (): void => {
    target = null;
    dragging = false;
  };

  const onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 || e.pointerType !== 'mouse') return;
    const el = e.target as HTMLElement | null;
    if (el?.closest?.(EXCLUDED)) return;
    const scroller = scrollableAncestor(e.target);
    if (!scroller) return;
    target = scroller;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = scroller.scrollLeft;
    startTop = scroller.scrollTop;
    dragging = false;
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (!target) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!dragging && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
    dragging = true;
    // The stage is drawn at `--vp-scale`, so a mouse moved N CSS px crossed N / scale stage px.
    const k = scale();
    target.scrollTop = startTop - dy / k;
    target.scrollLeft = startLeft - dx / k;
  };

  const onPointerUp = (): void => {
    // The click lands after pointerup; `onClick` reads `dragging` and then clears it.
    if (!dragging) reset();
    target = null;
  };

  // Capture phase: a drag that ends over a card must not also press it.
  const onClick = (e: MouseEvent): void => {
    if (!dragging) return;
    dragging = false;
    e.stopPropagation();
    e.preventDefault();
  };

  root.addEventListener('pointerdown', onPointerDown, true);
  root.addEventListener('pointermove', onPointerMove, true);
  root.addEventListener('pointerup', onPointerUp, true);
  root.addEventListener('pointercancel', reset, true);
  root.addEventListener('click', onClick, true);
  return () => {
    root.removeEventListener('pointerdown', onPointerDown, true);
    root.removeEventListener('pointermove', onPointerMove, true);
    root.removeEventListener('pointerup', onPointerUp, true);
    root.removeEventListener('pointercancel', reset, true);
    root.removeEventListener('click', onClick, true);
  };
}
