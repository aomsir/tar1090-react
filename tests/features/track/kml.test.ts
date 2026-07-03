import { describe, it, expect } from 'vitest';
import { buildTrackKml } from '@/features/track/kml';
import type { TrackPoint } from '@/features/track/track';

const pt = (over: Partial<TrackPoint>): TrackPoint => ({
  lon: 0,
  lat: 0,
  alt: 1000,
  ts: 0,
  ground: false,
  ...over,
});

describe('buildTrackKml', () => {
  it('produces a gx:Track with one when + coord per point and absolute altitude in metres', () => {
    const xml = buildTrackKml({ hex: 'abc', registration: 'n123' }, [
      pt({ lon: 2, lat: 1, ts: 0, alt: 1000 }),
      pt({ lon: 3, lat: 1, ts: 30, alt: 1000 }),
    ]);
    expect(xml).toContain('<gx:Track>');
    expect(xml).toContain('<altitudeMode>absolute</altitudeMode>');
    expect((xml.match(/<when>/g) ?? []).length).toBe(2);
    expect((xml.match(/<gx:coord>/g) ?? []).length).toBe(2);
    // 1000 ft -> 305 m (rounded)
    expect(xml).toContain('<gx:coord>2 1 305</gx:coord>');
    expect(xml).toContain('<name>N123</name>');
  });

  it('splits ground and airborne into separate placemarks; ground altitude is 0', () => {
    const xml = buildTrackKml({ hex: 'abc' }, [
      pt({ ts: 0, alt: 'ground', ground: true }),
      pt({ ts: 30, alt: 1000, ground: false, lon: 1 }),
    ]);
    expect((xml.match(/<Placemark>/g) ?? []).length).toBe(2);
    expect(xml).toContain('<gx:coord>0 0 0</gx:coord>');
  });
});
