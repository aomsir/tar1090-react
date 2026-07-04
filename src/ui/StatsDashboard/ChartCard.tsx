interface ChartCardProps {
  title: string;
  unit?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, unit, children, className = '' }: ChartCardProps) {
  return (
    <div
      className={`flex h-full flex-col rounded-lg border border-amber-400/10 bg-white/[0.03] p-4 ${className}`}
    >
      <h3 className="mb-3 flex items-baseline gap-1.5 font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
        {title}
        {unit && <span className="font-normal text-slate-500 normal-case">· {unit}</span>}
      </h3>
      <div className="flex flex-1 flex-col min-h-0">{children}</div>
    </div>
  );
}
