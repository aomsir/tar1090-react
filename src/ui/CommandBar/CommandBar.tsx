import { useStatsStore } from '@/store/statsStore';

export function CommandBar() {
  const count = useStatsStore((s) => s.count);
  const rate = useStatsStore((s) => s.messageRate);
  return (
    <header
      data-testid="command-bar"
      className="glass absolute left-4 right-4 top-3 flex h-11 items-center gap-3 px-4 text-white"
    >
      <span className="font-semibold">Live Traffic</span>
      <span className="ml-auto text-sm text-slate-400">
        Aircraft {count} · {Math.round(rate)} msg/s
      </span>
    </header>
  );
}
