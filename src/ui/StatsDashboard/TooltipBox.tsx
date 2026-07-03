interface TooltipBoxProps {
  children: React.ReactNode;
}

export function TooltipBox({ children }: TooltipBoxProps) {
  return (
    <div className="rounded border border-amber-400/30 bg-[#0d131d] px-2 py-1 font-mono text-xs text-slate-200 shadow-lg">
      {children}
    </div>
  );
}
