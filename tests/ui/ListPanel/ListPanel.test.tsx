import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, screen, fireEvent, act } from '@testing-library/react';
import { renderWithI18n } from '@/i18n/testUtils';
import { ListPanel } from '@/ui/ListPanel/ListPanel';
import { aircraftStore } from '@/store/aircraftStore';
import { useLiveTick } from '@/store/liveTick';
import { useListControls } from '@/store/listControls';
import { useMapViewStore } from '@/store/mapViewStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { useSelectionStore } from '@/store/selectionStore';
import { Aircraft } from '@/domain/Aircraft';
import { historyStore } from '@/store/historyStore';
import { LIST_COLUMNS } from '@/features/list/columns';

class ResizeObserverMock {
  static instances = new Set<ResizeObserverMock>();

  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(target: Element): void {
    ResizeObserverMock.instances.add(this);
    this.emit(target);
  }

  emit(target: Element): void {
    const contentRect = target.getBoundingClientRect();
    this.callback(
      [
        {
          target,
          contentRect,
          borderBoxSize: [{ inlineSize: contentRect.width, blockSize: contentRect.height }],
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }
  unobserve(): void {
    ResizeObserverMock.instances.delete(this);
  }
  disconnect(): void {
    ResizeObserverMock.instances.delete(this);
  }

  static emit(target: Element): void {
    for (const observer of ResizeObserverMock.instances) observer.emit(target);
  }
}

function seed(hex: string, fields: Partial<Aircraft>): void {
  const a = new Aircraft(hex);
  Object.assign(a, fields);
  aircraftStore.map.set(hex, a);
}

describe('ListPanel', () => {
  let rectSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    ResizeObserverMock.instances.clear();
    rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function () {
        if ((this as HTMLElement).dataset.testid === 'list-scroll-region') {
          return {
            width: 640,
            height: 320,
            top: 0,
            left: 0,
            right: 640,
            bottom: 320,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          };
        }
        if ((this as HTMLElement).textContent?.includes('FLT000')) {
          return {
            width: 640,
            height: 64,
            top: 0,
            left: 0,
            right: 640,
            bottom: 64,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          };
        }
        return {
          width: 640,
          height: 32,
          top: 0,
          left: 0,
          right: 640,
          bottom: 32,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      });
    aircraftStore.reset();
    historyStore.reset();
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
    useSelectionStore.setState({ selectedHex: null, selectedPassId: null });
  });

  afterEach(async () => {
    await act(async () => {
      cleanup();
      await Promise.resolve();
    });
    vi.clearAllTimers();
    vi.useRealTimers();
    ResizeObserverMock.instances.clear();
    rectSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('renders rows from the store and calls onSelect on row click', async () => {
    seed('A1', { flight: 'CCA101', registration: 'B-2033', altitude: 35000 });
    act(() => useLiveTick.getState().bump());

    const onSelect = vi.fn();
    await renderWithI18n(<ListPanel onSelect={onSelect} />);

    expect(screen.getByText('CCA101')).toBeInTheDocument();
    fireEvent.click(screen.getByText('CCA101'));
    expect(onSelect).toHaveBeenCalledWith('A1');
  });

  it('switches filter via tab and re-filters rows', async () => {
    seed('A1', { flight: 'AIR1', altitude: 30000 });
    seed('A2', { flight: 'GND1', altitude: 'ground' });
    act(() => useLiveTick.getState().bump());

    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);
    act(() => useListControls.getState().setFilter('ground'));

    expect(screen.queryByText('AIR1')).not.toBeInTheDocument();
    expect(screen.getByText('GND1')).toBeInTheDocument();
  });

  it('shows the squawk and type code columns', async () => {
    seed('A1', { flight: 'CCA101', typeCode: 'B738', squawk: '2000', altitude: 30000 });
    act(() => useLiveTick.getState().bump());

    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);
    expect(screen.getByText('B738')).toBeInTheDocument();
    expect(screen.getByText('2000')).toBeInTheDocument();
  });

  it('marks emergency squawk rows', async () => {
    seed('A1', { flight: 'HELP1', squawk: '7700', altitude: 30000 });
    act(() => useLiveTick.getState().bump());

    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);
    expect(screen.getByTestId('row-A1').className).toContain('bg-red');
  });

  it('renders all default visible tar1090 columns', async () => {
    seed('A1', {
      flight: 'CCA101',
      typeCode: 'B738',
      squawk: '2000',
      altitude: 30000,
      speed: 415,
      rssi: -8.4,
    });
    act(() => useLiveTick.getState().bump());

    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);

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

  it('uses max speed and distance headers in history mode', async () => {
    act(() => usePlaybackStore.getState().setMode('history'));

    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);

    expect(screen.getByRole('columnheader', { name: 'Max. Spd. (kt)' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Max. Dist. (nmi)' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^Max\. Alt\. \(ft\)/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Pass Time' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Spd. (kt)' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Dist. (nmi)' })).not.toBeInTheDocument();
  });

  it('uses pass row ids for history selection and only highlights the selected pass', async () => {
    historyStore.setFrames([
      { now: 1000, messages: 1, aircraft: [{ hex: 'abc123', flight: 'FIRST1' }] },
      { now: 1000 + 12 * 60 * 60, messages: 1, aircraft: [{ hex: 'abc123', flight: 'SECOND2' }] },
    ]);
    await historyStore.buildPassData();
    act(() => usePlaybackStore.getState().setMode('history'));
    useSelectionStore.setState({ selectedPassId: 'abc123:1000', selectedHex: 'abc123' });
    const onSelect = vi.fn();

    await renderWithI18n(<ListPanel onSelect={onSelect} />);

    expect(screen.getByTestId('row-abc123:1000').className).toContain('border-indigo');
    expect(screen.getByTestId(`row-abc123:${1000 + 12 * 60 * 60}`).className).not.toContain(
      'border-indigo',
    );
    fireEvent.click(screen.getByText('SECOND2'));
    expect(onSelect).toHaveBeenCalledWith(`abc123:${1000 + 12 * 60 * 60}`);
  });

  it('truncated cells expose full value via title attribute', async () => {
    seed('A1', { flight: 'LONGCALLSIGN', altitude: 30000 });
    act(() => useLiveTick.getState().bump());

    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);

    const cell = screen.getByText('LONGCALLSIGN');
    expect(cell.closest('td')?.getAttribute('title')).toBe('LONGCALLSIGN');
  });

  it('missing value cells do not have title', async () => {
    seed('A1', { flight: 'CCA101', altitude: 30000 });
    act(() => useLiveTick.getState().bump());

    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);

    const dashCells = screen.getAllByText('—');
    for (const el of dashCells) {
      expect(el.closest('td')?.hasAttribute('title')).toBe(false);
    }
  });

  it('uses parent-managed dock sizing instead of viewport absolute positioning', async () => {
    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);

    const panel = screen.getByTestId('list-panel');
    expect(panel.className).toContain('h-full');
    expect(panel.className).not.toContain('absolute');
    expect(panel.className).not.toContain('top-16');
    expect(panel.className).not.toContain('bottom-16');
    expect(panel.className).not.toContain('right-4');
  });

  it('panel has a dedicated scroll region wrapping the table', async () => {
    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);
    const panel = screen.getByTestId('list-panel');
    const table = screen.getByRole('table');
    const scrollRegion = table.parentElement;
    expect(scrollRegion).toBeTruthy();
    expect(scrollRegion).not.toBe(panel);
  });

  it('table has minimum width for column stability', async () => {
    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);
    const table = screen.getByRole('table');
    const cls = table.className;
    expect(cls).toMatch(/min-w-/);
  });

  it('can show a hidden original column through column options', async () => {
    seed('A1', { flight: 'CCA101', registration: 'B-2033', altitude: 30000 });
    act(() => useLiveTick.getState().bump());

    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Registration' }));

    expect(screen.getByRole('columnheader', { name: 'Registration' })).toBeInTheDocument();
    expect(screen.getByText('B-2033')).toBeInTheDocument();
  });

  it('selected row has indigo left border highlight', async () => {
    seed('A1', { flight: 'CCA101', altitude: 35000 });
    act(() => useLiveTick.getState().bump());
    useSelectionStore.setState({ selectedHex: 'A1' });

    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);
    const row = screen.getByTestId('row-A1');
    expect(row.className).toContain('border-l-');
    expect(row.className).toContain('border-indigo');
  });

  it('military aircraft row shows inline military chip', async () => {
    seed('A1', { flight: 'MIL01', altitude: 35000, isMilitary: true });
    act(() => useLiveTick.getState().bump());

    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);
    const row = screen.getByTestId('row-A1');
    expect(row.textContent).toContain('MIL');
  });

  it('MLAT aircraft row shows inline MLAT chip', async () => {
    seed('A1', { flight: 'MLT01', altitude: 35000, isMlat: true });
    act(() => useLiveTick.getState().bump());

    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);
    const row = screen.getByTestId('row-A1');
    expect(row.textContent).toContain('MLAT');
  });

  it('renders Simplified Chinese column headers and filters', async () => {
    seed('A1', { flight: 'CCA101', altitude: 35000 });
    act(() => useLiveTick.getState().bump());

    await renderWithI18n(<ListPanel onSelect={vi.fn()} />, { language: 'zh-CN' });

    expect(screen.getByRole('columnheader', { name: '呼号' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '全部' })).toBeInTheDocument();
  });

  it('renders translated empty state when there are no rows', async () => {
    await renderWithI18n(<ListPanel onSelect={vi.fn()} />, { language: 'zh-CN' });
    expect(screen.getByText('无匹配飞机')).toBeInTheDocument();
  });

  it('mounts only a bounded virtual window for a large row set', async () => {
    for (let i = 0; i < 500; i++) {
      seed(`A${String(i).padStart(3, '0')}`, {
        flight: `FLT${String(i).padStart(3, '0')}`,
        altitude: 35000 - i,
      });
    }
    act(() => useLiveTick.getState().bump());

    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);

    const mountedRows = screen.getAllByTestId(/^row-/);
    expect(mountedRows.length).toBeGreaterThan(0);
    expect(mountedRows.length).toBeLessThan(100);
  });

  it('changes the mounted window on scroll and keeps click identity', async () => {
    for (let i = 0; i < 500; i++) {
      seed(`A${String(i).padStart(3, '0')}`, {
        flight: `FLT${String(i).padStart(3, '0')}`,
        altitude: 35000 - i,
      });
    }
    act(() => useLiveTick.getState().bump());
    const onSelect = vi.fn();

    await renderWithI18n(<ListPanel onSelect={onSelect} />);

    const scrollRegion = screen.getByTestId('list-scroll-region');
    const firstWindowIds = screen.getAllByTestId(/^row-/).map((row) => row.dataset.testid);
    Object.defineProperty(scrollRegion, 'scrollTop', { configurable: true, value: 32 * 300 });
    fireEvent.scroll(scrollRegion);
    await act(async () => {});

    const secondWindowRows = screen.getAllByTestId(/^row-/);
    expect(secondWindowRows.map((row) => row.dataset.testid)).not.toEqual(firstWindowIds);
    fireEvent.click(secondWindowRows[0]!);
    expect(onSelect).toHaveBeenCalledWith(
      secondWindowRows[0]!.dataset.testid!.replace(/^row-/, ''),
    );
  });

  it('keeps selected styling when the selected row enters the virtual window', async () => {
    for (let i = 0; i < 500; i++) {
      seed(`A${String(i).padStart(3, '0')}`, {
        flight: `FLT${String(i).padStart(3, '0')}`,
        altitude: 35000 - i,
      });
    }
    useSelectionStore.setState({ selectedHex: 'A300', selectedPassId: null });
    act(() => useLiveTick.getState().bump());

    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);

    const scrollRegion = screen.getByTestId('list-scroll-region');
    Object.defineProperty(scrollRegion, 'scrollTop', { configurable: true, value: 32 * 300 });
    fireEvent.scroll(scrollRegion);
    await act(async () => {});

    expect(screen.getByTestId('row-A300').className).toContain('border-indigo');
  });

  it('uses the fixed row estimate when calculating the deep scroll spacer', async () => {
    for (let i = 0; i < 500; i++) {
      seed(`A${String(i).padStart(3, '0')}`, {
        flight: `FLT${String(i).padStart(3, '0')}`,
        altitude: 35000 - i,
      });
    }
    act(() => useLiveTick.getState().bump());

    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);
    await act(async () => {});
    act(() => ResizeObserverMock.emit(screen.getByTestId('row-A000')));

    const scrollRegion = screen.getByTestId('list-scroll-region');
    Object.defineProperty(scrollRegion, 'scrollTop', { configurable: true, value: 32 * 300 });
    fireEvent.scroll(scrollRegion);
    await act(async () => {});

    const firstVirtualRow = screen.getByTestId('row-A290');
    const topSpacer = firstVirtualRow.previousElementSibling;
    expect(firstVirtualRow.dataset.index).toBe('290');
    expect(topSpacer).toHaveAttribute('aria-hidden', 'true');
    expect(topSpacer?.querySelector('td')).toHaveStyle({ height: '9280px' });
  });

  it('keeps table rows structurally valid when all columns are hidden', async () => {
    for (let i = 0; i < 500; i++) {
      seed(`A${String(i).padStart(3, '0')}`, {
        flight: `FLT${String(i).padStart(3, '0')}`,
        altitude: 35000 - i,
      });
    }
    useListControls.setState({ hiddenColumns: new Set(LIST_COLUMNS.map((column) => column.id)) });
    act(() => useLiveTick.getState().bump());

    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);

    const table = screen.getByRole('table');
    const rows = Array.from(table.querySelectorAll('thead tr, tbody tr'));
    const spacerRows = rows.filter((row) => row.getAttribute('aria-hidden') === 'true');

    expect(spacerRows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const cells = row.querySelectorAll(':scope > th, :scope > td');
      expect(cells.length).toBeGreaterThan(0);
      for (const cell of cells) expect(cell.getAttribute('colspan')).not.toBe('0');
    }
  });
});
