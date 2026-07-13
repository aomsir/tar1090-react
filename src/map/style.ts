import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Text from 'ol/style/Text';
import { altitudeColor, hslString } from '@/domain/altitude';
import type { Aircraft } from '@/domain/Aircraft';
import { selectMarker, svgShapeToDataUri } from './markerShapes';
import type { LabelConfig } from './aircraftLayer';

export const MARKER_ZOOM_DIVIDE = 8.5;
export const MARKER_SMALL = 1;
export const MARKER_BIG = 1.18;
const BASE_ICON_SCALE = 1.25;
const SELECTED_SCALE = 1.1;

export function markerZoomScale(zoom = 0): number {
  return zoom < MARKER_ZOOM_DIVIDE ? MARKER_SMALL : MARKER_BIG;
}

export function aircraftFillColor(ac: Aircraft): string {
  return hslString(altitudeColor(ac.altitude ?? null));
}

export function aircraftRotationRad(ac: Aircraft): number {
  return ((ac.track ?? 0) * Math.PI) / 180;
}

/** Preserve the map marker label behavior independently from selected labels. */
function legacyMarkerLabel(ac: Aircraft): string {
  const flight = ac.flight?.trim();
  if (flight) return flight;
  if (ac.registration) return `reg: ${ac.registration}`;
  return `hex: ${ac.hex}`;
}

function legacyExtendedLabel(ac: Aircraft): string {
  const base = legacyMarkerLabel(ac);
  const parts = [base];
  if (ac.altitude != null) {
    parts.push(ac.altitude === 'ground' ? 'GND' : `${ac.altitude} ft`);
  }
  if (ac.speed != null) {
    parts.push(`${ac.speed} kt`);
  }
  return parts.join('\n');
}

function truncated(value: string): string {
  return value.length > 12 ? `${value.slice(0, 11)}…` : value;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function selectedAircraftLabel(ac: Aircraft): string {
  const callsign = ac.flight?.trim();
  const primary = callsign ? truncated(callsign) : `hex: ${ac.hex}`;
  const registration = ac.registration?.trim();
  const altitude =
    ac.altitude === 'ground'
      ? 'GND'
      : finiteNumber(ac.altitude)
        ? `${Math.round(ac.altitude).toLocaleString('en-US')} ft`
        : '—';
  const speed = finiteNumber(ac.speed) ? `${Math.round(ac.speed)} kt` : '—';
  const verticalRate = [ac.vertRate, ac.baroRate, ac.geomRate].find(finiteNumber);
  const verticalDirection =
    verticalRate == null || (verticalRate >= -128 && verticalRate <= 128)
      ? '→'
      : verticalRate > 128
        ? '↑'
        : '↓';
  const heading = finiteNumber(ac.track)
    ? `HDG ${String(((Math.round(ac.track) % 360) + 360) % 360).padStart(3, '0')}°`
    : 'HDG —';

  return `${primary} ${registration ? truncated(registration) : '—'}\n${altitude} ${speed} ${verticalDirection}\n${heading}`;
}

export function aircraftStyle(
  ac: Aircraft,
  selected: boolean,
  zoom = 0,
  labelConfig?: LabelConfig,
): Style {
  const { shape, scale } = selectMarker(ac);
  const fill = aircraftFillColor(ac);
  const stroke = selected ? '#ffffff' : '#000000';
  const src = svgShapeToDataUri(shape, fill, stroke, selected ? 1 : 0.75);
  const rotation = shape.noRotate ? 0 : aircraftRotationRad(ac);
  const markerScale =
    BASE_ICON_SCALE * markerZoomScale(zoom) * scale * (selected ? SELECTED_SCALE : 1);

  const labelText =
    labelConfig?.enabled === false
      ? ''
      : (labelConfig?.extended ?? 0) > 0
        ? legacyExtendedLabel(ac)
        : legacyMarkerLabel(ac);

  return new Style({
    image: new Icon({
      src,
      scale: markerScale,
      rotation,
      rotateWithView: true,
    }),
    text: new Text({
      text: labelText,
      font: 'bold 12px/14px Tahoma, Geneva, sans-serif',
      offsetY: -30 * markerScale,
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color: 'rgba(0,0,0,0.75)', width: 3 }),
    }),
  });
}
