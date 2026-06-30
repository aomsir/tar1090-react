import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { useTranslation } from 'react-i18next';
import { ChartCard } from './ChartCard';
import { PRIMARY_COLOR, AXIS_COLOR, LABEL_COLOR } from './chartColors';

interface DistanceChartProps {
  data: { range: string; count: number }[];
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { value: number; payload: { range: string } }[] }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded bg-zinc-900 px-2 py-1 text-xs text-white shadow">
      {payload[0].payload.range} nmi: {payload[0].value}
    </div>
  );
};

export function DistanceChart({ data }: DistanceChartProps) {
  const { t } = useTranslation();

  return (
    <ChartCard title={t('stats.charts.distanceDistribution')}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ left: 0, right: 12 }}>
          <XAxis
            dataKey="range"
            tick={{ fill: AXIS_COLOR, fontSize: 12 }}
            angle={-30}
            textAnchor="end"
            height={40}
            label={{ value: t('stats.axes.distanceNmi'), position: 'insideBottom', offset: -5, style: { fill: AXIS_COLOR } }}
          />
          <YAxis tick={{ fill: AXIS_COLOR, fontSize: 12 }} label={{ value: t('stats.count'), angle: -90, position: 'insideLeft', style: { fill: AXIS_COLOR } }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(31, 119, 180, 0.1)' }} />
          <Bar dataKey="count" fill={PRIMARY_COLOR} radius={[3, 3, 0, 0]}>
            <LabelList
              dataKey="count"
              position="top"
              style={{ fill: LABEL_COLOR, fontSize: 11 }}
              className="hidden sm:block"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
