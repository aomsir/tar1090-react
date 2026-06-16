export type Altitude = number | 'ground' | null | undefined;

/** Format an aircraft barometric/geometric altitude for display. */
export function formatAltitude(alt: Altitude): string {
  if (alt === 'ground') return 'Ground';
  if (alt == null) return '—';
  return `${alt.toLocaleString('en-US')} ft`;
}
