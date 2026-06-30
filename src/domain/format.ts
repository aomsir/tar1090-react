export type Altitude = number | 'ground' | null | undefined;

/**
 * Stable marker emitted by {@link formatAltitude} when the aircraft is on the
 * ground. Callers translate this constant via the `list.ground` / equivalent
 * i18n key so the domain helper stays free of translation dependencies while
 * the ground label still respects the active language.
 */
export const ALTITUDE_GROUND = 'Ground';

/** Format an aircraft barometric/geometric altitude for display. */
export function formatAltitude(alt: Altitude, language: string | undefined = undefined): string {
  if (alt === 'ground') return ALTITUDE_GROUND;
  if (alt == null) return '—';
  const locale = language?.startsWith('zh') ? 'zh-CN' : 'en-US';
  return `${alt.toLocaleString(locale)} ft`;
}
