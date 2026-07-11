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
import type { AircraftPass } from '@/features/playback/aircraftPasses';

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

function seedHistoryPasses(count: number): AircraftPass[] {
  return Array.from({ length: count }, (_, index) => {
    const hex = `h${String(index).padStart(3, '0')}`;
    const aircraft = new Aircraft(hex);
    aircraft.flight = `HIST${String(index).padStart(3, '0')}`;
    aircraft.altitude = 35_000 - index;
    return {
      passId: `${hex}:${1_000 + index}`,
      hex,
      startTime: 1_000 + index,
      endTime: 1_001 + index,
      aircraft,
      trackPoints: [
        { lon: index, lat: index, ts: 1_000 + index },
        { lon: index + 1, lat: index + 1, ts: 1_001 + index },
      ],
      maxAltitude: 35_000 - index,
      hadAltitude: true,
      hadGround: false,
      hadEmergency: false,
      hadSquawk: false,
    };
  });
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
    const scrollRegion = screen.getByTestId('list-scroll-region');
    const table = scrollRegion.querySelector('table');
    expect(scrollRegion).toBeTruthy();
    expect(scrollRegion).not.toBe(panel);
    expect(table).toBeTruthy();
  });

  it('table has minimum width for column stability', async () => {
    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);
    const table = screen.getByTestId('list-scroll-region').querySelector('table')!;
    expect(table.style.width).toBeTruthy();
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

  it('gives every data cell a fixed-height layout contract with inline status chips', async () => {
    seed('A1', { flight: 'MIL01', altitude: 35000, isMilitary: true, isMlat: true });
    act(() => useLiveTick.getState().bump());

    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);

    const row = screen.getByTestId('row-A1');
    const table = screen.getByTestId('list-scroll-region').querySelector('table')!;
    expect(table.className).toContain('border-separate');
    expect(table.className).toContain('border-spacing-0');
    expect(screen.getByText('MIL')).toBeInTheDocument();
    expect(screen.getByText('MLAT')).toBeInTheDocument();
    for (const cell of Array.from(row.cells)) {
      expect(cell.className).toContain('h-8');
      expect(cell.className).toContain('py-0');
      expect(cell.className).toContain('align-middle');
      expect(cell.className).toContain('leading-4');
      expect(cell.firstElementChild?.className).toContain('h-8');
    }
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
    for (const row of mountedRows) {
      expect(row).toHaveStyle({ height: '32px' });
    }
  });

  it('keeps a fixed header outside the virtual scroll region for large lists', async () => {
    for (let i = 0; i < 500; i++) {
      seed(`A${String(i).padStart(3, '0')}`, {
        flight: `FLT${String(i).padStart(3, '0')}`,
        altitude: 35000 - i,
      });
    }
    act(() => useLiveTick.getState().bump());

    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);

    const scrollRegion = screen.getByTestId('list-scroll-region');
    const frame = scrollRegion.parentElement!;
    const header = frame.firstElementChild!;
    const headerTable = header.querySelector('table')!;
    const headerThead = headerTable.querySelector('thead')!;
    const bodyTable = scrollRegion.querySelector('table')!;
    const headerColumns = Array.from(headerTable.querySelectorAll('col'));
    const bodyColumns = Array.from(bodyTable.querySelectorAll('col'));
    const firstDataRow = screen.getAllByTestId(/^row-/)[0]!;

    expect(frame.className).toContain('list-table-frame');
    expect(frame.className).toContain('overflow-x-auto');
    expect(header).toBe(frame.children[0]);
    expect(scrollRegion).toBe(frame.children[1]);
    expect(header.className).toContain('shrink-0');
    expect(headerTable.className).toContain('table-fixed');
    expect(bodyTable.className).toContain('table-fixed');
    expect(scrollRegion.className).toContain('overflow-y-auto');
    expect(scrollRegion.className).toContain('overflow-x-hidden');
    expect(headerThead.querySelector('tr')?.className).toContain('h-16');
    expect(scrollRegion.querySelector('thead')).toBeNull();
    expect(scrollRegion.querySelector('tbody')).toBeTruthy();
    expect(headerTable.style.width).toBe(bodyTable.style.width);
    expect(parseInt(headerTable.style.width, 10)).toBeGreaterThanOrEqual(640);
    expect(headerColumns.map((col) => col.dataset.columnId)).toEqual(
      bodyColumns.map((col) => col.dataset.columnId),
    );
    expect(headerColumns.map((col) => col.getAttribute('style'))).toEqual(
      bodyColumns.map((col) => col.getAttribute('style')),
    );
    expect(firstDataRow.cells).toHaveLength(headerColumns.length);
    for (const cell of Array.from(firstDataRow.cells)) {
      const headerId = cell.getAttribute('headers');
      expect(headerId).toBeTruthy();
      expect(headerTable.querySelector(`th#${headerId}`)).toBeTruthy();
    }

    Object.defineProperty(scrollRegion, 'scrollTop', { configurable: true, value: 32 * 300 });
    fireEvent.scroll(scrollRegion);
    await act(async () => {});

    expect(headerTable.querySelector('thead')).toBe(headerThead);
    expect(Number(screen.getAllByTestId(/^row-/)[0]!.dataset.index)).toBeGreaterThan(0);
  });

  it('reserves vertical scrollbar gutter beside the body table', async () => {
    const offsetWidthSpy = vi
      .spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
      .mockImplementation(function () {
        return (this as HTMLElement).dataset.testid === 'list-scroll-region' ? 657 : 0;
      });
    const clientWidthSpy = vi
      .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
      .mockImplementation(function () {
        return (this as HTMLElement).dataset.testid === 'list-scroll-region' ? 640 : 0;
      });

    await renderWithI18n(<ListPanel onSelect={vi.fn()} />);

    const scrollRegion = screen.getByTestId('list-scroll-region');
    const header = scrollRegion.parentElement!.firstElementChild!;
    const headerTable = header.querySelector('table')!;
    const bodyTable = scrollRegion.querySelector('table')!;
    expect(headerTable.style.width).toBe('640px');
    expect(bodyTable.style.width).toBe('640px');
    expect(scrollRegion.style.width).toBe('657px');

    offsetWidthSpy.mockRestore();
    clientWidthSpy.mockRestore();
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

    const table = screen.getByTestId('list-scroll-region').querySelector('table')!;
    const rows = Array.from(table.querySelectorAll('thead tr, tbody tr'));
    const spacerRows = rows.filter((row) => row.getAttribute('aria-hidden') === 'true');

    expect(spacerRows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const cells = row.querySelectorAll(':scope > th, :scope > td');
      expect(cells.length).toBeGreaterThan(0);
      for (const cell of cells) expect(cell.getAttribute('colspan')).not.toBe('0');
    }
    const header = table.parentElement!.previousElementSibling!;
    const placeholderHeader = header.querySelector('th')!;
    const placeholderCell = table.querySelector('tbody tr:not([aria-hidden]) td')!;
    expect(placeholderHeader.id).toBe('list-column-empty');
    expect(placeholderCell.getAttribute('headers')).toBe(placeholderHeader.id);
  });

  it('virtualizes history pass rows with pass ids, selection, and valid spacers', async () => {
    const passes = seedHistoryPasses(500);
    const selectedPassId = passes[300]!.passId;
    historyStore.passes = passes;
    useSelectionStore.setState({ selectedHex: passes[300]!.hex, selectedPassId });
    act(() => usePlaybackStore.getState().setMode('history'));
    act(() => useLiveTick.getState().bump());
    const onSelect = vi.fn();

    await renderWithI18n(<ListPanel onSelect={onSelect} />);
    expect(screen.getByRole('columnheader', { name: 'Pass Time' })).toBeInTheDocument();
    const scrollRegion = screen.getByTestId('list-scroll-region');
    Object.defineProperty(scrollRegion, 'scrollTop', { configurable: true, value: 32 * 300 });
    fireEvent.scroll(scrollRegion);
    await act(async () => {});

    const selectedRow = screen.getByTestId(`row-${selectedPassId}`);
    expect(selectedRow.className).toContain('border-indigo');
    fireEvent.click(selectedRow);
    expect(onSelect).toHaveBeenCalledWith(selectedPassId);

    const spacerCells = document.querySelectorAll('tbody tr[aria-hidden="true"] > td');
    expect(spacerCells.length).toBeGreaterThan(0);
    for (const cell of spacerCells) expect(cell.getAttribute('colspan')).not.toBe('0');
  });
});
