import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartCard } from './ChartCard';
import { CHART_COLORS } from './chartColors';

interface SourceChartProps {
  data: { name: string; count: number }[];
}

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={11}
      fontWeight={500}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { value: number; name: string }[] }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded bg-zinc-900 px-2 py-1 text-xs text-white shadow">
      {payload[0].name}: {payload[0].value}
    </div>
  );
};

export function SourceChart({ data }: SourceChartProps) {
  return (
    <ChartCard title="Data Source">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie 
            data={data} 
            dataKey="count" 
            nameKey="name" 
            cx="50%" 
            cy="50%" 
            outerRadius={70} 
            strokeWidth={0}
            label={renderCustomLabel}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconType="circle"
            formatter={(value: string) => <span className="text-slate-300">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
