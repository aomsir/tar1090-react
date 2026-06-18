import { useAircraftRows } from '@/features/list/useAircraftRows';
import { useListControls } from '@/store/listControls';
import { useSelectionStore } from '@/store/selectionStore';
import { altitudeColor, hslString } from '@/domain/altitude';
import { formatAltitude } from '@/domain/format';
import type { AircraftRow, FilterKey, SortKey } from '@/features/list/aircraftRows';

const FILTERS: { id: FilterKey; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'airborne', label: 'Airborne' },
  { id: 'ground', label: 'Ground' },
  { id: 'military', label: 'Military' },
];

interface Column {
  key: SortKey | 'flag';
  label: string;
  className: string;
  sortable: boolean;
}

const COLUMNS: Column[] = [
  { key: 'flag', label: '', className: 'w-4 shrink-0', sortable: false },
  { key: 'flight', label: 'Callsign' , className: 'flex-1 min-w-[64px]', sortable: true },
  { key: 'typeCode', label: 'Type' , className: 'w-12 shrink-0', sortable: true },
  { key: 'squawk', label: 'SQK', className: 'w-11 shrink-0', sortable: true },
  { key: 'altitude', label: 'Alt. (ft)' , className: 'w-16 shrink-0 text-right', sortable: true },
  { key: 'speed', label: 'Spd. (kt)' , className: 'w-10 shrink-0 text-right', sortable: true },
];

const EMERGENCY_SQUAWKS = new Set(['7500', '7600', '7700']);

function rowBackground(row: AircraftRow, selected: boolean): string {
  if (selected) return 'bg-accent/25';
  if (EMERGENCY_SQUAWKS.has(row.squawk)) return 'bg-red-500/25';
  if (row.isMlat) return 'bg-amber-400/10';
  return '';
}

export function ListPanel({ onSelect }: { onSelect: (hex: string) => void }) {
  const rows = useAircraftRows();
  const filter = useListControls((s) => s.filter);
  const setFilter = useListControls((s) => s.setFilter);
  const sortKey = useListControls((s) => s.sortKey);
  const sortDir = useListControls((s) => s.sortDir);
  const toggleSort = useListControls((s) => s.toggleSort);
  const inViewOnly = useListControls((s) => s.inViewOnly);
  const setInViewOnly = useListControls((s) => s.setInViewOnly);
  const selectedHex = useSelectionStore((s) => s.selectedHex);

  return (
    <aside
      data-testid="list-panel"
      className="glass absolute bottom-16 right-4 top-16 flex w-96 flex-col p-3 text-white"
    >
      <div className="flex gap-1 rounded-md bg-white/5 p-0.5" role="tablist" aria-label="Aircraft filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`flex-1 rounded px-2 py-1 text-xs transition-colors ${
              filter === f.id ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <label className="text-muted mt-2 flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={inViewOnly}
          onChange={(e) => setInViewOnly(e.target.checked)}
        />
        Only aircraft in view
      </label>

      <div className="mt-2 flex gap-1.5 border-b border-white/10 pb-1 text-[11px] text-slate-400">
        {COLUMNS.map((c) =>
          c.sortable ? (
            <button
              key={c.key}
              type="button"
              className={`${c.className} hover:text-white ${
                c.className.includes('text-right') ? 'text-right' : 'text-left'
              }`}
              onClick={() => toggleSort(c.key as SortKey)}
            >
              {c.label}
              {sortKey === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
            </button>
          ) : (
            <span key={c.key} className={c.className} />
          ),
        )}
      </div>

      <div className="mt-1 flex-1 overflow-y-auto">
        {rows.map((r) => {
          const selected = r.hex === selectedHex;
          return (
            <button
              key={r.hex}
              type="button"
              data-testid={`row-${r.hex}`}
              onClick={() => onSelect(r.hex)}
              className={`flex w-full items-center gap-1.5 rounded px-1 py-1 text-left text-[11px] hover:bg-white/10 ${rowBackground(
                r,
                selected,
              )}`}
            >
              <span className="flex w-4 shrink-0 items-center justify-center">
                {r.flagPath ? (
                  <img src={r.flagPath} alt="" className="h-2.5 w-4 object-cover" />
                ) : (
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: hslString(altitudeColor(r.altitude)) }}
                  />
                )}
              </span>
              <span className="min-w-[64px] flex-1 truncate font-medium">{r.flight || r.hex}</span>
              <span className="w-12 shrink-0 truncate text-slate-400">{r.typeCode || '—'}</span>
              <span className="w-11 shrink-0 truncate text-slate-300">{r.squawk || '—'}</span>
              <span className="w-16 shrink-0 text-right text-slate-200">
                {formatAltitude(r.altitude)}
              </span>
              <span className="w-10 shrink-0 text-right text-slate-400">
                {typeof r.speed === 'number' ? Math.round(r.speed) : '—'}
              </span>
            </button>
          );
        })}
        {rows.length === 0 ? <div className="text-muted px-1 py-2 text-xs">No matching aircraft</div> : null}
      </div>
    </aside>
  );
}
