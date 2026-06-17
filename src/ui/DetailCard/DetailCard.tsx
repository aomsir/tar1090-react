import { Chip } from '@heroui/react';
import { X } from 'lucide-react';
import { useSelectedAircraft } from '@/features/detail/useSelectedAircraft';
import { useSelectionStore } from '@/store/selectionStore';
import { formatAltitude } from '@/domain/format';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 py-0.5 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-100">{value}</span>
    </div>
  );
}

export function DetailCard() {
  const d = useSelectedAircraft();
  const select = useSelectionStore((s) => s.select);
  if (!d) return null;

  const flagSrc = d.flagPath ? `/${d.flagPath}` : null;

  return (
    <section
      data-testid="detail-card"
      className="glass absolute bottom-16 left-4 top-16 flex w-64 flex-col p-3 text-white"
    >
      <div className="flex items-center gap-2">
        {flagSrc ? <img src={flagSrc} alt={d.country} className="h-4 w-6 rounded-sm" /> : null}
        <span className="text-base font-semibold">{d.flight || d.hex}</span>
        <button
          type="button"
          aria-label="Close details"
          onClick={() => select(null)}
          className="ml-auto rounded p-1 hover:bg-white/10"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-1 flex flex-wrap gap-1">
        {d.isMilitary ? (
          <Chip color="danger" size="sm">
            Military
          </Chip>
        ) : null}
        {d.isMlat ? (
          <Chip color="warning" size="sm">
            MLAT
          </Chip>
        ) : null}
      </div>

      <div className="mt-2 border-t border-white/10 pt-2">
        <Field label="ICAO" value={d.hex} />
        <Field label="Export track KML" value={d.registration || '—'} />
        <Field
          label="Export track KML"
          value={d.typeCode ? `${d.typeCode}${d.typeLong ? ` · ${d.typeLong}` : ''}` : '—'}
        />
        <Field label="Export track KML" value={d.country || '—'} />
        <Field label="Export track KML" value={formatAltitude(d.altitude)} />
        <Field label="Export track KML" value={typeof d.speed === 'number' ? `${Math.round(d.speed)} kt` : '—'} />
        <Field label="Export track KML" value={typeof d.track === 'number' ? `${Math.round(d.track)}°` : '—'} />
        <Field
          label="Export track KML"
          value={typeof d.vertRate === 'number' ? `${d.vertRate} ft/min` : '—'}
        />
        <Field label="Export track KML" value={d.squawk || '—'} />
        <Field label="Export track KML" value={d.messages.toLocaleString('en-US')} />
        <Field label="Export track KML" value={`${d.seen.toFixed(1)} s`} />
      </div>
    </section>
  );
}
