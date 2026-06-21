import { useEffect, useMemo, useRef, useState } from 'react';
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
import { loadAircraftTrace, mergeTracePoints } from './aircraftTrace';
import { getHistorySeed, useSeedVersion } from '@/data/liveHistorySeeder';

export function useSelectedTrack(): TrackSegment[] {
  const hex = useSelectionStore((s) => s.selectedHex);
  const version = useLiveTick((s) => s.version);
  const mode = usePlaybackStore((s) => s.mode);
  const bounds = usePlaybackStore((s) => s.bounds);
  const [tailByHex, setTailByHex] = useState<Record<string, TrackPoint[]>>({});
  const [traceByHex, setTraceByHex] = useState<Record<string, TrackPoint[]>>({});
  const prevHexRef = useRef<string | null>(null);
  const loadedTraceHexesRef = useRef(new Set<string>());
  const loadingTraceHexesRef = useRef(new Set<string>());
  const seedVersion = useSeedVersion((s) => s.version);

  // When a new aircraft is selected, seed tail from its accumulated positionHistory
  // so the track renders immediately without waiting for polling ticks.
  useEffect(() => {
    if (!hex || hex === prevHexRef.current) return;
    prevHexRef.current = hex;
    const ac = aircraftStore.map.get(hex);
    if (!ac || ac.positionHistory.length === 0) return;
    const seed: TrackPoint[] = ac.positionHistory.map((r) => ({
      lon: r.lon,
      lat: r.lat,
      alt: r.alt,
      ts: r.ts,
      track: r.track,
      speed: r.speed,
      ground: r.ground,
    }));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTailByHex((prev) => ({ ...prev, [hex]: seed }));
  }, [hex]);

  useEffect(() => {
    if (!hex || mode !== 'live') return;
    if (loadedTraceHexesRef.current.has(hex) || loadingTraceHexesRef.current.has(hex)) return;

    let cancelled = false;
    loadingTraceHexesRef.current.add(hex);
    loadAircraftTrace(hex)
      .then((points) => {
        if (cancelled) return;
        loadedTraceHexesRef.current.add(hex);
        setTraceByHex((prev) => (prev[hex] ? prev : { ...prev, [hex]: points }));
      })
      .catch(() => {
        if (cancelled) return;
        loadedTraceHexesRef.current.add(hex);
        setTraceByHex((prev) => (prev[hex] ? prev : { ...prev, [hex]: [] }));
      })
      .finally(() => {
        loadingTraceHexesRef.current.delete(hex);
      });

    return () => {
      cancelled = true;
    };
  }, [hex, mode]);

  useEffect(() => {
    if (!hex) return;
    const ac = aircraftStore.map.get(hex);
    if (!ac) {
      // Aircraft pruned from store – clear cached track data so the trail disappears
      if (usePlaybackStore.getState().mode === 'live') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTailByHex((prev) => (hex in prev ? {} : prev));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTraceByHex((prev) => (hex in prev ? {} : prev));
        loadedTraceHexesRef.current.delete(hex);
      }
      return;
    }
    if (typeof ac.lon !== 'number' || typeof ac.lat !== 'number') return;
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
    const tracePts = traceByHex[hex];
    const basePts = mode === 'history'
      ? extractTrackPoints(historyStore.frames, hex)
      : (tracePts && tracePts.length > 0 ? tracePts : getHistorySeed(hex) ?? []);
    const tailPts = tailByHex[hex] ?? [];
    const merged = mergeTracePoints([...basePts, ...tailPts]);
    const gapThresholdSec = mode === 'history' && bounds ? historyStore.frameInterval() * 3 : undefined;
    return buildTrackSegments(merged, { gapThresholdSec });
    // seedVersion is intentionally in deps to re-evaluate when history seed becomes available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex, mode, bounds, traceByHex, tailByHex, seedVersion]);
}
