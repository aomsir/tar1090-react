import Style from 'ol/style/Style';
import RegularShape from 'ol/style/RegularShape';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Text from 'ol/style/Text';
import { altitudeColor, hslString } from '@/domain/altitude';
import type { Aircraft } from '@/domain/Aircraft';

export function aircraftFillColor(ac: Aircraft): string {
  return hslString(altitudeColor(ac.altitude ?? null));
}

export function aircraftRotationRad(ac: Aircraft): number {
  return ((ac.track ?? 0) * Math.PI) / 180;
}

/** Prefer callsign labels, then registration, then hex ID. */
export function markerLabel(ac: Aircraft): string {
  const flight = ac.flight?.trim();
  if (flight) return flight;
  if (ac.registration) return `reg: ${ac.registration}`;
  return `hex: ${ac.hex}`;
}

export function aircraftStyle(ac: Aircraft, selected: boolean): Style {
  return new Style({
    image: new RegularShape({
      points: 3,
      radius: selected ? 9 : 7,
      fill: new Fill({ color: aircraftFillColor(ac) }),
      stroke: new Stroke({
        color: selected ? '#ffffff' : 'rgba(0,0,0,0.45)',
        width: selected ? 2 : 1,
      }),
      rotation: aircraftRotationRad(ac),
      rotateWithView: true,
    }),
    text: new Text({
      text: markerLabel(ac),
      font: '11px system-ui, sans-serif',
      offsetY: selected ? -18 : -15,
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color: 'rgba(0,0,0,0.75)', width: 3 }),
    }),
  });
}
