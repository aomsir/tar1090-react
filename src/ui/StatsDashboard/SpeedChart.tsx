import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { useTranslation } from 'react-i18next';
import { ChartCard } from './ChartCard';
import { TooltipBox } from './TooltipBox';
import { AMBER, AMBER_CURSOR, AXIS_COLOR, LABEL_COLOR, MONO_FONT } from './chartColors';

interface SpeedChartProps {
  data: { range: string; count: number }[];
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; payload: { range: string } }[];
}) => {
  if (!active || !payload?.length) return null;
  return (
    <TooltipBox>
      {payload[0].payload.range} kt: {payload[0].value}
    </TooltipBox>
  );
};

export function SpeedChart({ data }: SpeedChartProps) {
  const { t } = useTranslation();

  return (
    <ChartCard title={t('stats.charts.speedDistribution')}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ left: 0, right: 12 }}>
          <XAxis
            dataKey="range"
            tick={{ fill: AXIS_COLOR, fontSize: 11, fontFamily: MONO_FONT }}
            angle={-30}
            textAnchor="end"
            height={40}
            label={{
              value: t('stats.axes.speedKts'),
              position: 'insideBottom',
              offset: -5,
              style: { fill: AXIS_COLOR },
            }}
          />
          <YAxis
            tick={{ fill: AXIS_COLOR, fontSize: 11, fontFamily: MONO_FONT }}
            label={{
              value: t('stats.count'),
              angle: -90,
              position: 'insideLeft',
              style: { fill: AXIS_COLOR },
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: AMBER_CURSOR }} />
          <Bar dataKey="count" fill={AMBER} fillOpacity={0.85} radius={[3, 3, 0, 0]}>
            <LabelList
              dataKey="count"
              position="top"
              style={{ fill: LABEL_COLOR, fontSize: 10, fontFamily: MONO_FONT }}
              className="hidden sm:block"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
