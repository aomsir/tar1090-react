import { SearchField } from '@heroui/react';
import { useStatsStore } from '@/store/statsStore';
import { useListControls } from '@/store/listControls';

export function CommandBar() {
  const count = useStatsStore((s) => s.count);
  const rate = useStatsStore((s) => s.messageRate);
  const query = useListControls((s) => s.query);
  const setQuery = useListControls((s) => s.setQuery);

  return (
    <header
      data-testid="command-bar"
      className="glass absolute left-4 right-4 top-3 flex h-11 items-center gap-3 px-4 text-white"
    >
      <span className="font-semibold">Live Traffic</span>
      <SearchField
        aria-label="Search aircraft"
        value={query}
        onChange={setQuery}
        variant="secondary"
        className="ml-4"
      >
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input className="w-64" placeholder="Flight / registration / ICAO" />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      <span className="ml-auto text-sm text-slate-400">
        Aircraft {count} · {Math.round(rate)} msg/s
      </span>
    </header>
  );
}
