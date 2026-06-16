import { useEffect, useRef } from 'react';
import { MapController } from './MapController';

interface MapViewProps {
  onReady?: (controller: MapController) => void;
}

export function MapView({ onReady }: MapViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    if (!ref.current) return;
    const controller = new MapController(ref.current);
    onReadyRef.current?.(controller);
    return () => controller.dispose();
  }, []);

  return <div ref={ref} data-testid="map-root" className="absolute inset-0" />;
}
