import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatShortTime } from '@/i18n/format';
import { ChartCard } from './ChartCard';
import { PRIMARY_COLOR, PRIMARY_FILL, AXIS_COLOR } from './chartColors';

interface TrafficTimelineProps {
  data: { time: number; count: number }[];
}

function TrafficTimelineTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { value: number; payload: { time: number } }[];
}) {
  const { t, i18n } = useTranslation();
  if (!active || !payload?.length) return null;
  const formatTime = (ts: number) => formatShortTime(ts, i18n.language);
  return (
    <div className="rounded bg-zinc-900 px-2 py-1 text-xs text-white shadow">
      {formatTime(payload[0].payload.time)}: {payload[0].value} {t('stats.aircraft')}
    </div>
  );
}

export function TrafficTimeline({ data }: TrafficTimelineProps) {
  const { t, i18n } = useTranslation();
  const formatTime = (ts: number) => formatShortTime(ts, i18n.language);

  return (
    <ChartCard title={t('stats.charts.trafficOverTime')}>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ left: 0, right: 12 }}>
          <XAxis
            dataKey="time"
            tickFormatter={formatTime}
            tick={{ fill: AXIS_COLOR, fontSize: 12 }}
          />
          <YAxis
            tick={{ fill: AXIS_COLOR, fontSize: 12 }}
            label={{
              value: t('stats.aircraftAxis'),
              angle: -90,
              position: 'insideLeft',
              style: { fill: AXIS_COLOR },
            }}
          />
          <Tooltip content={<TrafficTimelineTooltip />} cursor={{ stroke: PRIMARY_COLOR }} />
          <Area type="monotone" dataKey="count" stroke={PRIMARY_COLOR} fill={PRIMARY_FILL} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
