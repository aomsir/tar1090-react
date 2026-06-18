import {
  shapes,
  TypeDesignatorIcons,
  TypeDescriptionIcons,
  CategoryIcons,
} from './markerShapes.data';
import type { Shape, IconSpec } from './markerShapes.data';
import type { Aircraft } from '@/domain/Aircraft';
import type { RawAltitude } from '@/data/types';

/**
 * Port of tar1090 getBaseMarker: pick a marker shape + scale from aircraft
 * attributes. typeDescription/wtc come from the ICAO types DB (not wired yet),
 * so they are optional here and the function degrades to type code / category.
 */
export function getBaseMarker(
  category: string | null | undefined,
  typeDesignator: string | null | undefined,
  typeDescription: string | null | undefined,
  wtc: string | null | undefined,
  addrtype: string | null | undefined,
  altitude: RawAltitude | null | undefined,
): IconSpec {
  if (addrtype === 'ais') return ['ground_square', 0.7];

  if (typeDesignator && typeDesignator in TypeDesignatorIcons) {
    return TypeDesignatorIcons[typeDesignator];
  }

  if (typeDescription != null && typeDescription.length === 3) {
    if (typeDescription === 'L1P' && category === 'B4') return CategoryIcons['B4'];
    if (wtc != null && wtc.length === 1) {
      const withWtc = `${typeDescription}-${wtc}`;
      if (withWtc in TypeDescriptionIcons) return TypeDescriptionIcons[withWtc];
    }
    if (typeDescription in TypeDescriptionIcons) return TypeDescriptionIcons[typeDescription];
    const basicType = typeDescription.charAt(0);
    if (basicType in TypeDescriptionIcons) return [TypeDescriptionIcons[basicType][0], 1];
  }

  if (category && category in CategoryIcons) return CategoryIcons[category];

  if (
    altitude === 'ground' &&
    (addrtype === 'adsb_icao_nt' || addrtype === 'tisb_other' || addrtype === 'tisb_trackfile')
  ) {
    return ['ground_square', 1];
  }

  return ['unknown', 1];
}

/** Build the SVG markup for a shape (port of tar1090 svgShapeToSVG). */
export function svgShapeToSVG(
  shape: Shape,
  fillColor: string,
  strokeColor: string,
  strokeWidth: number,
  scale = 1,
): string {
  strokeWidth *= shape.strokeScale ?? 1;
  const wi = shape.w * scale;
  const he = shape.h * scale;

  if (!shape.path) {
    let svg = (shape.svg ?? '')
      .replace('fillColor', fillColor)
      .replace('strokeColor', strokeColor)
      .replace('strokeWidth', String(strokeWidth));
    svg = svg.replace('SIZE', `width="${wi}px" height="${he}px"`);
    return svg;
  }

  let svg =
    `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="${shape.viewBox}" ` +
    (shape.noAspect ? 'preserveAspectRatio="none" ' : '') +
    `width="${wi}" height="${he}">` +
    `<g${shape.transform ? ` transform="${shape.transform}"` : ''}>`;

  const paths = Array.isArray(shape.path) ? shape.path : [shape.path];
  for (const p of paths) {
    svg +=
      `<path paint-order="stroke" fill="${fillColor}" stroke="${strokeColor}" ` +
      `stroke-width="${2 * strokeWidth}" d="${p}"/>`;
  }

  const accentWidth = 0.6 * (shape.accentMult ? shape.accentMult * strokeWidth : strokeWidth);
  const accents = shape.accent ? (Array.isArray(shape.accent) ? shape.accent : [shape.accent]) : [];
  for (const a of accents) {
    svg += `<path fill="none" stroke="${strokeColor}" stroke-width="${accentWidth}" d="${a}"/>`;
  }

  svg += '</g></svg>';
  return svg;
}

export function svgShapeToDataUri(
  shape: Shape,
  fillColor: string,
  strokeColor: string,
  strokeWidth: number,
  scale = 1,
): string {
  const svg = svgShapeToSVG(shape, fillColor, strokeColor, strokeWidth, scale);
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export interface SelectedMarker {
  shape: Shape;
  scale: number;
}

/** Resolve the marker shape + scale for an aircraft, never undefined. */
export function selectMarker(ac: Aircraft): SelectedMarker {
  const [name, scale] = getBaseMarker(
    ac.category,
    ac.typeCode,
    undefined,
    undefined,
    undefined,
    ac.altitude ?? null,
  );
  return { shape: shapes[name] ?? shapes.unknown, scale };
}
