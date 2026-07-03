import { useTranslation } from 'react-i18next';
import { formatInteger, formatShortTime } from '@/i18n/format';

interface SummaryCardsProps {
  totalAircraft: number;
  uniqueCallsigns: number;
  militaryCount: number;
  peakOnline: number;
  peakTime: number;
}

interface CardItem {
  label: string;
  value: number;
  sub: string | null;
}

function formatPercent(numerator: number, denominator: number): string {
  if (denominator <= 0) return '--';
  const p = (numerator / denominator) * 100;
  return p > 0 && p < 10 ? `${p.toFixed(1)}%` : `${Math.round(p)}%`;
}

export function SummaryCards({
  totalAircraft,
  uniqueCallsigns,
  militaryCount,
  peakOnline,
  peakTime,
}: SummaryCardsProps) {
  const { t, i18n } = useTranslation();
  const items: CardItem[] = [
    { label: t('stats.summary.totalAircraft'), value: totalAircraft, sub: null },
    {
      label: t('stats.summary.uniqueCallsigns'),
      value: uniqueCallsigns,
      sub: t('stats.summary.withCallsign', {
        percent: formatPercent(uniqueCallsigns, totalAircraft),
      }),
    },
    {
      label: t('stats.summary.military'),
      value: militaryCount,
      sub: t('stats.summary.ofTotal', { percent: formatPercent(militaryCount, totalAircraft) }),
    },
    {
      label: t('stats.summary.peakOnline'),
      value: peakOnline,
      sub: peakTime > 0 ? formatShortTime(peakTime, i18n.language) : null,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-amber-400/10 bg-white/[0.03] p-4"
        >
          <div className="font-mono text-[10px] tracking-widest text-slate-500 uppercase">
            {item.label}
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-200 tabular-nums">
            {formatInteger(item.value, i18n.language)}
          </div>
          <div className="mt-0.5 h-4 font-mono text-[10px] text-slate-500">{item.sub}</div>
        </div>
      ))}
    </div>
  );
}