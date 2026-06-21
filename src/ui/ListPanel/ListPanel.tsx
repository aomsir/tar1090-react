import { useRef } from 'react';
import { useAircraftRows } from '@/features/list/useAircraftRows';
import { LIST_COLUMNS } from '@/features/list/columns';
import { useListControls } from '@/store/listControls';
import { useSelectionStore } from '@/store/selectionStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { altitudeColor, hslString } from '@/domain/altitude';
import type { AircraftRow, FilterKey, SortKey } from '@/features/list/aircraftRows';
import type { ListColumn } from '@/features/list/columns';

const FILTERS: { id: FilterKey; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'airborne', label: 'Airborne' },
  { id: 'ground', label: 'Ground' },
  { id: 'military', label: 'Military' },
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
  const inViewOnly = useToolbarStore((s) => s.inViewOnly);
  const selectedHex = useSelectionStore((s) => s.selectedHex);
  const hiddenColumns = useListControls((s) => s.hiddenColumns);
  const toggleColumn = useListControls((s) => s.toggleColumn);
  const isHistory = usePlaybackStore((s) => s.mode) === 'history';
  const visibleColumns = LIST_COLUMNS.filter((c) => !hiddenColumns.has(c.id));
  const columnOptionsRef = useRef<HTMLDetailsElement>(null);

  const historyLabel = (col: ListColumn): string => {
    if (!isHistory) return col.label;
    if (col.id === 'speed') return 'Max. Spd. (kt)';
    if (col.id === 'distance') return 'Max. Dist. (nmi)';
    return col.label;
  };

  return (
    <aside
      data-testid="list-panel"
      className="glass absolute bottom-16 right-4 top-16 flex min-h-0 w-96 flex-col p-3 text-white"
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
          onChange={() => useToolbarStore.getState().toggle('inViewOnly')}
        />
        Only aircraft in view
      </label>

      <div className="mt-2">
        <details ref={columnOptionsRef}>
          <summary className="cursor-pointer text-xs text-slate-400 hover:text-white">
            Column options
          </summary>
          <div className="mt-1 flex flex-wrap gap-1">
            {LIST_COLUMNS.map((c) => {
              const checked = !hiddenColumns.has(c.id);
              const label = c.id === 'flag' ? 'Flag' : historyLabel(c);
              return (
                <label key={c.id} className="flex items-center gap-1 text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={checked}
                    aria-label={label}
                    onChange={() => toggleColumn(c.id)}
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </details>
        <button
          type="button"
          aria-label="Columns"
          className="sr-only"
          onClick={() => {
            if (columnOptionsRef.current)
              columnOptionsRef.current.open = !columnOptionsRef.current.open;
          }}
        >
          Columns
        </button>
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-auto">
        <table className="min-w-[640px] w-full text-[13px] table-fixed">
          <thead className="sticky top-0 z-10 bg-zinc-950">
            <tr className="border-b border-white/10 text-[12px] text-slate-400">
              {visibleColumns.map((c) => {
                const sortable = c.id !== 'flag';
                const isActive = sortKey === c.id;
                const align = c.align ?? 'left';
                return (
                  <th
                    key={c.id}
                    role="columnheader"
                    aria-sort={
                      isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={`px-1 py-1 font-normal ${align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        className="hover:text-white"
                        onClick={() => toggleSort(c.id as SortKey)}
                      >
                        {historyLabel(c)}
                        {isActive ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                      </button>
                    ) : (
                      <span>{c.id === 'flag' ? 'Flag' : historyLabel(c)}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const selected = r.hex === selectedHex;
              return (
                <tr
                  key={r.hex}
                  data-testid={`row-${r.hex}`}
                  onClick={() => onSelect(r.hex)}
                  className={`cursor-pointer hover:bg-white/10 ${rowBackground(r, selected)}`}
                >
                  {visibleColumns.map((c) => {
                    const align = c.align ?? 'left';
                    if (c.id === 'flag') {
                      return (
                        <td key={c.id} className="px-1 py-1">
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
                        </td>
                      );
                    }
                    const value = c.format(r);
                    return (
                      <td
                        key={c.id}
                        className={`px-1 py-1 truncate ${align === 'right' ? 'text-right' : 'text-left'}`}
                        {...(value ? { title: value } : {})}
                      >
                        {value || '—'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <div className="text-muted px-1 py-2 text-[13px]">No matching aircraft</div>
        ) : null}
      </div>
    </aside>
  );
}
