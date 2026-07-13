import { describe, it, expect } from 'vitest';
import {
  aircraftFillColor,
  aircraftRotationRad,
  aircraftStyle,
  markerZoomScale,
  MARKER_ZOOM_DIVIDE,
  MARKER_SMALL,
  MARKER_BIG,
  selectedAircraftLabel,
} from '@/map/style';
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

describe('selectedAircraftLabel', () => {
  function aircraft(values: Partial<Aircraft> = {}): Aircraft {
    return Object.assign(new Aircraft('abc123'), values);
  }

  it('formats exactly three lines with callsign, registration, altitude, speed, rate, and heading', () => {
    expect(
      selectedAircraftLabel(
        aircraft({
          flight: ' CCA101 ',
          registration: 'B-1234',
          altitude: 32000.4,
          speed: 449.6,
          vertRate: 129,
          track: 86.6,
        }),
      ),
    ).toBe('CCA101 B-1234\n32,000 ft 450 kt ↑\nHDG 087°');
  });

  it('falls back to hex and placeholders for missing data', () => {
    expect(selectedAircraftLabel(aircraft())).toBe('hex: abc123 —\n— — →\nHDG —');
  });

  it('does not truncate a hexadecimal fallback identifier', () => {
    expect(selectedAircraftLabel(new Aircraft('abcdef1234567890'))).toBe(
      'hex: abcdef1234567890 —\n— — →\nHDG —',
    );
  });

  it('truncates callsign and registration to twelve characters', () => {
    expect(
      selectedAircraftLabel(
        aircraft({ flight: 'ABCDEFGHIJKLM', registration: '1234567890123' }),
      ),
    ).toBe('ABCDEFGHIJK… 12345678901…\n— — →\nHDG —');
  });

  it('uses GND and treats rates inside the neutral range as level', () => {
    expect(
      selectedAircraftLabel(aircraft({ altitude: 'ground', speed: 120, vertRate: -128 })),
    ).toBe('hex: abc123 —\nGND 120 kt →\nHDG —');
  });

  it('falls back through barometric and geometric vertical rates', () => {
    expect(
      selectedAircraftLabel(aircraft({ vertRate: Number.NaN, baroRate: -129, geomRate: 129 })),
    ).toBe('hex: abc123 —\n— — ↓\nHDG —');
    expect(selectedAircraftLabel(aircraft({ geomRate: 129 }))).toBe('hex: abc123 —\n— — ↑\nHDG —');
  });

  it('uses the first finite vertical rate by priority', () => {
    expect(selectedAircraftLabel(aircraft({ vertRate: 129, baroRate: -129 }))).toBe(
      'hex: abc123 —\n— — ↑\nHDG —',
    );
    expect(selectedAircraftLabel(aircraft({ baroRate: -129, geomRate: 129 }))).toBe(
      'hex: abc123 —\n— — ↓\nHDG —',
    );
  });

  it('treats both vertical-rate bounds as level', () => {
    expect(selectedAircraftLabel(aircraft({ vertRate: 128 }))).toBe('hex: abc123 —\n— — →\nHDG —');
  });

  it('rounds and normalizes finite tracks', () => {
    expect(selectedAircraftLabel(aircraft({ track: -0.6 }))).toBe('hex: abc123 —\n— — →\nHDG 359°');
    expect(selectedAircraftLabel(aircraft({ track: 360 }))).toBe('hex: abc123 —\n— — →\nHDG 000°');
  });

  it('never exposes invalid numeric values or throws for partial aircraft data', () => {
    expect(() =>
      selectedAircraftLabel(
        aircraft({
          altitude: Number.POSITIVE_INFINITY as unknown as number,
          speed: Number.NaN,
          vertRate: Number.NEGATIVE_INFINITY,
          baroRate: Number.NaN,
          geomRate: Number.POSITIVE_INFINITY,
          track: Number.NaN,
        }),
      ),
    ).not.toThrow();
    expect(
      selectedAircraftLabel(
        aircraft({
          altitude: Number.POSITIVE_INFINITY as unknown as number,
          speed: Number.NaN,
          vertRate: Number.NEGATIVE_INFINITY,
          baroRate: Number.NaN,
          geomRate: Number.POSITIVE_INFINITY,
          track: Number.NaN,
        }),
      ),
    ).toBe('hex: abc123 —\n— — →\nHDG —');
  });
});

describe('aircraftStyle', () => {
  it('renders the marker label as style text', () => {
    const ac = new Aircraft('abc123');
    ac.update({ hex: 'abc123', flight: 'CCA101' }, 1);
    expect(
      aircraftStyle(ac, false, 0, { enabled: true, extended: 0, trackLabels: false })
        .getText()
        ?.getText(),
    ).toBe('CCA101');
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
    const small = aircraftStyle(ac, false, 8).getImage() as {
      getScale: () => number | [number, number];
    };
    const big = aircraftStyle(ac, false, 9).getImage() as {
      getScale: () => number | [number, number];
    };
    expect(big.getScale() as number).toBeGreaterThan(small.getScale() as number);
  });

  it('moves label offset with enlarged marker size', () => {
    const ac = new Aircraft('abc123');
    ac.update({ hex: 'abc123', flight: 'CCA101', t: 'A320' }, 1);
    const cfg = { enabled: true, extended: 0, trackLabels: false };
    const small = aircraftStyle(ac, false, 8, cfg).getText()?.getOffsetY();
    const big = aircraftStyle(ac, false, 9, cfg).getText()?.getOffsetY();
    expect(Math.abs(big ?? 0)).toBeGreaterThan(Math.abs(small ?? 0));
  });

  it('hides label when enableLabels is false', () => {
    const ac = new Aircraft('abc123');
    ac.update({ hex: 'abc123', flight: 'CCA101' }, 1);
    const style = aircraftStyle(ac, false, 0, { enabled: false, extended: 0, trackLabels: false });
    expect(style.getText()?.getText()).toBe('');
  });

  it('shows label when enableLabels is true', () => {
    const ac = new Aircraft('abc123');
    ac.update({ hex: 'abc123', flight: 'CCA101' }, 1);
    const style = aircraftStyle(ac, false, 0, { enabled: true, extended: 0, trackLabels: false });
    expect(style.getText()?.getText()).toBe('CCA101');
  });

  it('includes altitude and speed when extendedLabels > 0', () => {
    const ac = new Aircraft('abc123');
    ac.update({ hex: 'abc123', flight: 'CCA101', altitude: 32000, speed: 450 }, 1);
    const base = aircraftStyle(ac, false, 0, { enabled: true, extended: 0, trackLabels: false });
    const extended = aircraftStyle(ac, false, 0, {
      enabled: true,
      extended: 1,
      trackLabels: false,
    });
    expect(base.getText()?.getText()).toBe('CCA101');
    const extText = extended.getText()?.getText() as string;
    expect(extText).toContain('CCA101');
    expect(extText).not.toBe('CCA101');
    expect(extText).toContain('32000');
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
