import { useTranslation } from 'react-i18next';
import { Chip } from '@heroui/react';
import { useAircraftRows } from '@/features/list/useAircraftRows';
import { altitudeColor, hslString } from '@/domain/altitude';
import { formatAltitude } from '@/domain/format';
import type { AircraftRow } from '@/features/list/aircraftRows';

function formatSpeed(speed: AircraftRow['speed']): string {
  return typeof speed === 'number' ? `${speed} kt` : '—';
}

export function MobileAircraftList({ onSelect }: { onSelect: (hex: string) => void }) {
  const { t } = useTranslation();
  const rows = useAircraftRows();

  if (rows.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label={t('commandBar.aircraftList')}
      data-testid="mobile-aircraft-list"
      className="glass absolute left-0 right-0 top-11 max-h-[45dvh] divide-y divide-white/5 overflow-auto rounded-lg text-white shadow-xl"
    >
      {rows.map((row) => {
        const label = row.flight || row.hex;
        const identityParts = [row.registration, row.typeCode].filter(Boolean);
        const secondary = identityParts.length > 0 ? identityParts.join(' · ') : row.hex;
        return (
          <button
            key={row.hex}
            type="button"
            role="option"
            className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left active:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(row.hex)}
          >
            {row.flagPath ? (
              <img
                src={row.flagPath}
                alt={row.country || 'Aircraft'}
                className="h-4 w-6 shrink-0 rounded-sm"
              />
            ) : (
              <span
                data-testid="mobile-aircraft-altitude-dot"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: hslString(altitudeColor(row.altitude)) }}
              />
            )}
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1">
                <span className="min-w-0 truncate text-sm font-semibold">{label}</span>
                {row.isMilitary ? (
                  <Chip size="sm" color="danger" variant="soft" className="shrink-0 scale-75">
                    MIL
                  </Chip>
                ) : null}
              </span>
              {secondary !== label && (
                <span className="block truncate font-mono text-[11px] text-slate-400">
                  {secondary}
                </span>
              )}
            </span>
            <span className="shrink-0 text-right font-mono text-[11px] text-slate-300">
              <span className="block">{formatAltitude(row.altitude)}</span>
              <span className="block text-slate-500">{formatSpeed(row.speed)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
