/** Runtime data-source base URL. Empty in dev (Vite proxy serves same-origin); override via VITE_API_BASE in prod. */
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? '';

/** Append ?_=<epoch_ms> to bust caches, matching original tar1090 behavior. */
export function withCacheBust(path: string): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}_=${Date.now()}`;
}

/** Join base + path. Empty base returns the path unchanged. Trailing slash on base is stripped. */
export function apiUrl(path: string, base: string = API_BASE): string {
  if (!base) return path;
  return `${base.replace(/\/$/, '')}${path}`;
}

/** Default Route API base URL (adsbdb). Override via VITE_ROUTE_API_URL. */
export const ROUTE_API_URL: string =
  import.meta.env.VITE_ROUTE_API_URL ?? 'https://api.adsbdb.com/v0/callsign';
