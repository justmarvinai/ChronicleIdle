/**
 * Browser-chrome guards (docs/tech/UI_DESIGN.md §2.1): no context menu, no text selection or
 * image drags outside inputs, no browser zoom shortcuts, no accidental back navigation.
 * Fullscreen is offered elsewhere and never forced (owner's answer Q27).
 */
const isEditable = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return !!el.closest('input, textarea, [contenteditable="true"]');
};

export function installInputGuards(root: Document = document): () => void {
  const onContextMenu = (e: Event): void => {
    if (!isEditable(e.target)) e.preventDefault();
  };
  const onSelectStart = (e: Event): void => {
    if (!isEditable(e.target)) e.preventDefault();
  };
  const onDragStart = (e: Event): void => {
    if (!isEditable(e.target)) e.preventDefault();
  };
  const onKeyDown = (e: KeyboardEvent): void => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0' || e.key === '_'))
      e.preventDefault();
    if (e.key === 'Backspace' && !isEditable(e.target)) e.preventDefault();
    if (e.altKey && e.key === 'ArrowLeft') e.preventDefault();
    if (e.key === 'Tab' && e.altKey) e.preventDefault();
  };
  const onWheel = (e: WheelEvent): void => {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
  };
  const onGesture = (e: Event): void => e.preventDefault();

  root.addEventListener('contextmenu', onContextMenu);
  root.addEventListener('selectstart', onSelectStart);
  root.addEventListener('dragstart', onDragStart);
  root.addEventListener('keydown', onKeyDown);
  root.addEventListener('wheel', onWheel, { passive: false });
  root.addEventListener('gesturestart', onGesture);
  return () => {
    root.removeEventListener('contextmenu', onContextMenu);
    root.removeEventListener('selectstart', onSelectStart);
    root.removeEventListener('dragstart', onDragStart);
    root.removeEventListener('keydown', onKeyDown);
    root.removeEventListener('wheel', onWheel);
    root.removeEventListener('gesturestart', onGesture);
  };
}
