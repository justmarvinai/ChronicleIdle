import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VirtualGrid } from './VirtualGrid';

const COLUMNS = 4;
const CELL_W = 100;
const CELL_H = 50;
const GAP = 10;
const HEAD_H = 40;

const items = (n: number, prefix = 'i'): string[] => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

const common = {
  columns: COLUMNS,
  cellWidth: CELL_W,
  cellHeight: CELL_H,
  gap: GAP,
  height: 400,
  keyOf: (item: string) => item,
  renderItem: (item: string) => <span data-testid={`cell-${item}`}>{item}</span>,
};

/** The absolutely-placed box a cell or heading sits in, so its offset can be read back. */
const boxOf = (el: HTMLElement): HTMLElement => el.parentElement as HTMLElement;
const spacer = (): HTMLElement => screen.getByTestId('virtual-grid').firstElementChild as HTMLElement;

describe('the windowed grid', () => {
  it('lays a flat list out on the cell lattice', () => {
    render(<VirtualGrid {...common} items={items(5)} />);
    // Two rows of four (the second holds one), and the spacer is the rows without the last gap.
    expect(spacer().style.height).toBe('110px');
    expect(boxOf(screen.getByTestId('cell-i0')).style.transform).toBe('translate(0px, 0px)');
    expect(boxOf(screen.getByTestId('cell-i3')).style.transform).toBe('translate(330px, 0px)');
    expect(boxOf(screen.getByTestId('cell-i4')).style.transform).toBe('translate(0px, 60px)');
  });

  it('opens each section with its heading and stacks the rest below it', () => {
    render(
      <VirtualGrid
        {...common}
        sections={[
          { id: 'first', items: items(2, 'a') },
          { id: 'second', items: items(3, 'b') },
        ]}
        headerHeight={HEAD_H}
        renderHeader={(section) => <span data-testid={`head-${section.id}`}>{section.id}</span>}
      />,
    );
    // head 40 + gap, one row of 50 + gap, then the second section's head and row.
    expect(boxOf(screen.getByTestId('head-first')).style.transform).toBe('translateY(0px)');
    expect(boxOf(screen.getByTestId('cell-a0')).style.transform).toBe('translate(0px, 50px)');
    expect(boxOf(screen.getByTestId('head-second')).style.transform).toBe('translateY(110px)');
    expect(boxOf(screen.getByTestId('cell-b0')).style.transform).toBe('translate(0px, 160px)');
    expect(boxOf(screen.getByTestId('cell-b2')).style.transform).toBe('translate(220px, 160px)');
    expect(spacer().style.height).toBe('210px');
  });

  it('numbers the items straight through the sections', () => {
    const seen: number[] = [];
    render(
      <VirtualGrid
        {...common}
        renderItem={(item, index) => {
          seen.push(index);
          return <span data-testid={`cell-${item}`}>{item}</span>;
        }}
        sections={[
          { id: 'first', items: items(2, 'a') },
          { id: 'second', items: items(2, 'b') },
        ]}
        headerHeight={HEAD_H}
        renderHeader={() => null}
      />,
    );
    expect(seen).toEqual([0, 1, 2, 3]);
  });

  it('says so when there is nothing to show, sections or not', () => {
    const { rerender } = render(<VirtualGrid {...common} items={[]} emptyLabel="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    // An empty section is still nothing to show: the heading alone is not content.
    rerender(
      <VirtualGrid
        {...common}
        sections={[{ id: 'first', items: [] }]}
        headerHeight={HEAD_H}
        renderHeader={() => null}
        emptyLabel="Nothing here"
      />,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});
