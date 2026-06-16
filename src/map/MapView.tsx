import { useEffect, useRef } from 'react';
import { MapController } from './MapController';

interface MapViewProps {
  onReady?: (controller: MapController) => void;
}

export function MapView({ onReady }: MapViewProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const controller = new MapController(ref.current);
    onReady?.(controller);
    return () => controller.dispose();
  }, [onReady]);

  return <div ref={ref} data-testid="map-root" className="absolute inset-0" />;
}
