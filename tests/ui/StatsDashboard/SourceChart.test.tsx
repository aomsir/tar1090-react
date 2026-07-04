import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@/i18n/testUtils';
import { SourceChart } from '@/ui/StatsDashboard/SourceChart';

const data = [
  { name: 'ADS-B', count: 30 },
  { name: 'MLAT', count: 10 },
];

describe('SourceChart', () => {
  it('strokes donut segments with distinct palette colors', async () => {
    await renderWithI18n(<SourceChart data={data} />, { language: 'en' });
    const svg = screen.getByRole('img', { name: 'Data Source' });
    const circles = svg.querySelectorAll('circle');
    expect(circles).toHaveLength(2);
    expect(circles[0].getAttribute('stroke')).toBe('#fbbf24');
    expect(circles[1].getAttribute('stroke')).toBe('#38bdf8');
    expect(circles[0].getAttribute('stroke-opacity')).toBeNull();
  });

  it('renders matching legend swatch colors', async () => {
    await renderWithI18n(<SourceChart data={data} />, { language: 'en' });
    const swatches = screen.getAllByTestId('source-legend-swatch');
    expect(swatches[0].style.backgroundColor).toBe('rgb(251, 191, 36)');
    expect(swatches[1].style.backgroundColor).toBe('rgb(56, 189, 248)');
  });
});
