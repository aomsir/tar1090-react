import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartCard } from './ChartCard';

interface TrafficTimelineProps {
  data: { time: number; count: number }[];
}

function formatTime(ts: number): string {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { value: number; payload: { time: number } }[] }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded bg-zinc-900 px-2 py-1 text-xs text-white shadow">
      {formatTime(payload[0].payload.time)}: {payload[0].value} aircraft
    </div>
  );
};

export function TrafficTimeline({ data }: TrafficTimelineProps) {
  return (
    <ChartCard title="Traffic Over Time">
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ left: 0, right: 12 }}>
          <XAxis dataKey="time" tickFormatter={formatTime} tick={{ fill: '#64748b', fontSize: 10 }} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#475569' }} />
          <Area type="monotone" dataKey="count" stroke="#94a3b8" fill="rgba(148,163,184,0.15)" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
