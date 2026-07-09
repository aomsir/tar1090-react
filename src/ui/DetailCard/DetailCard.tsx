import { useCallback, useEffect, useRef } from 'react';
import { Chip } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useSelectedAircraft } from '@/features/detail/useSelectedAircraft';
import { useAircraftPhoto } from '@/features/detail/useAircraftPhoto';
import { useSelectionStore } from '@/store/selectionStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { extractTrackPoints } from '@/features/track/track';
import { buildTrackKml } from '@/features/track/kml';
import { historyStore } from '@/store/historyStore';
import { formatAltitude } from '@/domain/format';
import { formatDistanceNm } from '@/domain/units';
import { formatPassTimeRange } from '@/i18n/format';

const COLOR_MAP: Record<string, { bar: string; text: string }> = {
  indigo: { bar: 'bg-indigo-400', text: 'text-indigo-300' },
  emerald: { bar: 'bg-emerald-400', text: 'text-emerald-300' },
  sky: { bar: 'bg-sky-400', text: 'text-sky-300' },
  amber: { bar: 'bg-amber-400', text: 'text-amber-300' },
  teal: { bar: 'bg-teal-400', text: 'text-teal-300' },
  slate: { bar: 'bg-slate-400', text: 'text-slate-300' },
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 py-[3px] text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono text-slate-300">{value}</span>
    </div>
  );
}

export function DetailCard() {
  const { t, i18n } = useTranslation();
  const d = useSelectedAircraft();
  const select = useSelectionStore((s) => s.select);
  const { photo, loading: photoLoading } = useAircraftPhoto(
    d?.hex ?? null,
    d?.registration,
    d?.typeCode,
  );
  const detailWidth = useToolbarStore((s) => s.detailWidth);
  const setDetailWidth = useToolbarStore((s) => s.setDetailWidth);
  const isDragging = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      const startX = e.clientX;
      const startWidth = detailWidth;

      const onMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = ev.clientX - startX;
        setDetailWidth(startWidth + delta);
      };

      const onMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        cleanupRef.current = null;
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      cleanupRef.current = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
    },
    [detailWidth, setDetailWidth],
  );

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  if (!d) return null;

  const handleExportKml = () => {
    if (!d) return;
    const points = d.passId
      ? (historyStore.getPass(d.passId)?.trackPoints ?? [])
      : extractTrackPoints(historyStore.frames, d.hex);
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
      className="glass absolute bottom-16 left-4 top-16 flex flex-col p-3 text-white"
      style={{ width: `${detailWidth}px` }}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            {flagSrc ? <img src={flagSrc} alt={d.country} className="h-4 w-6 rounded-sm" /> : null}
            <span className="text-lg font-bold tracking-wide">{d.flight || d.hex}</span>
          </div>
           <div
            data-testid="detail-subtitle"
            className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"
          >
            {d.registration ? (
              <span className="font-mono text-slate-300">{d.registration}</span>
            ) : null}
            {d.registration && d.typeCode ? <span className="text-slate-600">·</span> : null}
             {d.typeCode ? <span>{d.typeCode}</span> : null}
           </div>
           {d.passId && d.passStartTime != null && d.passEndTime != null ? (
             <div className="mt-1 text-xs text-slate-400">
               {formatPassTimeRange(d.passStartTime, d.passEndTime, i18n.language)}
             </div>
           ) : null}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {d.isMilitary ? (
              <Chip color="danger" size="sm" variant="secondary">
                {t('detail.military')}
              </Chip>
            ) : null}
            {d.isMlat ? (
              <Chip color="warning" size="sm" variant="secondary">
                MLAT
              </Chip>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          aria-label={t('detail.close')}
          onClick={() => select(null)}
          className="rounded-md border border-white/10 bg-white/5 p-1 hover:bg-white/10"
        >
          <X size={14} />
        </button>
      </div>

      {photoLoading ? (
        <div className="mt-2 flex h-24 items-center justify-center text-xs text-slate-400">
          {t('detail.loadingImage')}
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
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
             {t(d.passId ? 'detail.stats.maxAltitude' : 'detail.stats.altitude')}
          </div>
          <div className="mt-0.5 font-mono text-[17px] font-bold text-slate-50">
            {(() => {
              if (d.altitude == null) return '—';
              if (d.altitude === 'ground') return t('list.ground');
              return formatAltitude(d.altitude, i18n.language).replace(' ft', '');
            })()}
          </div>
          <div className="text-[10px] text-slate-500">ft</div>
        </div>
        <div className="rounded-lg bg-white/5 p-2 text-center">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
             {t(d.passId ? 'detail.stats.maxSpeed' : 'detail.stats.speed')}
          </div>
          <div className="mt-0.5 font-mono text-[17px] font-bold text-slate-50">
            {typeof d.speed === 'number' && Number.isFinite(d.speed) ? Math.round(d.speed) : '—'}
          </div>
          <div className="text-[10px] text-slate-500">kt</div>
        </div>
        <div className="rounded-lg bg-white/5 p-2 text-center">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
             {t(d.passId ? 'detail.stats.maxDistance' : 'detail.stats.track')}
          </div>
          <div className="mt-0.5 font-mono text-[17px] font-bold text-slate-50">
             {d.passId
               ? formatDistanceNm(d.maxDistance) || '—'
               : typeof d.track === 'number' && Number.isFinite(d.track)
                 ? `${Math.round(d.track)}°`
                 : '—'}
           </div>
           <div className="text-[10px] text-slate-500">{d.passId ? 'nmi' : ''}</div>
        </div>
      </div>

      <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
        {d.groups.map((group) => {
          const colors = COLOR_MAP[group.color] ?? COLOR_MAP.slate;
          return (
            <section
              key={group.title}
              data-testid={`group-${group.color}`}
              className="rounded-lg border border-white/[0.06] bg-white/[0.04] p-2.5"
            >
              <div className="mb-2 flex items-center gap-1.5">
                <div data-testid="group-bar" className={`h-3 w-[3px] rounded-sm ${colors.bar}`} />
                <h3 className={`text-[11px] font-semibold uppercase tracking-wide ${colors.text}`}>
                  {group.title}
                </h3>
              </div>
              {group.rows.map((row) => (
                <Field key={`${group.title}-${row.label}`} label={row.label} value={row.value} />
              ))}
            </section>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleExportKml}
        className="mt-3 w-full rounded-lg border border-indigo-500/25 bg-indigo-500/12 py-2 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20"
      >
        {t('detail.exportKml')}
      </button>
      <div
        data-testid="resize-handle"
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize flex items-center justify-center group"
      >
        <div className="h-8 w-1 rounded-full bg-white/20 group-hover:bg-white/50 transition-opacity" />
      </div>
    </section>
  );
}
