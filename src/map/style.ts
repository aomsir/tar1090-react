import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Text from 'ol/style/Text';
import { altitudeColor, hslString } from '@/domain/altitude';
import type { Aircraft } from '@/domain/Aircraft';
import { selectMarker, svgShapeToDataUri } from './markerShapes';

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
  const { shape, scale } = selectMarker(ac);
  const fill = aircraftFillColor(ac);
  const stroke = selected ? '#ffffff' : '#000000';
  const src = svgShapeToDataUri(shape, fill, stroke, selected ? 1 : 0.75);
  const rotation = shape.noRotate ? 0 : aircraftRotationRad(ac);

  return new Style({
    image: new Icon({
      src,
      scale: (selected ? 0.6 : 0.5) * scale,
      rotation,
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
