import { useEffect, useMemo, useRef } from 'react';
import { aircraftStore } from '@/store/aircraftStore';
import { historyStore } from '@/store/historyStore';
import { historyLoader } from '@/data/historyLoader';
import { useLiveTick } from '@/store/liveTick';
import { useSelectionStore } from '@/store/selectionStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { extractTrackPoints, buildTrackSegments, type TrackPoint, type TrackSegment } from './track';

export function useSelectedTrack(): TrackSegment[] {
  const hex = useSelectionStore((s) => s.selectedHex);
  const version = useLiveTick((s) => s.version);
  const bounds = usePlaybackStore((s) => s.bounds);
  const tailRef = useRef<{ hex: string | null; pts: TrackPoint[] }>({ hex: null, pts: [] });

  useEffect(() => {
    if (!hex) return;
    tailRef.current = { hex, pts: [] };
    let cancelled = false;
    void historyLoader
      .ensureLoaded((p) => usePlaybackStore.getState().setProgress(p.done, p.total))
      .then(() => {
        if (cancelled) return;
        const b = historyStore.timeBounds();
        if (b) usePlaybackStore.getState().setBounds(b);
        useLiveTick.getState().bump();
      });
    return () => {
      cancelled = true;
    };
  }, [hex]);

  return useMemo(() => {
    if (!hex) return [];
    if (tailRef.current.hex !== hex) tailRef.current = { hex, pts: [] };
    const ac = aircraftStore.map.get(hex);
    if (ac && typeof ac.lon === 'number' && typeof ac.lat === 'number') {
      const tail = tailRef.current.pts;
      const last = tail[tail.length - 1];
      if (!last || last.lon !== ac.lon || last.lat !== ac.lat) {
        tail.push({
          lon: ac.lon,
          lat: ac.lat,
          alt: ac.altitude,
          ts: ac.lastUpdated,
          track: ac.track,
          speed: ac.speed,
          ground: ac.altitude === 'ground',
        });
      }
    }
    const historyPts = bounds ? extractTrackPoints(historyStore.frames, hex) : [];
    const merged = [...historyPts, ...tailRef.current.pts].sort((a, b) => a.ts - b.ts);
    return buildTrackSegments(merged);
    // version + bounds drive recompute (history/live stores mutate in place)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex, version, bounds]);
}
