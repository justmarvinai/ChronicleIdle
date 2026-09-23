import { useLayoutEffect, type RefObject } from 'react';

/**
 * Steps a one-line text's font size down until it fits its box — measured before paint, so a long
 * name never shows cut off and then shrinks, and a new champion with a longer name fits without
 * anyone touching the screen. `sizes` are tried in order, largest first; the stylesheet's size
 * holds when the text already fits, and past the last step the element's own overflow rule (an
 * ellipsis) takes over.
 */
export function useFitText(ref: RefObject<HTMLElement | null>, sizes: readonly number[], text: string): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.fontSize = '';
    for (const size of sizes) {
      if (element.scrollWidth <= element.clientWidth) return;
      element.style.fontSize = `${size}px`;
    }
  }, [ref, sizes, text]);
}
