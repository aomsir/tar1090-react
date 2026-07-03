import { useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import { Chip } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useSelectedAircraft } from '@/features/detail/useSelectedAircraft';
import { useAircraftPhoto } from '@/features/detail/useAircraftPhoto';
import { useSelectionStore } from '@/store/selectionStore';
import { extractTrackPoints } from '@/features/track/track';
import { buildTrackKml } from '@/features/track/kml';
import { historyStore } from '@/store/historyStore';
import { formatAltitude } from '@/domain/format';

const SNAP_PEEK = '272px';
const SNAP_EXPANDED = 0.85;
const SNAP_POINTS: (number | string)[] = [SNAP_PEEK, SNAP_EXPANDED];

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

export function MobileDetailSheet() {
  const { t, i18n } = useTranslation();
  const d = useSelectedAircraft();
  const select = useSelectionStore((s) => s.select);
  const [snap, setSnap] = useState<number | string | null>(SNAP_PEEK);
  const { photo, loading: photoLoading } = useAircraftPhoto(
    d?.hex ?? null,
    d?.registration,
    d?.typeCode,
  );

  const hex = d?.hex ?? null;
  /* eslint-disable react-hooks/set-state-in-effect -- reset to peek when selected aircraft changes */
  useEffect(() => {
    setSnap(SNAP_PEEK);
  }, [hex]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!d) return null;

  const handleExportKml = () => {
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
  const isExpanded = snap === SNAP_EXPANDED;

  return (
    <Drawer.Root
      open
      onOpenChange={(open) => {
        if (!open) select(null);
      }}
      modal={false}
      snapPoints={SNAP_POINTS}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
    >
      <Drawer.Portal>
        <Drawer.Content
          data-testid="mobile-detail-sheet"
          data-snap={isExpanded ? 'expanded' : 'peek'}
          aria-describedby={undefined}
          className="glass fixed inset-x-0 bottom-0 z-20 flex h-full flex-col rounded-b-none text-white outline-none"
        >
          <div className="flex h-[85%] flex-col pb-[env(safe-area-inset-bottom)]">
            <div data-testid="sheet-drag-handle" className="flex shrink-0 justify-center py-2">
              <div className="h-1 w-9 rounded-full bg-white/30" />
            </div>

            <div
              data-testid="sheet-scroll-area"
              className={`min-h-0 flex-1 px-3 pb-3 ${
                isExpanded ? 'overflow-y-auto' : 'overflow-hidden'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    {flagSrc ? (
                      <img src={flagSrc} alt={d.country} className="h-4 w-6 rounded-sm" />
                    ) : null}
                    <Drawer.Title className="text-lg font-bold tracking-wide">
                      {d.flight || d.hex}
                    </Drawer.Title>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                    {d.registration ? (
                      <span className="font-mono text-slate-300">{d.registration}</span>
                    ) : null}
                    {d.registration && d.typeCode ? <span className="text-slate-600">·</span> : null}
                    {d.typeCode ? <span>{d.typeCode}</span> : null}
                  </div>
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
                  className="rounded-md border border-white/10 bg-white/5 p-2 hover:bg-white/10"
                >
                  <X size={16} />
                </button>
              </div>

              <div data-testid="key-stats" className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-white/5 p-2 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">
                    {t('detail.stats.altitude')}
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
                    {t('detail.stats.speed')}
                  </div>
                  <div className="mt-0.5 font-mono text-[17px] font-bold text-slate-50">
                    {typeof d.speed === 'number' && Number.isFinite(d.speed)
                      ? Math.round(d.speed)
                      : '—'}
                  </div>
                  <div className="text-[10px] text-slate-500">kt</div>
                </div>
                <div className="rounded-lg bg-white/5 p-2 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">
                    {t('detail.stats.track')}
                  </div>
                  <div className="mt-0.5 font-mono text-[17px] font-bold text-slate-50">
                    {typeof d.track === 'number' && Number.isFinite(d.track)
                      ? `${Math.round(d.track)}°`
                      : '—'}
                  </div>
                  <div className="text-[10px] text-slate-500"></div>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {photoLoading ? (
                  <div className="flex h-24 items-center justify-center text-xs text-slate-400">
                    {t('detail.loadingImage')}
                  </div>
                ) : photo ? (
                  <a href={photo.link} target="_blank" rel="noopener noreferrer" className="block">
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

                {d.groups.map((group) => {
                  const colors = COLOR_MAP[group.color] ?? COLOR_MAP.slate;
                  return (
                    <section
                      key={group.title}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.04] p-2.5"
                    >
                      <div className="mb-2 flex items-center gap-1.5">
                        <div className={`h-3 w-[3px] rounded-sm ${colors.bar}`} />
                        <h3
                          className={`text-[11px] font-semibold uppercase tracking-wide ${colors.text}`}
                        >
                          {group.title}
                        </h3>
                      </div>
                      {group.rows.map((row) => (
                        <Field key={`${group.title}-${row.label}`} label={row.label} value={row.value} />
                      ))}
                    </section>
                  );
                })}

                <button
                  type="button"
                  onClick={handleExportKml}
                  className="w-full rounded-lg border border-indigo-500/25 bg-indigo-500/12 py-2 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20"
                >
                  {t('detail.exportKml')}
                </button>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
