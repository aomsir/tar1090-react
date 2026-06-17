import { useAircraftRows } from '@/features/list/useAircraftRows';
import { useListControls } from '@/store/listControls';
import { useSelectionStore } from '@/store/selectionStore';
import { altitudeColor, hslString } from '@/domain/altitude';
import { formatAltitude } from '@/domain/format';
import type { FilterKey, SortKey } from '@/features/list/aircraftRows';

const FILTERS: { id: FilterKey; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'airborne', label: 'Airborne' },
  { id: 'ground', label: 'Ground' },
  { id: 'military', label: 'Military' },
];

const COLUMNS: { key: SortKey; label: string; className: string }[] = [
  { key: 'flight', label: 'Callsign' , className: 'flex-1' },
  { key: 'registration', label: 'Registration' , className: 'w-20' },
  { key: 'typeCode', label: 'Type' , className: 'w-14' },
  { key: 'altitude', label: 'Alt. (ft)' , className: 'w-20 text-right' },
  { key: 'speed', label: 'Spd. (kt)' , className: 'w-14 text-right' },
];

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
      className="glass absolute bottom-16 right-4 top-16 flex w-72 flex-col p-3 text-white"
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

      <div className="mt-2 flex gap-2 border-b border-white/10 pb-1 text-xs text-slate-400">
        {COLUMNS.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`${c.className} text-left hover:text-white`}
            onClick={() => toggleSort(c.key)}
          >
            {c.label}
            {sortKey === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
          </button>
        ))}
      </div>

      <div className="mt-1 flex-1 overflow-y-auto">
        {rows.map((r) => (
          <button
            key={r.hex}
            type="button"
            onClick={() => onSelect(r.hex)}
            className={`flex w-full items-center gap-2 rounded px-1 py-1 text-left text-xs hover:bg-white/10 ${
              r.hex === selectedHex ? 'bg-accent/20' : ''
            }`}
          >
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: hslString(altitudeColor(r.altitude)) }}
            />
            <span className="flex-1 truncate">{r.flight || r.hex}</span>
            <span className="w-20 truncate text-slate-300">{r.registration || '—'}</span>
            <span className="w-14 truncate text-slate-400">{r.typeCode || '—'}</span>
            <span className="w-20 text-right text-slate-200">{formatAltitude(r.altitude)}</span>
            <span className="w-14 text-right text-slate-400">
              {typeof r.speed === 'number' ? Math.round(r.speed) : '—'}
            </span>
          </button>
        ))}
        {rows.length === 0 ? <div className="text-muted px-1 py-2 text-xs">No matching aircraft</div> : null}
      </div>
    </aside>
  );
}
