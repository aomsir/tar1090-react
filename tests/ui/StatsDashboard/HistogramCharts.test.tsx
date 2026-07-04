import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BarChart } from 'recharts';
import { SpeedChart } from '@/ui/StatsDashboard/SpeedChart';
import { DistanceChart } from '@/ui/StatsDashboard/DistanceChart';
import { AltitudeChart } from '@/ui/StatsDashboard/AltitudeChart';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  const PatchedBarChart = (
    props: React.ComponentProps<typeof BarChart> & { children?: React.ReactNode },
  ) => {
    const { margin, children } = props;
    return (
      <div
        data-testid="barchart"
        data-margin-top={margin?.top ?? 0}
        data-margin={JSON.stringify(margin ?? {})}
      >
        {children}
      </div>
    );
  };
  const PatchedResponsiveContainer = ({ children }: { children?: React.ReactNode }) => (
    <div style={{ width: 400, height: 200 }}>{children}</div>
  );
  return { ...actual, BarChart: PatchedBarChart, ResponsiveContainer: PatchedResponsiveContainer };
});

const data = [{ range: '400-450', count: 8 }];

describe('Histogram chart top margin (label clipping)', () => {
  it('SpeedChart reserves top space for BarChart labels', () => {
    const { getByTestId } = render(<SpeedChart data={data} />);
    const chart = getByTestId('barchart');
    const marginTop = Number(chart.getAttribute('data-margin-top'));
    expect(marginTop).toBeGreaterThan(0);
  });

  it('DistanceChart reserves top space for BarChart labels', () => {
    const { getByTestId } = render(<DistanceChart data={data} />);
    const chart = getByTestId('barchart');
    const marginTop = Number(chart.getAttribute('data-margin-top'));
    expect(marginTop).toBeGreaterThan(0);
  });

  it('AltitudeChart reserves top space for BarChart labels', () => {
    const { getByTestId } = render(<AltitudeChart data={data} />);
    const chart = getByTestId('barchart');
    const marginTop = Number(chart.getAttribute('data-margin-top'));
    expect(marginTop).toBeGreaterThan(0);
  });
});
