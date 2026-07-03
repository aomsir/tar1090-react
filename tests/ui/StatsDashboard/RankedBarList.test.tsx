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
});
