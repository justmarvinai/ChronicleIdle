/**
 * Drag to scroll (the owner's third batch): the document-level handler that moves the nearest
 * scrollable ancestor of whatever the pointer went down on, and keeps out of the way of clicks.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDragScroll } from './dragScroll';

/** jsdom lays nothing out, so a scroller has to be told it overflows. */
function scroller({ overflow = 400 } = {}): HTMLDivElement {
  const el = document.createElement('div');
  el.style.overflowY = 'auto';
  Object.defineProperty(el, 'clientHeight', { value: 200, configurable: true });
  Object.defineProperty(el, 'scrollHeight', { value: 200 + overflow, configurable: true });
  Object.defineProperty(el, 'clientWidth', { value: 300, configurable: true });
  Object.defineProperty(el, 'scrollWidth', { value: 300, configurable: true });
  document.body.append(el);
  return el;
}

const down = (target: Element, x: number, y: number): void => {
  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      button: 0,
      pointerType: 'mouse',
      clientX: x,
      clientY: y,
    }),
  );
};
const move = (target: Element, x: number, y: number): void => {
  target.dispatchEvent(
    new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', clientX: x, clientY: y }),
  );
};
const up = (target: Element): void => {
  target.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse' }));
};

let uninstall: () => void;

beforeEach(() => {
  uninstall = installDragScroll();
});
afterEach(() => {
  uninstall();
  document.body.innerHTML = '';
});

describe('dragging a list', () => {
  it('scrolls the list under the pointer, against the direction of the drag', () => {
    const el = scroller();
    el.scrollTop = 100;
    down(el, 0, 200);
    move(el, 0, 150);
    expect(el.scrollTop).toBe(150);
    move(el, 0, 260);
    expect(el.scrollTop).toBe(40);
    up(el);
  });

  it('is a click until the pointer has really moved', () => {
    const el = scroller();
    el.scrollTop = 100;
    down(el, 0, 200);
    // Two pixels is a hand resting on a button, not a drag.
    move(el, 0, 198);
    expect(el.scrollTop).toBe(100);
    move(el, 0, 190);
    expect(el.scrollTop).toBe(110);
  });

  it('swallows the click that ends a drag, and leaves a plain click alone', () => {
    const el = scroller();
    const card = document.createElement('button');
    el.append(card);
    const pressed = vi.fn();
    card.addEventListener('click', pressed);

    down(card, 0, 200);
    move(card, 0, 120);
    up(card);
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(pressed).not.toHaveBeenCalled();

    down(card, 0, 200);
    up(card);
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(pressed).toHaveBeenCalledTimes(1);
  });

  it('leaves alone what owns the pointer itself: the scrollbar thumb, fields, sliders', () => {
    const el = scroller();
    for (const html of ['<div data-no-drag-scroll></div>', '<input />', '<textarea></textarea>']) {
      el.innerHTML = html;
      const child = el.firstElementChild as HTMLElement;
      el.scrollTop = 100;
      down(child, 0, 200);
      move(child, 0, 100);
      expect(el.scrollTop).toBe(100);
      up(child);
    }
  });

  it('does nothing where there is nothing to scroll', () => {
    const el = scroller({ overflow: 0 });
    down(el, 0, 200);
    move(el, 0, 100);
    expect(el.scrollTop).toBe(0);
  });

  it('ignores the right button and touch, which scrolls itself', () => {
    const el = scroller();
    el.scrollTop = 100;
    el.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 2, pointerType: 'mouse', clientY: 200 }),
    );
    move(el, 0, 100);
    expect(el.scrollTop).toBe(100);

    el.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'touch', clientY: 200 }),
    );
    move(el, 0, 100);
    expect(el.scrollTop).toBe(100);
  });
});
