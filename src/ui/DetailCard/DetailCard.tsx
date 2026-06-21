import { Chip } from '@heroui/react';
import { X } from 'lucide-react';
import { useSelectedAircraft } from '@/features/detail/useSelectedAircraft';
import { useAircraftPhoto } from '@/features/detail/useAircraftPhoto';
import { useSelectionStore } from '@/store/selectionStore';
import { extractTrackPoints } from '@/features/track/track';
import { buildTrackKml } from '@/features/track/kml';
import { historyStore } from '@/store/historyStore';
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
  const { photo, loading: photoLoading } = useAircraftPhoto(
    d?.hex ?? null,
    d?.registration,
    d?.typeCode,
  );
  if (!d) return null;

  const handleExportKml = () => {
    if (!d) return;
    const points = extractTrackPoints(historyStore.frames, d.hex);
    const xml = buildTrackKml({ hex: d.hex, registration: d.registration }, points);
    const blob = new Blob([xml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${d.registration || d.hex}-track.kml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const flagSrc = d.flagPath ?? null;

  return (
    <section
      data-testid="detail-card"
      className="glass absolute bottom-16 left-4 top-16 flex w-64 flex-col p-3 text-white"
    >
      <div className="flex items-start gap-2.5">
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            {flagSrc ? <img src={flagSrc} alt={d.country} className="h-4 w-6 rounded-sm" /> : null}
            <span className="text-lg font-bold tracking-wide">{d.flight || d.hex}</span>
          </div>
          <div data-testid="detail-subtitle" className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            {d.registration ? <span className="font-mono text-slate-300">{d.registration}</span> : null}
            {d.registration && d.typeCode ? <span className="text-slate-600">·</span> : null}
            {d.typeCode ? <span>{d.typeCode}</span> : null}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {d.isMilitary ? (
              <Chip color="danger" size="sm" variant="bordered">Military</Chip>
            ) : null}
            {d.isMlat ? (
              <Chip color="warning" size="sm" variant="bordered">MLAT</Chip>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          aria-label="Close details"
          onClick={() => select(null)}
          className="rounded-md border border-white/10 bg-white/5 p-1 hover:bg-white/10"
        >
          <X size={14} />
        </button>
      </div>

      {photoLoading ? (
        <div className="mt-2 flex h-24 items-center justify-center text-xs text-slate-400">
          Loading image...
        </div>
      ) : photo ? (
        <a href={photo.link} target="_blank" rel="noopener noreferrer" className="mt-2 block">
          <img
            src={photo.thumbnailUrl}
            alt={d.registration || d.hex}
            className="w-full rounded object-cover"
          />
          {photo.photographer ? (
            <span className="mt-0.5 block text-right text-[10px] text-slate-500">
              &copy; {photo.photographer}
            </span>
          ) : null}
        </a>
      ) : null}

      <div data-testid="key-stats" className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-white/5 p-2 text-center">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Altitude</div>
          <div className="mt-0.5 font-mono text-[17px] font-bold text-slate-50">
            {d.altitude != null ? formatAltitude(d.altitude).replace(' ft', '') : '—'}
          </div>
          <div className="text-[10px] text-slate-500">ft</div>
        </div>
        <div className="rounded-lg bg-white/5 p-2 text-center">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Speed</div>
          <div className="mt-0.5 font-mono text-[17px] font-bold text-slate-50">
            {typeof d.speed === 'number' && Number.isFinite(d.speed) ? Math.round(d.speed) : '—'}
          </div>
          <div className="text-[10px] text-slate-500">kt</div>
        </div>
        <div className="rounded-lg bg-white/5 p-2 text-center">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Track</div>
          <div className="mt-0.5 font-mono text-[17px] font-bold text-slate-50">
            {typeof d.track === 'number' && Number.isFinite(d.track) ? `${Math.round(d.track)}°` : '—'}
          </div>
          <div className="text-[10px] text-slate-500"></div>
        </div>
      </div>

      <div className="mt-2 flex-1 overflow-y-auto border-t border-white/10 pt-2">
        {d.groups.map((group) => (
          <section key={group.title} className="mb-3">
            <h3 className="mb-1 border-b border-white/10 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
              {group.title}
            </h3>
            {group.rows.map((row) => (
              <Field key={`${group.title}-${row.label}`} label={row.label} value={row.value} />
            ))}
          </section>
        ))}
      </div>

      <button
        type="button"
        onClick={handleExportKml}
        className="mt-2 rounded bg-white/10 py-1 text-xs hover:bg-white/20"
      >
        Export KML
      </button>
    </section>
  );
}
