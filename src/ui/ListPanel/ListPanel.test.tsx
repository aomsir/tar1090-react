import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ListPanel } from './ListPanel';
import { aircraftStore } from '@/store/aircraftStore';
import { useLiveTick } from '@/store/liveTick';
import { useListControls } from '@/store/listControls';
import { useMapViewStore } from '@/store/mapViewStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { useSelectionStore } from '@/store/selectionStore';
import { Aircraft } from '@/domain/Aircraft';

function seed(hex: string, fields: Partial<Aircraft>): void {
  const a = new Aircraft(hex);
  Object.assign(a, fields);
  aircraftStore.map.set(hex, a);
}

describe('ListPanel', () => {
  beforeEach(() => {
    aircraftStore.reset();
    usePlaybackStore.getState().reset();
    useLiveTick.setState({ version: 0 });
    useListControls.setState({
      query: '',
      filter: 'all',
      sortKey: 'altitude',
      sortDir: 'desc',
    });
    useToolbarStore.setState({ inViewOnly: false });
    useListControls.getState().resetColumns();
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

  it('renders all default visible tar1090 columns', () => {
    seed('A1', {
      flight: 'CCA101',
      typeCode: 'B738',
      squawk: '2000',
      altitude: 30000,
      speed: 415,
      rssi: -8.4,
    });
    act(() => useLiveTick.getState().bump());

    render(<ListPanel onSelect={vi.fn()} />);

    expect(screen.getByRole('columnheader', { name: 'Flag' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Callsign' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Route' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Type' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Squawk' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Alt\. \(ft\)/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Spd. (kt)' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Dist. (nmi)' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'RSSI' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Hex ID' })).not.toBeInTheDocument();
  });

  it('uses max speed and distance headers in history mode', () => {
    act(() => usePlaybackStore.getState().setMode('history'));

    render(<ListPanel onSelect={vi.fn()} />);

    expect(screen.getByRole('columnheader', { name: 'Max. Spd. (kt)' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Max. Dist. (nmi)' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Spd. (kt)' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Dist. (nmi)' })).not.toBeInTheDocument();
  });

  it('truncated cells expose full value via title attribute', () => {
    seed('A1', { flight: 'LONGCALLSIGN', altitude: 30000 });
    act(() => useLiveTick.getState().bump());

    render(<ListPanel onSelect={vi.fn()} />);

    const cell = screen.getByText('LONGCALLSIGN');
    expect(cell.closest('td')?.getAttribute('title')).toBe('LONGCALLSIGN');
  });

  it('missing value cells do not have title', () => {
    seed('A1', { flight: 'CCA101', altitude: 30000 });
    act(() => useLiveTick.getState().bump());

    render(<ListPanel onSelect={vi.fn()} />);

    const dashCells = screen.getAllByText('—');
    for (const el of dashCells) {
      expect(el.closest('td')?.hasAttribute('title')).toBe(false);
    }
  });

  it('uses parent-managed dock sizing instead of viewport absolute positioning', () => {
    render(<ListPanel onSelect={vi.fn()} />);

    const panel = screen.getByTestId('list-panel');
    expect(panel.className).toContain('h-full');
    expect(panel.className).not.toContain('absolute');
    expect(panel.className).not.toContain('top-16');
    expect(panel.className).not.toContain('bottom-16');
    expect(panel.className).not.toContain('right-4');
  });

  it('panel has a dedicated scroll region wrapping the table', () => {
    render(<ListPanel onSelect={vi.fn()} />);
    const panel = screen.getByTestId('list-panel');
    const table = screen.getByRole('table');
    const scrollRegion = table.parentElement;
    expect(scrollRegion).toBeTruthy();
    expect(scrollRegion).not.toBe(panel);
  });

  it('table has minimum width for column stability', () => {
    render(<ListPanel onSelect={vi.fn()} />);
    const table = screen.getByRole('table');
    const cls = table.className;
    expect(cls).toMatch(/min-w-/);
  });

  it('can show a hidden original column through column options', () => {
    seed('A1', { flight: 'CCA101', registration: 'B-2033', altitude: 30000 });
    act(() => useLiveTick.getState().bump());

    render(<ListPanel onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Registration' }));

    expect(screen.getByRole('columnheader', { name: 'Registration' })).toBeInTheDocument();
    expect(screen.getByText('B-2033')).toBeInTheDocument();
  });

  it('selected row has indigo left border highlight', () => {
    seed('A1', { flight: 'CCA101', altitude: 35000 });
    act(() => useLiveTick.getState().bump());
    useSelectionStore.setState({ selectedHex: 'A1' });

    render(<ListPanel onSelect={vi.fn()} />);
    const row = screen.getByTestId('row-A1');
    expect(row.className).toContain('border-l-');
    expect(row.className).toContain('border-indigo');
  });

  it('military aircraft row shows inline military chip', () => {
    seed('A1', { flight: 'MIL01', altitude: 35000, isMilitary: true });
    act(() => useLiveTick.getState().bump());

    render(<ListPanel onSelect={vi.fn()} />);
    const row = screen.getByTestId('row-A1');
    expect(row.textContent).toContain('MIL');
  });

  it('MLAT aircraft row shows inline MLAT chip', () => {
    seed('A1', { flight: 'MLT01', altitude: 35000, isMlat: true });
    act(() => useLiveTick.getState().bump());

    render(<ListPanel onSelect={vi.fn()} />);
    const row = screen.getByTestId('row-A1');
    expect(row.textContent).toContain('MLAT');
  });
});
