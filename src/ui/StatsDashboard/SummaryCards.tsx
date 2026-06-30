import { useTranslation } from 'react-i18next';
import { formatInteger } from '@/i18n/format';

interface SummaryCardsProps {
  totalAircraft: number;
  uniqueCallsigns: number;
  militaryCount: number;
  peakOnline: number;
}

interface CardItem {
  label: string;
  value: number;
}

export function SummaryCards({
  totalAircraft,
  uniqueCallsigns,
  militaryCount,
  peakOnline,
}: SummaryCardsProps) {
  const { t, i18n } = useTranslation();
  const items: CardItem[] = [
    { label: t('stats.summary.totalAircraft'), value: totalAircraft },
    { label: t('stats.summary.uniqueCallsigns'), value: uniqueCallsigns },
    { label: t('stats.summary.military'), value: militaryCount },
    { label: t('stats.summary.peakOnline'), value: peakOnline },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg bg-white/[0.04] p-4 text-center">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">{item.label}</div>
          <div className="mt-1 text-2xl font-bold text-slate-200">
            {formatInteger(item.value, i18n.language)}
          </div>
        </div>
      ))}
    </div>
  );
}
