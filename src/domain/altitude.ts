import type { RawAltitude } from '@/data/types';

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export const COLOR_BY_ALT = {
  unknown: { h: 0, s: 0, l: 20 },
  ground: { h: 220, s: 0, l: 30 },
  air: {
    h: [
      { alt: 0, val: 20 },
      { alt: 2000, val: 32.5 },
      { alt: 4000, val: 43 },
      { alt: 6000, val: 54 },
      { alt: 8000, val: 72 },
      { alt: 9000, val: 85 },
      { alt: 11000, val: 140 },
      { alt: 40000, val: 300 },
      { alt: 51000, val: 360 },
    ],
    s: 88,
    l: [
      { h: 0, val: 53 },
      { h: 20, val: 50 },
      { h: 32, val: 54 },
      { h: 40, val: 52 },
      { h: 46, val: 51 },
      { h: 50, val: 46 },
      { h: 60, val: 43 },
      { h: 80, val: 41 },
      { h: 100, val: 41 },
      { h: 120, val: 41 },
      { h: 140, val: 41 },
      { h: 160, val: 40 },
      { h: 180, val: 40 },
      { h: 190, val: 44 },
      { h: 198, val: 50 },
      { h: 200, val: 58 },
      { h: 220, val: 58 },
      { h: 240, val: 58 },
      { h: 255, val: 55 },
      { h: 266, val: 55 },
      { h: 270, val: 58 },
      { h: 280, val: 58 },
      { h: 290, val: 47 },
      { h: 300, val: 43 },
      { h: 310, val: 48 },
      { h: 320, val: 48 },
      { h: 340, val: 52 },
      { h: 360, val: 53 },
    ],
  },
} as const;

function interpolate(
  points: ReadonlyArray<{ readonly key: number; readonly val: number }>,
  x: number,
): number {
  let out = points[0].val;
  for (let i = points.length - 1; i >= 0; i--) {
    if (x > points[i].key) {
      if (i === points.length - 1) {
        out = points[i].val;
      } else {
        out =
          points[i].val +
          ((points[i + 1].val - points[i].val) * (x - points[i].key)) /
            (points[i + 1].key - points[i].key);
      }
      break;
    }
  }
  return out;
}

export function altitudeColor(altitude: RawAltitude | null | undefined): HSL {
  if (altitude == null) return { ...COLOR_BY_ALT.unknown };
  if (altitude === 'ground') return { ...COLOR_BY_ALT.ground };

  const round = altitude < 8000 ? 50 : 500;
  const alt = round * Math.round(altitude / round);

  const s = COLOR_BY_ALT.air.s;
  let h = interpolate(
    COLOR_BY_ALT.air.h.map((p) => ({ key: p.alt, val: p.val })),
    alt,
  );
  const l = interpolate(
    COLOR_BY_ALT.air.l.map((p) => ({ key: p.h, val: p.val })),
    h,
  );

  if (h < 0) h = (h % 360) + 360;
  else if (h >= 360) h = h % 360;

  return { h, s, l };
}

export function hslString({ h, s, l }: HSL): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}
