interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, children, className = '' }: ChartCardProps) {
  return (
    <div className={`rounded-lg border border-amber-400/10 bg-white/[0.03] p-4 ${className}`}>
      <h3 className="mb-3 font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}
