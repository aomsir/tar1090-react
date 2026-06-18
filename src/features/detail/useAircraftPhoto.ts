import { useEffect, useRef, useState } from 'react';

export interface AircraftPhoto {
  thumbnailUrl: string;
  photographer: string;
  link: string;
}

interface CacheEntry {
  data: AircraftPhoto | null;
  ts: number;
}

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, CacheEntry>();

function buildUrl(hex: string, registration?: string, typeCode?: string): string {
  const upper = hex.toUpperCase();
  const params = new URLSearchParams();
  if (registration) params.set('reg', registration);
  if (typeCode) params.set('icaoType', typeCode);
  const qs = params.toString();
  return `https://api.planespotters.net/pub/photos/hex/${upper}${qs ? `?${qs}` : ''}`;
}

async function fetchPhoto(
  hex: string,
  registration?: string,
  typeCode?: string,
  signal?: AbortSignal,
): Promise<AircraftPhoto | null> {
  const key = hex.toUpperCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const url = buildUrl(hex, registration, typeCode);
  const res = await fetch(url, { signal });
  if (!res.ok) return null;

  const json = (await res.json()) as {
    photos?: {
      thumbnail?: { src?: string } | string;
      link?: string;
      photographer?: string;
    }[];
  };

  const photo = json.photos?.[0];
  if (!photo) {
    cache.set(key, { data: null, ts: Date.now() });
    return null;
  }

  const thumbSrc =
    typeof photo.thumbnail === 'string' ? photo.thumbnail : (photo.thumbnail?.src ?? '');

  if (!thumbSrc) {
    cache.set(key, { data: null, ts: Date.now() });
    return null;
  }

  const result: AircraftPhoto = {
    thumbnailUrl: thumbSrc,
    photographer: photo.photographer ?? '',
    link: photo.link ?? '',
  };
  cache.set(key, { data: result, ts: Date.now() });
  return result;
}

export function useAircraftPhoto(
  hex: string | null,
  registration?: string,
  typeCode?: string,
): { photo: AircraftPhoto | null; loading: boolean } {
  const [photo, setPhoto] = useState<AircraftPhoto | null>(null);
  const [loading, setLoading] = useState(false);
  const prevHexRef = useRef<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- async fetch with abort cleanup */
  useEffect(() => {
    if (!hex) {
      setPhoto(null);
      setLoading(false);
      prevHexRef.current = null;
      return;
    }

    // Only refetch when hex changes
    if (hex === prevHexRef.current) return;
    prevHexRef.current = hex;

    const controller = new AbortController();
    setLoading(true);

    fetchPhoto(hex, registration, typeCode, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setPhoto(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setPhoto(null);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [hex, registration, typeCode]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { photo, loading };
}
