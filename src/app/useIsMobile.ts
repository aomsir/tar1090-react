import { useSyncExternalStore } from 'react';

export const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

/** Non-reactive check, safe in environments without matchMedia (e.g. jsdom). */
export function isMobileViewport(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const mql = window.matchMedia(MOBILE_MEDIA_QUERY);
  mql.addEventListener('change', onStoreChange);
  return () => mql.removeEventListener('change', onStoreChange);
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, isMobileViewport);
}
