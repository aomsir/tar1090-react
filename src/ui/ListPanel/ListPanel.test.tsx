import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ListPanel } from './ListPanel';
import { aircraftStore } from '@/store/aircraftStore';
import { useLiveTick } from '@/store/liveTick';
import { useListControls } from '@/store/listControls';
import { useMapViewStore } from '@/store/mapViewStore';
import { Aircraft } from '@/domain/Aircraft';

function seed(hex: string, fields: Partial<Aircraft>): void {
  const a = new Aircraft(hex);
  Object.assign(a, fields);
  aircraftStore.map.set(hex, a);
}

describe('ListPanel', () => {
  beforeEach(() => {
    aircraftStore.reset();
    useLiveTick.setState({ version: 0 });
    useListControls.setState({
      query: '',
      filter: 'all',
      sortKey: 'altitude',
      sortDir: 'desc',
      inViewOnly: false,
    });
    useMapViewStore.setState({ extent: null });
  });

  it('renders rows from the store and calls onSelect on row click', () => {
    seed('A1', { flight: 'CCA101', registration: 'B-2033', altitude: 35000 });
    act(() => useLiveTick.getState().bump());

    const onSelect = vi.fn();
    render(<ListPanel onSelect={onSelect} />);

    expect(screen.getByText('CCA101')).toBeInTheDocument();
    fireEvent.click(screen.getByText('CCA101'));
    expect(onSelect).toHaveBeenCalledWith('A1');
  });

  it('switches filter via tab and re-filters rows', () => {
    seed('A1', { flight: 'AIR1', altitude: 30000 });
    seed('A2', { flight: 'GND1', altitude: 'ground' });
    act(() => useLiveTick.getState().bump());

    render(<ListPanel onSelect={vi.fn()} />);
    act(() => useListControls.getState().setFilter('ground'));

    expect(screen.queryByText('AIR1')).not.toBeInTheDocument();
    expect(screen.getByText('GND1')).toBeInTheDocument();
  });

  it('shows the squawk and type code columns', () => {
    seed('A1', { flight: 'CCA101', typeCode: 'B738', squawk: '2000', altitude: 30000 });
    act(() => useLiveTick.getState().bump());

    render(<ListPanel onSelect={vi.fn()} />);
    expect(screen.getByText('B738')).toBeInTheDocument();
    expect(screen.getByText('2000')).toBeInTheDocument();
  });

  it('marks emergency squawk rows', () => {
    seed('A1', { flight: 'HELP1', squawk: '7700', altitude: 30000 });
    act(() => useLiveTick.getState().bump());

    render(<ListPanel onSelect={vi.fn()} />);
    expect(screen.getByTestId('row-A1').className).toContain('bg-red');
  });
});
