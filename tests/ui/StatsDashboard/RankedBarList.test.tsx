import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RankedBarList } from '@/ui/StatsDashboard/RankedBarList';

describe('RankedBarList', () => {
  it('renders one row per item with counts', () => {
    render(
      <RankedBarList
        items={[
          { name: 'B738', count: 10 },
          { name: 'A320', count: 5 },
        ]}
        emptyText="No data"
      />,
    );
    expect(screen.getByText('B738')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('normalizes bar width to the max count', () => {
    render(
      <RankedBarList
        items={[
          { name: 'A', count: 10 },
          { name: 'B', count: 5 },
        ]}
        emptyText="No data"
      />,
    );
    const bars = screen.getAllByTestId('ranked-bar-fill');
    expect(bars[0].style.width).toBe('100%');
    expect(bars[1].style.width).toBe('50%');
  });

  it('renders empty text when items are empty', () => {
    render(<RankedBarList items={[]} emptyText="No data" />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('renders zero-width bars when all counts are zero', () => {
    render(<RankedBarList items={[{ name: 'A', count: 0 }]} emptyText="No data" />);
    expect(screen.getAllByTestId('ranked-bar-fill')[0].style.width).toBe('0%');
  });

  it('colors bars by rank using the series palette', () => {
    render(
      <RankedBarList
        items={[
          { name: 'A', count: 10 },
          { name: 'B', count: 8 },
          { name: 'C', count: 5 },
        ]}
        emptyText="No data"
      />,
    );
    const bars = screen.getAllByTestId('ranked-bar-fill');
    expect(bars[0].style.backgroundColor).toBe('rgb(251, 191, 36)'); // amber
    expect(bars[1].style.backgroundColor).toBe('rgb(56, 189, 248)'); // sky
    expect(bars[2].style.backgroundColor).toBe('rgb(52, 211, 153)'); // emerald
    expect(bars[0].style.opacity).toBe('');
  });

  it('applies a custom label width class when provided', () => {
    render(
      <RankedBarList
        items={[{ name: 'United Arab Emirates', count: 3 }]}
        emptyText="No data"
        labelWidth="w-32"
      />,
    );
    const label = screen.getByTitle('United Arab Emirates');
    expect(label.className).toContain('w-32');
    expect(label.className).not.toContain('w-20');
  });

  it('wraps the list in an accessible scroll region when scrollable', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      name: `Item ${i + 1}`,
      count: 10 - i,
    }));
    render(
      <RankedBarList
        items={items}
        emptyText="No data"
        scrollable
        scrollLabel="Country distribution"
      />,
    );
    const region = screen.getByLabelText('Country distribution');
    expect(region.getAttribute('tabIndex')).toBe('0');
    const className = region.className;
    expect(className).toContain('overflow-y-auto');
    expect(className).toContain('scrollbar-none');
    // Bottom-only fade: no top transparent stop, valid Tailwind arbitrary value.
    expect(className).toContain('[mask-image:linear-gradient');
    expect(className).toContain('black_calc(100%_-_14px)');
    expect(className).not.toContain('transparent_0');
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
  });

  it('uses a flex-scroll container that does not grow from content when scrollable', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      name: `Item ${i + 1}`,
      count: 10 - i,
    }));
    render(
      <RankedBarList
        items={items}
        emptyText="No data"
        scrollable
        scrollLabel="Type distribution"
      />,
    );
    const region = screen.getByLabelText('Type distribution');
    const className = region.className;
    // Should grow to fill its parent card and let overflow scroll naturally.
    expect(className).toContain('flex-1');
    expect(className).toContain('overflow-y-auto');
    expect(className).toContain('scrollbar-none');
    const tokens = className.split(/\s+/);
    // The scroll area must have a zero base size (h-0 or basis-0) so its
    // content cannot inflate the flex chain and prevent overflow. Match the
    // token boundary to avoid colliding with "min-h-[200px]".
    expect(tokens.includes('h-0') || tokens.includes('basis-0')).toBe(true);
    // The old fixed cap must be gone so short lists can stretch with siblings.
    expect(className).not.toContain('max-h-44');
    // Size containment prevents list content from inflating the grid row
    // height; the min height floor keeps ranked-only rows from collapsing.
    expect(tokens.includes('[contain:size]')).toBe(true);
    expect(tokens.includes('min-h-[200px]')).toBe(true);
  });

  it('provides a fallback accessible label when scrollLabel is omitted', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      name: `Item ${i + 1}`,
      count: 10 - i,
    }));
    render(<RankedBarList items={items} emptyText="No data" scrollable />);
    expect(screen.getByLabelText('Scrollable ranked items')).toBeInTheDocument();
  });
});
