import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@/i18n/testUtils';
import { SourceChart } from '@/ui/StatsDashboard/SourceChart';
import type { OtherStats } from '@/features/stats/historyStats';

const data = [
  { name: 'ADS-B', count: 30 },
  { name: 'MLAT', count: 10 },
];

const otherStats: OtherStats = {
  identified: { any: 37, callsign: 35, type: 30, registration: 28 },
  positioned: { position: 40, speed: 34, altitude: 36 },
  status: { ground: 2, emergency: 0, squawk: 32 },
};

describe('SourceChart', () => {
  it('uses Other as the card title', async () => {
    await renderWithI18n(
      <SourceChart data={data} totalAircraft={40} otherStats={otherStats} />,
      { language: 'en' },
    );
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('keeps the donut accessible as the Data Source image', async () => {
    await renderWithI18n(
      <SourceChart data={data} totalAircraft={40} otherStats={otherStats} />,
      { language: 'en' },
    );
    expect(screen.getByRole('img', { name: 'Data Source' })).toBeInTheDocument();
  });

  it('strokes donut segments with distinct palette colors', async () => {
    await renderWithI18n(
      <SourceChart data={data} totalAircraft={40} otherStats={otherStats} />,
      { language: 'en' },
    );
    const svg = screen.getByRole('img', { name: 'Data Source' });
    const circles = svg.querySelectorAll('circle');
    expect(circles).toHaveLength(2);
    expect(circles[0].getAttribute('stroke')).toBe('#fbbf24');
    expect(circles[1].getAttribute('stroke')).toBe('#38bdf8');
    expect(circles[0].getAttribute('stroke-opacity')).toBeNull();
  });

  it('renders matching legend swatch colors', async () => {
    await renderWithI18n(
      <SourceChart data={data} totalAircraft={40} otherStats={otherStats} />,
      { language: 'en' },
    );
    const swatches = screen.getAllByTestId('source-legend-swatch');
    expect(swatches[0].style.backgroundColor).toBe('rgb(251, 191, 36)');
    expect(swatches[1].style.backgroundColor).toBe('rgb(56, 189, 248)');
  });

  it('renders Identified, Positioned, and Status metric groups', async () => {
    await renderWithI18n(
      <SourceChart data={data} totalAircraft={40} otherStats={otherStats} />,
      { language: 'en' },
    );
    expect(screen.getByText('Identified')).toBeInTheDocument();
    expect(screen.getByText('Positioned')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows No emergency text when emergency count is zero', async () => {
    await renderWithI18n(
      <SourceChart data={data} totalAircraft={40} otherStats={otherStats} />,
      { language: 'en' },
    );
    expect(screen.getByText('No emergency')).toBeInTheDocument();
  });
});
