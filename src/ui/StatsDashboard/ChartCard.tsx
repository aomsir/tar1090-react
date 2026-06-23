interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, children, className = '' }: ChartCardProps) {
  return (
    <div className={`rounded-lg bg-white/[0.04] p-4 ${className}`}>
      <h3 className="mb-3 text-xs font-medium text-slate-500">{title}</h3>
      {children}
    </div>
  );
}
