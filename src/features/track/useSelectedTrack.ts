import { useEffect, useMemo, useState } from 'react';
import { aircraftStore } from '@/store/aircraftStore';
import { historyStore } from '@/store/historyStore';
import { useLiveTick } from '@/store/liveTick';
import { useSelectionStore } from '@/store/selectionStore';
import { usePlaybackStore } from '@/store/playbackStore';
import {
  extractTrackPoints,
  buildTrackSegments,
  type TrackPoint,
  type TrackSegment,
} from './track';

export function useSelectedTrack(): TrackSegment[] {
  const hex = useSelectionStore((s) => s.selectedHex);
  const version = useLiveTick((s) => s.version);
  const bounds = usePlaybackStore((s) => s.bounds);
  const [tailByHex, setTailByHex] = useState<Record<string, TrackPoint[]>>({});

  useEffect(() => {
    if (!hex) return;
    const ac = aircraftStore.map.get(hex);
    if (!ac || typeof ac.lon !== 'number' || typeof ac.lat !== 'number') return;
    const lon = ac.lon;
    const lat = ac.lat;
    // tail must accumulate across ticks; aircraftStore is non-reactive so we update state here.
    // Deps are bounded ([hex, version]) so this cannot loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTailByHex((prev) => {
      const prevPts = prev[hex] ?? [];
      const last = prevPts[prevPts.length - 1];
      if (last && last.lon === lon && last.lat === lat) return prev;
      const next: TrackPoint = {
        lon,
        lat,
        alt: ac.altitude,
        ts: ac.lastUpdated,
        track: ac.track,
        speed: ac.speed,
        ground: ac.altitude === 'ground',
      };
      return { ...prev, [hex]: [...prevPts, next] };
    });
  }, [hex, version]);

  return useMemo(() => {
    if (!hex) return [];
    const historyPts = bounds ? extractTrackPoints(historyStore.frames, hex) : [];
    const tailPts = tailByHex[hex] ?? [];
    const merged = [...historyPts, ...tailPts].sort((a, b) => a.ts - b.ts);
    return buildTrackSegments(merged);
  }, [hex, bounds, tailByHex]);
}
