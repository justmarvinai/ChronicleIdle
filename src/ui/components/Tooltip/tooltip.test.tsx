/**
 * Where a tooltip opens. The first placement can only guess the box's size, since the box does not
 * exist until it opens; a tall one near the foot of the stage — a worn piece's full sheet under the
 * champion's stats — ran off the bottom until the pointer moved.
 */
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import { Tooltip } from './Tooltip';

/** The tooltip's layout height in these tests: taller than the first guess. */
const TALL = 300;

function stage(children: ReactNode) {
  return (
    <ViewportContext.Provider
      value={{
        scale: 1,
        windowWidth: VIRTUAL_WIDTH,
        windowHeight: VIRTUAL_HEIGHT,
        offsetX: 0,
        offsetY: 0,
        backdrop: null,
        setBackdrop: () => undefined,
      }}
    >
      <div id="tooltip-layer" />
      {children}
    </ViewportContext.Provider>
  );
}

describe('a tooltip near the foot of the stage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(TALL);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(200);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('opens above the pointer by its measured height, whole on the stage', () => {
    render(
      stage(
        <Tooltip content="A long sheet of numbers">
          <button type="button">Worn weapon</button>
        </Tooltip>,
      ),
    );
    const pointerY = 1000;
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Worn weapon' }).parentElement!, {
      clientX: 400,
      clientY: pointerY,
    });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    const tip = screen.getByRole('tooltip');
    const top = Number.parseFloat(tip.style.top);
    expect(top).toBe(pointerY - TALL - 12);
    expect(top + TALL).toBeLessThanOrEqual(VIRTUAL_HEIGHT);
  });
});
