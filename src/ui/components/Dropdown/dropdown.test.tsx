/**
 * Where a dropdown's list opens. A control near the foot of the stage used to open its list
 * straight past the edge — the campaign's difficulty selector, where only "Intro" could ever be
 * chosen because the rest of the list was clipped away (the owner's report).
 */
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import { Dropdown } from './Dropdown';

vi.mock('@audio/index', () => ({ playSfx: () => undefined }));

/** The stage drawn at half size, with a 40 px letterbox above it. */
const SCALE = 0.5;
const OFFSET_Y = 40;

function stage(children: ReactNode) {
  return (
    <ViewportContext.Provider
      value={{
        scale: SCALE,
        windowWidth: VIRTUAL_WIDTH * SCALE,
        windowHeight: VIRTUAL_HEIGHT * SCALE + OFFSET_Y * 2,
        offsetX: 0,
        offsetY: OFFSET_Y,
        backdrop: null,
        setBackdrop: () => undefined,
      }}
    >
      {children}
    </ViewportContext.Provider>
  );
}

/** Puts the control at `top` (screen pixels) and gives every list a layout height of `listHeight`. */
function place(top: number, listHeight: number): void {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top,
    bottom: top + 26,
    left: 0,
    right: 110,
    width: 110,
    height: 26,
    x: 0,
    y: top,
    toJSON: () => ({}),
  });
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(listHeight);
}

const OPTIONS = [
  { value: 'intro', label: 'Intro' },
  { value: 'normal', label: 'Normal' },
  { value: 'hard', label: 'Hard' },
] as const;

function difficulty() {
  return <Dropdown<string> label="Difficulty" value="intro" options={OPTIONS} onChange={() => undefined} />;
}

describe('a dropdown near the edge of the stage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('opens downward when the list fits below its control', async () => {
    place(OFFSET_Y + 100, 160);
    render(stage(difficulty()));
    await userEvent.click(screen.getByRole('combobox', { name: 'Difficulty' }));
    expect(screen.getByRole('listbox')).toHaveAttribute('data-placement', 'down');
  });

  it('opens upward at the foot of the stage, so every row can still be chosen', async () => {
    // The stage ends at 40 + 1080 × 0.5 = 580 on screen; the control sits at 520, and a 160 px list
    // is 80 screen pixels at this scale — more than the 34 left below it.
    place(520, 160);
    render(stage(difficulty()));
    await userEvent.click(screen.getByRole('combobox', { name: 'Difficulty' }));
    expect(screen.getByRole('listbox')).toHaveAttribute('data-placement', 'up');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Intro',
      'Normal',
      'Hard',
    ]);
  });
});
