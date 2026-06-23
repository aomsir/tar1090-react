import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Legend, Cell } from 'recharts';
import { ChartCard } from './ChartCard';
import { CHART_COLORS, AXIS_COLOR, LABEL_COLOR } from './chartColors';

interface TypeChartProps {
  data: { name: string; count: number }[];
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { value: number; payload: { name: string } }[] }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded bg-zinc-900 px-2 py-1 text-xs text-white shadow">
      {payload[0].payload.name}: {payload[0].value}
    </div>
  );
};

export function TypeChart({ data }: TypeChartProps) {
  return (
    <ChartCard title="Aircraft Type Distribution">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 40, right: 12 }}>
          <XAxis type="number" tick={{ fill: AXIS_COLOR, fontSize: 12 }} />
          <YAxis type="category" dataKey="name" tick={{ fill: AXIS_COLOR, fontSize: 12 }} width={50} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(31, 119, 180, 0.1)' }} />
          <Bar dataKey="count" radius={[0, 3, 3, 0]}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
            <LabelList dataKey="count" position="right" style={{ fill: LABEL_COLOR, fontSize: 11 }} className="hidden sm:block" />
          </Bar>
          <Legend 
            wrapperStyle={{ fontSize: '12px' }} 
            iconType="square"
            formatter={(value) => <span className="text-slate-300">{value}</span>}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
