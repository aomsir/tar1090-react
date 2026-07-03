import { AMBER, seriesOpacity } from './chartColors';

interface RankedBarListProps {
  items: { name: string; count: number }[];
  emptyText: string;
}

export function RankedBarList({ items, emptyText }: RankedBarListProps) {
  if (items.length === 0) {
    return <div className="py-8 text-center font-mono text-xs text-slate-500">{emptyText}</div>;
  }
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <li key={item.name} className="flex items-center gap-2">
          <span
            className="w-20 shrink-0 truncate text-right font-mono text-[11px] text-slate-400"
            title={item.name}
          >
            {item.name}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-sm bg-white/[0.06]">
            <div
              data-testid="ranked-bar-fill"
              className="h-full rounded-sm"
              style={{
                width: `${(item.count / max) * 100}%`,
                backgroundColor: AMBER,
                opacity: seriesOpacity(index),
              }}
            />
          </div>
          <span className="w-10 shrink-0 text-right font-mono text-[11px] text-slate-200 tabular-nums">
            {item.count}
          </span>
        </li>
      ))}
    </ul>
  );
}
