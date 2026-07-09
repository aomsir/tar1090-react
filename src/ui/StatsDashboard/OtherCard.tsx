import { useTranslation } from 'react-i18next';
import type { OtherStats } from '@/features/stats/historyStats';
import { formatInteger } from '@/i18n/format';
import { ChartCard } from './ChartCard';
import { MONO_FONT, seriesColor } from './chartColors';

interface OtherCardProps {
  data: { name: string; count: number }[];
  totalPasses: number;
  otherStats: OtherStats;
}

// r=15.9155 -> circumference ~= 100, so dash lengths are percentages
const RADIUS = 15.9155;

function formatPercent(numerator: number, denominator: number): string {
  if (denominator <= 0) return '--';
  const p = (numerator / denominator) * 100;
  return p > 0 && p < 10 ? `${p.toFixed(1)}%` : `${Math.round(p)}%`;
}

interface MetricBarProps {
  label: string;
  count: number;
  total: number;
  language: string;
  colorIndex: number;
}

function MetricBar({ label, count, total, language, colorIndex }: MetricBarProps) {
  return (
    <li className="flex items-center gap-2">
      <span className="w-20 shrink-0 truncate text-right font-mono text-[11px] text-slate-400">
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-white/[0.06]">
        <div
          className="h-full rounded-sm"
          style={{
            width: `${total > 0 ? (count / total) * 100 : 0}%`,
            backgroundColor: seriesColor(colorIndex),
          }}
        />
      </div>
      <span className="w-16 shrink-0 text-right font-mono text-[11px] text-slate-300 tabular-nums">
        {formatInteger(count, language)} · {formatPercent(count, total)}
      </span>
    </li>
  );
}

interface MetricGroupProps {
  title: string;
  headline: string;
  children: React.ReactNode;
}

function MetricGroup({ title, headline, children }: MetricGroupProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
          {title}
        </span>
        <span className="font-mono text-[11px] text-slate-500 tabular-nums">{headline}</span>
      </div>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </div>
  );
}

export function OtherCard({ data, totalPasses, otherStats }: OtherCardProps) {
  const { t, i18n } = useTranslation();
  const localized = data.map((d) => ({
    ...d,
    name: d.name === 'Other' ? t('stats.categories.other') : d.name,
  }));
  const total = localized.reduce((sum, d) => sum + d.count, 0);

  const identified = otherStats.identified;
  const positioned = otherStats.positioned;
  const status = otherStats.status;
  const lang = i18n.language;

  const renderDonut = () => {
    if (total === 0) {
      return (
        <div className="py-8 text-center font-mono text-xs text-slate-500">{t('stats.noData')}</div>
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
            {formatInteger(total, lang)}
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
                {formatInteger(s.count, lang)} · {Math.round(s.frac * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <ChartCard title={t('stats.charts.dataSource')}>
      {renderDonut()}
      <div className="mt-3 flex flex-col gap-3 border-t border-white/[0.06] pt-3">
        <MetricGroup
          title={t('stats.otherMetrics.identified')}
          headline={`${formatInteger(identified.any, lang)} / ${formatInteger(totalPasses, lang)}`}
        >
          <MetricBar
            label={t('stats.otherMetrics.callsign')}
            count={identified.callsign}
            total={totalPasses}
            language={lang}
            colorIndex={0}
          />
          <MetricBar
            label={t('stats.otherMetrics.type')}
            count={identified.type}
            total={totalPasses}
            language={lang}
            colorIndex={1}
          />
          <MetricBar
            label={t('stats.otherMetrics.registration')}
            count={identified.registration}
            total={totalPasses}
            language={lang}
            colorIndex={2}
          />
        </MetricGroup>

        <MetricGroup
          title={t('stats.otherMetrics.positioned')}
          headline={`${formatInteger(positioned.position, lang)} / ${formatInteger(totalPasses, lang)}`}
        >
          <MetricBar
            label={t('stats.otherMetrics.position')}
            count={positioned.position}
            total={totalPasses}
            language={lang}
            colorIndex={0}
          />
          <MetricBar
            label={t('stats.otherMetrics.speed')}
            count={positioned.speed}
            total={totalPasses}
            language={lang}
            colorIndex={1}
          />
          <MetricBar
            label={t('stats.otherMetrics.altitude')}
            count={positioned.altitude}
            total={totalPasses}
            language={lang}
            colorIndex={2}
          />
        </MetricGroup>

        <MetricGroup
          title={t('stats.otherMetrics.status')}
          headline={
            status.emergency === 0
              ? t('stats.otherMetrics.noEmergency')
              : t('stats.otherMetrics.emergencyCount', { count: status.emergency })
          }
        >
          <MetricBar
            label={t('stats.otherMetrics.ground')}
            count={status.ground}
            total={totalPasses}
            language={lang}
            colorIndex={0}
          />
          <MetricBar
            label={t('stats.otherMetrics.squawk')}
            count={status.squawk}
            total={totalPasses}
            language={lang}
            colorIndex={3}
          />
        </MetricGroup>
      </div>
    </ChartCard>
  );
}
