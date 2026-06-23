import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatsDashboard } from './StatsDashboard';
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
  };
});

const mockStats: HistoryStatistics = {
  totalAircraft: 42,
  uniqueCallsigns: 35,
  militaryCount: 3,
  peakOnline: 20,
  typeDistribution: [{ name: 'B738', count: 10 }],
  airlineDistribution: [{ name: 'CCA', count: 5 }],
  countryDistribution: [{ name: 'China', count: 30 }],
  sourceDistribution: [{ name: 'ADS-B', count: 40 }],
  altitudeBins: [{ range: '30-35k', count: 15 }],
  speedBins: [{ range: '400-450', count: 8 }],
  distanceBins: [{ range: '50-75', count: 6 }],
  trafficTimeline: [{ time: 1000, count: 20 }],
};

describe('StatsDashboard', () => {
  beforeEach(() => {
    useHistoryStatsStore.getState().setStats(mockStats);
  });

  it('renders summary cards with correct values', () => {
    render(<StatsDashboard />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('renders chart titles', () => {
    render(<StatsDashboard />);
    expect(screen.getByText('Aircraft Type Distribution')).toBeInTheDocument();
    expect(screen.getByText('Airline Distribution')).toBeInTheDocument();
    expect(screen.getByText('Traffic Over Time')).toBeInTheDocument();
    expect(screen.getByText('Data Source')).toBeInTheDocument();
  });

  it('calls toggleStatsDashboard on close button click', async () => {
    useToolbarStore.setState({ statsDashboardOpen: true });
    render(<StatsDashboard />);
    const closeButton = screen.getByLabelText('Close statistics');
    await userEvent.click(closeButton);
    expect(useToolbarStore.getState().statsDashboardOpen).toBe(false);
  });

  it('renders nothing when stats is null', () => {
    useHistoryStatsStore.getState().clear();
    const { container } = render(<StatsDashboard />);
    expect(container.firstChild).toBeNull();
  });
});
