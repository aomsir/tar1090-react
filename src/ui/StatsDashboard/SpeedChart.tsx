import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartCard } from './ChartCard';

interface SpeedChartProps {
  data: { range: string; count: number }[];
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { value: number; payload: { range: string } }[] }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded bg-zinc-900 px-2 py-1 text-xs text-white shadow">
      {payload[0].payload.range} kt: {payload[0].value}
    </div>
  );
};

export function SpeedChart({ data }: SpeedChartProps) {
  return (
    <ChartCard title="Speed Distribution (kt)">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ left: 0, right: 12 }}>
          <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-30} textAnchor="end" height={40} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="count" fill="#64748b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
