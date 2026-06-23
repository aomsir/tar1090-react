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

export function SummaryCards({ totalAircraft, uniqueCallsigns, militaryCount, peakOnline }: SummaryCardsProps) {
  const items: CardItem[] = [
    { label: 'Total Aircraft', value: totalAircraft },
    { label: 'Unique Callsigns', value: uniqueCallsigns },
    { label: 'Military', value: militaryCount },
    { label: 'Peak Online', value: peakOnline },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg bg-white/[0.04] p-4 text-center">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">{item.label}</div>
          <div className="mt-1 text-2xl font-bold text-slate-200">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
