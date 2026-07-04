import { useId } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatShortTime } from '@/i18n/format';
import { ChartCard } from './ChartCard';
import { TooltipBox } from './TooltipBox';
import {
  AMBER,
  AMBER_FILL_TOP,
  AMBER_FILL_BOTTOM,
  AXIS_COLOR,
  GRID_COLOR,
  MONO_FONT,
} from './chartColors';

interface TrafficTimelineProps {
  data: { time: number; count: number }[];
  peakOnline: number;
  peakTime: number;
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
  return (
    <TooltipBox>
      {formatShortTime(payload[0].payload.time, i18n.language)}: {payload[0].value}{' '}
      {t('stats.aircraft')}
    </TooltipBox>
  );
}

export function TrafficTimeline({ data, peakOnline, peakTime }: TrafficTimelineProps) {
  const { t, i18n } = useTranslation();
  const formatTime = (ts: number) => formatShortTime(ts, i18n.language);
  const tickStyle = { fill: AXIS_COLOR, fontSize: 11, fontFamily: MONO_FONT };
  const gradientId = useId();

  return (
    <ChartCard title={t('stats.charts.trafficOverTime')}>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ left: 0, right: 12, top: 16 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={AMBER_FILL_TOP} />
              <stop offset="100%" stopColor={AMBER_FILL_BOTTOM} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID_COLOR} vertical={false} />
          <XAxis dataKey="time" tickFormatter={formatTime} tick={tickStyle} />
          <YAxis tick={tickStyle} />
          <Tooltip content={<TrafficTimelineTooltip />} cursor={{ stroke: AMBER }} />
          <Area
            type="monotone"
            dataKey="count"
            stroke={AMBER}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
          />
          {peakTime > 0 && (
            <ReferenceDot
              x={peakTime}
              y={peakOnline}
              r={3}
              fill={AMBER}
              stroke="none"
              label={{
                value: `${peakOnline} @ ${formatShortTime(peakTime, i18n.language)}`,
                position: 'top',
                fill: AMBER,
                fontSize: 10,
                fontFamily: MONO_FONT,
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
