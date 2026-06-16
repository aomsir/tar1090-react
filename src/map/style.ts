import Style from 'ol/style/Style';
import RegularShape from 'ol/style/RegularShape';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import { altitudeColor, hslString } from '@/domain/altitude';
import type { Aircraft } from '@/domain/Aircraft';

export function aircraftFillColor(ac: Aircraft): string {
  return hslString(altitudeColor(ac.altitude ?? null));
}

export function aircraftRotationRad(ac: Aircraft): number {
  return ((ac.track ?? 0) * Math.PI) / 180;
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
  });
}
