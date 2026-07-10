import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithI18n } from '@/i18n/testUtils';
import { DetailCard } from '@/ui/DetailCard/DetailCard';
import { aircraftStore } from '@/store/aircraftStore';
import { useLiveTick } from '@/store/liveTick';
import { useSelectionStore } from '@/store/selectionStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { Aircraft } from '@/domain/Aircraft';
import { historyStore } from '@/store/historyStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { formatPassTimeRange } from '@/i18n/format';
import { formatDistanceNm } from '@/domain/units';
import type { AircraftSnapshot } from '@/data/types';

describe('DetailCard', () => {
  beforeEach(() => {
    aircraftStore.reset();
    useLiveTick.setState({ version: 0 });
    useSelectionStore.setState({ selectedHex: null });
    usePlaybackStore.getState().reset();
    useToolbarStore.setState(useToolbarStore.getInitialState());
  });

  it('renders nothing when no aircraft is selected', async () => {
    const { container } = await renderWithI18n(<DetailCard />);
    expect(container.firstChild).toBeNull();
  });

  it('shows selected aircraft fields and closes on button', async () => {
    const a = new Aircraft('780ABC');
    Object.assign(a, {
      flight: 'CCA101',
      registration: 'B-2033',
      typeCode: 'A320',
      country: 'China',
      altitude: 35000,
    });
    aircraftStore.map.set('780ABC', a);
    useSelectionStore.setState({ selectedHex: '780ABC' });

    await renderWithI18n(<DetailCard />);
    expect(screen.getByText('CCA101')).toBeInTheDocument();
    expect(screen.getAllByText('B-2033').length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
    expect(useSelectionStore.getState().selectedHex).toBeNull();
  });

  it('renders grouped original-style details and missing values', async () => {
    const a = new Aircraft('780ABC');
    Object.assign(a, {
      flight: 'CCA101',
      registration: 'B-2033',
      typeCode: 'B738',
      typeLong: 'BOEING 737-800',
      altitude: 35000,
      speed: 415,
      ias: 250,
      tas: 430,
      mach: 0.78,
      navAltitudeMcp: 32000,
      windDirection: 280,
      windSpeed: 55,
    });
    aircraftStore.map.set('780ABC', a);
    useSelectionStore.setState({ selectedHex: '780ABC' });

    await renderWithI18n(<DetailCard />);

    expect(screen.getByText('Flight status')).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Environment')).toBeInTheDocument();
    expect(screen.getByText('IAS')).toBeInTheDocument();
    expect(screen.getByText('250 kt')).toBeInTheDocument();
    expect(screen.getByText('MCP altitude')).toBeInTheDocument();
    expect(screen.getByText('32,000 ft')).toBeInTheDocument();
  });

  it('renders flag image with absolute path from flagPath', async () => {
    const a = new Aircraft('780ABC');
    Object.assign(a, {
      flight: 'CCA101',
      country: 'China',
      flagPath: '/flags/3x2/CN.svg',
    });
    aircraftStore.map.set('780ABC', a);
    useSelectionStore.setState({ selectedHex: '780ABC' });

    await renderWithI18n(<DetailCard />);
    const img = screen.getByAltText('China') as HTMLImageElement;
    expect(img.src).toContain('/flags/3x2/CN.svg');
    expect(img.src).not.toContain('//flags');
  });

  it('renders key flight stats section with altitude, speed, and track', async () => {
    const a = new Aircraft('780ABC');
    Object.assign(a, {
      flight: 'CCA101',
      registration: 'B-2033',
      typeCode: 'A320',
      altitude: 35000,
      speed: 468,
      track: 247,
    });
    aircraftStore.map.set('780ABC', a);
    useSelectionStore.setState({ selectedHex: '780ABC' });

    await renderWithI18n(<DetailCard />);

    const statsSection = screen.getByTestId('key-stats');
    expect(statsSection).toBeInTheDocument();
    expect(statsSection.textContent).toContain('35,000');
    expect(statsSection.textContent).toContain('468');
    expect(statsSection.textContent).toContain('247°');
  });

  it('renders selected pass time and maxima instead of live labels', async () => {
    historyStore.setFrames([
      {
        now: 100,
        messages: 0,
        aircraft: [{ hex: 'abc', flight: 'FIRST', lat: 1, lon: 10, altitude: 1000, speed: 100 }],
      },
      {
        now: 44000,
        messages: 0,
        aircraft: [{ hex: 'abc', flight: 'SECOND', lat: 3, lon: 30, altitude: 2000, speed: 200 }],
      },
      {
        now: 44030,
        messages: 0,
        aircraft: [{ hex: 'abc', flight: 'SECOND', lat: 4, lon: 40, altitude: 39000, speed: 490 }],
      },
    ] as never);
    await historyStore.buildPassData(0, 0);
    usePlaybackStore.getState().setMode('history');
    useSelectionStore.getState().selectPass('abc:44000', 'abc');

    await renderWithI18n(<DetailCard />);

    const stats = screen.getByTestId('key-stats');
    expect(screen.getByText(formatPassTimeRange(44000, 44030, 'en'))).toBeInTheDocument();
    expect(stats).toHaveTextContent('Max Altitude');
    expect(stats).toHaveTextContent('Max Speed');
    expect(stats).toHaveTextContent('Max Distance');
    expect(stats).toHaveTextContent('39,000');
    expect(stats).toHaveTextContent('490');
    expect(stats).toHaveTextContent(
      formatDistanceNm(historyStore.getPass('abc:44000')?.maxDistance),
    );
    expect(stats).not.toHaveTextContent('Track');
  });

  it('renders registration and type code in subtitle line', async () => {
    const a = new Aircraft('780ABC');
    Object.assign(a, {
      flight: 'CCA101',
      registration: 'B-2033',
      typeCode: 'A320',
      altitude: 35000,
    });
    aircraftStore.map.set('780ABC', a);
    useSelectionStore.setState({ selectedHex: '780ABC' });

    await renderWithI18n(<DetailCard />);

    const subtitle = screen.getByTestId('detail-subtitle');
    expect(subtitle.textContent).toContain('B-2033');
    expect(subtitle.textContent).toContain('A320');
  });

  it('each detail group has a colored accent bar', async () => {
    const a = new Aircraft('780ABC');
    Object.assign(a, {
      flight: 'CCA101',
      registration: 'B-2033',
      typeCode: 'A320',
      altitude: 35000,
    });
    aircraftStore.map.set('780ABC', a);
    useSelectionStore.setState({ selectedHex: '780ABC' });

    await renderWithI18n(<DetailCard />);

    const groups = screen
      .getByTestId('detail-card')
      .querySelectorAll('section[data-testid^="group-"]');
    expect(groups.length).toBe(6);
    for (const group of groups) {
      const bar = group.querySelector('[data-testid="group-bar"]');
      expect(bar).toBeTruthy();
    }
  });

  it('exports a KML download for the selected aircraft track', async () => {
    aircraftStore.reset();
    aircraftStore.applySnapshot({
      now: 200,
      messages: 0,
      aircraft: [
        { hex: 'abc', flight: 'TEST', lat: 1, lon: 2, altitude: 1000 },
      ] as unknown as AircraftSnapshot['aircraft'],
    });
    historyStore.setFrames([
      {
        now: 100,
        messages: 0,
        aircraft: [
          { hex: 'abc', lat: 0, lon: 0, altitude: 1000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
      {
        now: 130,
        messages: 0,
        aircraft: [
          { hex: 'abc', lat: 0, lon: 1, altitude: 1000 },
        ] as unknown as AircraftSnapshot['aircraft'],
      },
    ]);
    useLiveTick.getState().bump();
    useSelectionStore.setState({ selectedHex: 'abc' });

    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await renderWithI18n(<DetailCard />);
    fireEvent.click(screen.getByRole('button', { name: /Export KML/ }));

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('exports only the selected history pass coordinates', async () => {
    historyStore.setFrames([
      { now: 100, messages: 0, aircraft: [{ hex: 'abc', lat: 1, lon: 10, altitude: 1000 }] },
      { now: 130, messages: 0, aircraft: [{ hex: 'abc', lat: 2, lon: 20, altitude: 1000 }] },
      { now: 44000, messages: 0, aircraft: [{ hex: 'abc', lat: 3, lon: 30, altitude: 2000 }] },
      { now: 44030, messages: 0, aircraft: [{ hex: 'abc', lat: 4, lon: 40, altitude: 2000 }] },
    ] as never);
    await historyStore.buildPassData();
    usePlaybackStore.getState().setMode('history');
    useSelectionStore.getState().selectPass('abc:44000', 'abc');
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await renderWithI18n(<DetailCard />);
    fireEvent.click(screen.getByRole('button', { name: /Export KML/ }));

    const xml = await (createSpy.mock.calls[0][0] as Blob).text();
    expect(xml).toContain('30 3');
    expect(xml).toContain('40 4');
    expect(xml).not.toContain('10 1');
    expect(xml).not.toContain('20 2');
  });

  it('renders a resize handle on the right edge', async () => {
    const a = new Aircraft('780ABC');
    Object.assign(a, { flight: 'CCA101', altitude: 35000 });
    aircraftStore.map.set('780ABC', a);
    useSelectionStore.setState({ selectedHex: '780ABC' });

    await renderWithI18n(<DetailCard />);
    expect(screen.getByTestId('resize-handle')).toBeInTheDocument();
  });

  it('panel width reflects detailWidth from store', async () => {
    const a = new Aircraft('780ABC');
    Object.assign(a, { flight: 'CCA101', altitude: 35000 });
    aircraftStore.map.set('780ABC', a);
    useSelectionStore.setState({ selectedHex: '780ABC' });
    useToolbarStore.setState({ detailWidth: 400 });

    await renderWithI18n(<DetailCard />);
    const panel = screen.getByTestId('detail-card');
    expect(panel.style.width).toBe('400px');
  });

  it('renders translated UI text in zh-CN', async () => {
    const a = new Aircraft('780ABC');
    Object.assign(a, {
      flight: 'CCA101',
      registration: 'B-2033',
      typeCode: 'A320',
      altitude: 35000,
      isMilitary: true,
    });
    aircraftStore.map.set('780ABC', a);
    useSelectionStore.setState({ selectedHex: '780ABC' });

    await renderWithI18n(<DetailCard />, { language: 'zh-CN' });

    expect(screen.getByRole('button', { name: '关闭详情' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '导出 KML' })).toBeInTheDocument();
    expect(screen.getByText('军机')).toBeInTheDocument();
    expect(screen.getByText('高度')).toBeInTheDocument();
  });
});
