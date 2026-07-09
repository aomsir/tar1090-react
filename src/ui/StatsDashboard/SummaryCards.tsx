import { useTranslation } from 'react-i18next';
import { Plane, Radio, Shield, TrendingUp, Waypoints } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatInteger, formatShortTime } from '@/i18n/format';
import { AMBER, SEMANTIC_GREEN, SEMANTIC_RED, SEMANTIC_SKY } from './chartColors';

interface SummaryCardsProps {
  totalPasses: number;
  uniqueAircraft: number;
  uniqueCallsigns: number;
  callsignPasses: number;
  militaryPasses: number;
  peakOnline: number;
  peakTime: number;
}

interface CardItem {
  label: string;
  value: number;
  sub: string | null;
  icon: LucideIcon;
  iconColor: string;
}

function formatPercent(numerator: number, denominator: number): string {
  if (denominator <= 0) return '--';
  const p = (numerator / denominator) * 100;
  return p > 0 && p < 10 ? `${p.toFixed(1)}%` : `${Math.round(p)}%`;
}

export function SummaryCards({
  totalPasses,
  uniqueAircraft,
  uniqueCallsigns,
  callsignPasses,
  militaryPasses,
  peakOnline,
  peakTime,
}: SummaryCardsProps) {
  const { t, i18n } = useTranslation();
  const items: CardItem[] = [
    {
      label: t('stats.summary.totalPasses'),
      value: totalPasses,
      sub: null,
      icon: Waypoints,
      iconColor: AMBER,
    },
    {
      label: t('stats.summary.uniqueAircraft'),
      value: uniqueAircraft,
      sub: null,
      icon: Plane,
      iconColor: SEMANTIC_SKY,
    },
    {
      label: t('stats.summary.uniqueCallsigns'),
      value: uniqueCallsigns,
      sub: t('stats.summary.withCallsign', {
        percent: formatPercent(callsignPasses, totalPasses),
      }),
      icon: Radio,
      iconColor: SEMANTIC_SKY,
    },
    {
      label: t('stats.summary.militaryPasses'),
      value: militaryPasses,
      sub: t('stats.summary.ofTotal', { percent: formatPercent(militaryPasses, totalPasses) }),
      icon: Shield,
      iconColor: SEMANTIC_RED,
    },
    {
      label: t('stats.summary.peakOnline'),
      value: peakOnline,
      sub: peakTime > 0 ? formatShortTime(peakTime, i18n.language) : null,
      icon: TrendingUp,
      iconColor: SEMANTIC_GREEN,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-amber-400/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-1.5">
            <item.icon size={14} color={item.iconColor} aria-hidden="true" data-testid="kpi-icon" />
            <span className="font-mono text-[10px] tracking-widest text-slate-500 uppercase">
              {item.label}
            </span>
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
