import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@/i18n/testUtils';
import { StatsDashboard } from '@/ui/StatsDashboard/StatsDashboard';
import { useHistoryStatsStore } from '@/store/historyStatsStore';
import { useToolbarStore } from '@/store/toolbarStore';
import type { HistoryStatistics } from '@/features/stats/historyStats';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 200 }}>{children}</div>
    ),
    AreaChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
    ReferenceDot: ({ label }: { label?: { value?: string } }) =>
      label?.value ? <span>{label.value}</span> : null,
  };
});

const mockStats: HistoryStatistics = {
  totalAircraft: 42,
  uniqueCallsigns: 35,
  militaryCount: 3,
  peakOnline: 20,
  peakTime: 1000,
  typeDistribution: [{ name: 'B738', count: 10 }],
  airlineDistribution: [{ name: 'CCA', count: 5 }],
  countryDistribution: [{ name: 'China', count: 30 }],
  sourceDistribution: [{ name: 'ADS-B', count: 40 }],
  altitudeBins: [{ range: '30-35k', count: 15 }],
  speedBins: [{ range: '400-450', count: 8 }],
  distanceBins: [{ range: '50-75', count: 6 }],
  trafficTimeline: [{ time: 1000, count: 20 }],
  otherStats: {
    identified: { any: 37, callsign: 35, type: 30, registration: 28 },
    positioned: { position: 40, speed: 34, altitude: 36 },
    status: { ground: 2, emergency: 0, squawk: 32 },
  },
};

describe('StatsDashboard', () => {
  beforeEach(() => {
    useHistoryStatsStore.getState().setStats(mockStats);
  });

  it('renders summary cards with correct values', async () => {
    await renderWithI18n(<StatsDashboard />, { language: 'en' });
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('renders chart titles', async () => {
    await renderWithI18n(<StatsDashboard />, { language: 'en' });
    expect(screen.getByText('Aircraft Type')).toBeInTheDocument();
    expect(screen.getByText('Airline')).toBeInTheDocument();
    expect(screen.getByText('Traffic Over Time')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('calls toggleStatsDashboard on close button click', async () => {
    useToolbarStore.setState({ statsDashboardOpen: true });
    await renderWithI18n(<StatsDashboard />, { language: 'en' });
    const closeButton = screen.getByLabelText('Close statistics');
    await userEvent.click(closeButton);
    expect(useToolbarStore.getState().statsDashboardOpen).toBe(false);
  });

  it('renders nothing when stats is null', async () => {
    useHistoryStatsStore.getState().clear();
    const { container } = await renderWithI18n(<StatsDashboard />, { language: 'en' });
    expect(container.firstChild).toBeNull();
  });

  it('renders translated dashboard text in Chinese', async () => {
    await renderWithI18n(<StatsDashboard />, { language: 'zh-CN' });
    expect(screen.getByText('历史统计')).toBeInTheDocument();
    expect(screen.getByText('飞机总数')).toBeInTheDocument();
  });

  it('renders summary context lines', async () => {
    await renderWithI18n(<StatsDashboard />, { language: 'en' });
    expect(screen.getByText('83% with callsign')).toBeInTheDocument(); // 35/42
    expect(screen.getByText('7.1% of total')).toBeInTheDocument(); // 3/42
  });

  it('shows window duration in minutes in the header', async () => {
    useHistoryStatsStore.getState().setStats({
      ...mockStats,
      trafficTimeline: [
        { time: 1000, count: 20 },
        { time: 1000 + 5 * 60, count: 10 },
      ],
    });
    await renderWithI18n(<StatsDashboard />, { language: 'en' });
    expect(screen.getByTestId('stats-time-range').textContent).toBe('PAST 5 MIN');
  });

  it('shows sub-minute windows as less than one minute', async () => {
    await renderWithI18n(<StatsDashboard />, { language: 'en' });
    // mockStats has a single timeline point -> zero span
    expect(screen.getByTestId('stats-time-range').textContent).toBe('PAST <1 MIN');
  });

  it('shows hour-scale windows with hours and minutes', async () => {
    useHistoryStatsStore.getState().setStats({
      ...mockStats,
      trafficTimeline: [
        { time: 1000, count: 20 },
        { time: 1000 + 80 * 60, count: 10 },
      ],
    });
    await renderWithI18n(<StatsDashboard />, { language: 'en' });
    expect(screen.getByTestId('stats-time-range').textContent).toBe('PAST 1 H 20 MIN');
  });

  it('shows exact-hour windows without a minute part', async () => {
    useHistoryStatsStore.getState().setStats({
      ...mockStats,
      trafficTimeline: [
        { time: 1000, count: 20 },
        { time: 1000 + 120 * 60, count: 10 },
      ],
    });
    await renderWithI18n(<StatsDashboard />, { language: 'en' });
    expect(screen.getByTestId('stats-time-range').textContent).toBe('PAST 2 H');
  });

  it('shows day-scale windows with days and remaining hours', async () => {
    useHistoryStatsStore.getState().setStats({
      ...mockStats,
      trafficTimeline: [
        { time: 1000, count: 20 },
        { time: 1000 + (20 * 24 + 5) * 60 * 60, count: 10 },
      ],
    });
    await renderWithI18n(<StatsDashboard />, { language: 'en' });
    expect(screen.getByTestId('stats-time-range').textContent).toBe('PAST 20 D 5 H');
  });

  it('rounds day-scale windows to the nearest hour', async () => {
    useHistoryStatsStore.getState().setStats({
      ...mockStats,
      trafficTimeline: [
        { time: 1000, count: 20 },
        { time: 1000 + (24 * 60 + 30) * 60, count: 10 },
      ],
    });
    await renderWithI18n(<StatsDashboard />, { language: 'en' });
    expect(screen.getByTestId('stats-time-range').textContent).toBe('PAST 1 D 1 H');
  });

  it('renders donut total and legend percentages for data source', async () => {
    await renderWithI18n(<StatsDashboard />, { language: 'en' });
    expect(screen.getByRole('img', { name: 'Data Source' })).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument(); // donut center total
    expect(screen.getByText(/100%/)).toBeInTheDocument(); // legend share
  });

  it('renders Identified, Positioned, Status, and No emergency from otherStats', async () => {
    await renderWithI18n(<StatsDashboard />, { language: 'en' });
    expect(screen.getByText('Identified')).toBeInTheDocument();
    expect(screen.getByText('Positioned')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('No emergency')).toBeInTheDocument();
  });

  it('annotates the traffic peak on the timeline', async () => {
    await renderWithI18n(<StatsDashboard />, { language: 'en' });
    expect(screen.getByText(/20 @/)).toBeInTheDocument();
  });

  it('renders a semantic icon on each summary card', async () => {
    await renderWithI18n(<StatsDashboard />, { language: 'en' });
    expect(screen.getAllByTestId('kpi-icon')).toHaveLength(4);
  });

  it('renders unit suffixes on histogram cards instead of axis titles', async () => {
    await renderWithI18n(<StatsDashboard />, { language: 'en' });
    expect(screen.getByText('· ft')).toBeInTheDocument();
    expect(screen.getByText('· kt')).toBeInTheDocument();
    expect(screen.getByText('· nmi')).toBeInTheDocument();
    expect(screen.queryByText('Count')).toBeNull();
    expect(screen.getByText('Speed Distribution')).toBeInTheDocument();
  });

  it('top-aligns the Type/Airline/Other row to avoid stretched lists', async () => {
    await renderWithI18n(<StatsDashboard />, { language: 'en' });
    const typeChart = screen.getByText('Aircraft Type').closest('div.grid');
    expect(typeChart).not.toBeNull();
    expect(typeChart!.className).toContain('items-start');
  });
});
