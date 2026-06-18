import { describe, it, expect } from 'vitest';
import {
  aircraftFillColor,
  aircraftRotationRad,
  aircraftStyle,
  markerLabel,
  markerZoomScale,
  MARKER_ZOOM_DIVIDE,
  MARKER_SMALL,
  MARKER_BIG,
} from './style';
import { Aircraft } from '@/domain/Aircraft';

describe('map style helpers', () => {
  it('derives fill color from altitude', () => {
    const ac = new Aircraft('a');
    ac.update({ hex: 'a', altitude: 2000 }, 1);
    expect(aircraftFillColor(ac)).toBe('hsl(32.5, 88%, 53.875%)');
  });

  it('uses the unknown color when altitude is missing', () => {
    const ac = new Aircraft('a');
    expect(aircraftFillColor(ac)).toBe('hsl(0, 0%, 20%)');
  });

  it('converts track degrees to radians', () => {
    const ac = new Aircraft('a');
    ac.update({ hex: 'a', track: 180 }, 1);
    expect(aircraftRotationRad(ac)).toBeCloseTo(Math.PI, 6);
  });

  it('defaults rotation to 0 when track is missing', () => {
    expect(aircraftRotationRad(new Aircraft('a'))).toBe(0);
  });
});

describe('markerLabel', () => {
  it('uses the trimmed flight when present', () => {
    const ac = new Aircraft('abc123');
    ac.update({ hex: 'abc123', flight: 'CCA101 ' }, 1);
    expect(markerLabel(ac)).toBe('CCA101');
  });

  it('falls back to "reg: <registration>" when no flight', () => {
    const ac = new Aircraft('abc123');
    ac.registration = 'B-1234';
    expect(markerLabel(ac)).toBe('reg: B-1234');
  });

  it('falls back to "hex: <hex>" when no flight or registration', () => {
    const ac = new Aircraft('abc123');
    expect(markerLabel(ac)).toBe('hex: abc123');
  });
});

describe('aircraftStyle', () => {
  it('renders the marker label as style text', () => {
    const ac = new Aircraft('abc123');
    ac.update({ hex: 'abc123', flight: 'CCA101' }, 1);
    expect(aircraftStyle(ac, false).getText()?.getText()).toBe('CCA101');
  });

  it('uses an svg icon image instead of a triangle', () => {
    const ac = new Aircraft('abc123');
    ac.update({ hex: 'abc123', t: 'A320', track: 90 }, 1);
    const src = (aircraftStyle(ac, false).getImage() as { getSrc?: () => string }).getSrc?.();
    expect(src?.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('rotates the icon by track for normal shapes', () => {
    const ac = new Aircraft('abc123');
    ac.update({ hex: 'abc123', t: 'A320', track: 180 }, 1);
    const rot = (
      aircraftStyle(ac, false).getImage() as { getRotation: () => number }
    ).getRotation();
    expect(rot).toBeCloseTo(Math.PI, 6);
  });

  it('does not rotate no-rotate shapes (e.g. balloon)', () => {
    const ac = new Aircraft('abc123');
    ac.update({ hex: 'abc123', category: 'B2', track: 180 }, 1);
    const rot = (
      aircraftStyle(ac, false).getImage() as { getRotation: () => number }
    ).getRotation();
    expect(rot).toBe(0);
  });

  it('uses original tar1090 marker size threshold', () => {
    const ac = new Aircraft('abc123');
    ac.update({ hex: 'abc123', t: 'A320' }, 1);
    const small = aircraftStyle(ac, false, 8).getImage() as { getScale: () => number | [number, number] };
    const big = aircraftStyle(ac, false, 9).getImage() as { getScale: () => number | [number, number] };
    expect(big.getScale() as number).toBeGreaterThan(small.getScale() as number);
  });

  it('moves label offset with enlarged marker size', () => {
    const ac = new Aircraft('abc123');
    ac.update({ hex: 'abc123', flight: 'CCA101', t: 'A320' }, 1);
    const small = aircraftStyle(ac, false, 8).getText()?.getOffsetY();
    const big = aircraftStyle(ac, false, 9).getText()?.getOffsetY();
    expect(Math.abs(big ?? 0)).toBeGreaterThan(Math.abs(small ?? 0));
  });
});

describe('markerZoomScale', () => {
  it('returns MARKER_SMALL when zoom < threshold', () => {
    expect(markerZoomScale(8)).toBe(MARKER_SMALL);
  });

  it('returns MARKER_BIG when zoom >= threshold', () => {
    expect(markerZoomScale(9)).toBe(MARKER_BIG);
  });

  it('uses 8.5 as the divide threshold', () => {
    expect(MARKER_ZOOM_DIVIDE).toBe(8.5);
  });
});
