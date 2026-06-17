import { altitudeColor, hslString } from '@/domain/altitude';

const TICKS: { alt: number | 'ground'; label: string }[] = [
  { alt: 'ground', label: 'Ground' },
  { alt: 5000, label: '5k' },
  { alt: 10000, label: '10k' },
  { alt: 20000, label: '20k' },
  { alt: 30000, label: '30k' },
  { alt: 40000, label: '40k' },
];

export function AltitudeLegend() {
  return (
    <div
      data-testid="altitude-legend"
      className="glass absolute bottom-16 left-1/2 flex -translate-x-1/2 items-center gap-3 px-3 py-1 text-[10px] text-white"
    >
      {TICKS.map((t) => (
        <span key={t.label} className="flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: hslString(altitudeColor(t.alt)) }}
          />
          {t.label}
        </span>
      ))}
    </div>
  );
}
