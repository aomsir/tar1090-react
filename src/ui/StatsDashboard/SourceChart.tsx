import { useTranslation } from 'react-i18next';
import { formatInteger } from '@/i18n/format';
import { ChartCard } from './ChartCard';
import { MONO_FONT, seriesColor } from './chartColors';

interface SourceChartProps {
  data: { name: string; count: number }[];
}

// r=15.9155 -> circumference ~= 100, so dash lengths are percentages
const RADIUS = 15.9155;

export function SourceChart({ data }: SourceChartProps) {
  const { t, i18n } = useTranslation();
  const localized = data.map((d) => ({
    ...d,
    name: d.name === 'Other' ? t('stats.categories.other') : d.name,
  }));
  const total = localized.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <ChartCard title={t('stats.charts.dataSource')}>
        <div className="py-8 text-center font-mono text-xs text-slate-500">{t('stats.noData')}</div>
      </ChartCard>
    );
  }

  const fracs = localized.map((d) => d.count / total);
  const segments = localized.map((d, index) => {
    const frac = fracs[index];
    const prefixSum = fracs.slice(0, index).reduce((sum, f) => sum + f, 0);
    return {
      ...d,
      frac,
      dasharray: `${frac * 100} ${100 - frac * 100}`,
      dashoffset: 25 - prefixSum * 100,
      color: seriesColor(index),
    };
  });

  return (
    <ChartCard title={t('stats.charts.dataSource')}>
      <div className="flex items-center gap-5 py-2">
        <svg
          viewBox="0 0 42 42"
          className="h-28 w-28 shrink-0"
          role="img"
          aria-label={t('stats.charts.dataSource')}
        >
          {segments.map((s) => (
            <circle
              key={s.name}
              cx="21"
              cy="21"
              r={RADIUS}
              fill="none"
              stroke={s.color}
              strokeWidth="5"
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
            />
          ))}
          <text
            x="21"
            y="20.5"
            textAnchor="middle"
            fontSize="7"
            fontWeight="700"
            fontFamily={MONO_FONT}
            fill="#e2e8f0"
          >
            {formatInteger(total, i18n.language)}
          </text>
          <text
            x="21"
            y="27"
            textAnchor="middle"
            fontSize="3.5"
            fontFamily={MONO_FONT}
            fill="#64748b"
          >
            TOTAL
          </text>
        </svg>
        <ul className="flex flex-col gap-1.5 font-mono text-[11px]">
          {segments.map((s) => (
            <li key={s.name} className="flex items-center gap-2">
              <span
                data-testid="source-legend-swatch"
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-slate-300">{s.name}</span>
              <span className="text-slate-500 tabular-nums">
                {formatInteger(s.count, i18n.language)} · {Math.round(s.frac * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}
