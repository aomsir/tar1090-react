import { describe, it, expect } from 'vitest';
import { Aircraft } from './Aircraft';

describe('Aircraft', () => {
  it('applies fields from a DTO and trims the callsign', () => {
    const ac = new Aircraft('781860');
    ac.update(
      {
        hex: '781860',
        flight: 'CCA101 ',
        lat: 30.3,
        lon: 110.4,
        altitude: 30100,
        track: 262,
        speed: 420,
        vert_rate: -320,
        messages: 2147,
        rssi: -49.5,
        seen: 7,
      },
      1781629022,
    );
    expect(ac.flight).toBe('CCA101');
    expect(ac.lat).toBe(30.3);
    expect(ac.altitude).toBe(30100);
    expect(ac.vertRate).toBe(-320);
    expect(ac.lastUpdated).toBe(1781629022);
  });

  it('keeps previous values when a later DTO omits a field', () => {
    const ac = new Aircraft('a');
    ac.update({ hex: 'a', altitude: 1000 }, 1);
    ac.update({ hex: 'a', track: 90 }, 2);
    expect(ac.altitude).toBe(1000);
    expect(ac.track).toBe(90);
  });

  it('flags mlat when the mlat array is non-empty', () => {
    const ac = new Aircraft('a');
    ac.update({ hex: 'a', mlat: ['lat', 'lon'] }, 1);
    expect(ac.isMlat).toBe(true);
    ac.update({ hex: 'a', mlat: [] }, 2);
    expect(ac.isMlat).toBe(false);
  });

  it('hasPosition reflects presence of lat/lon', () => {
    const ac = new Aircraft('a');
    expect(ac.hasPosition()).toBe(false);
    ac.update({ hex: 'a', lat: 1, lon: 2 }, 1);
    expect(ac.hasPosition()).toBe(true);
  });

  it('maps callsign to flight when flight is absent', () => {
    const ac = new Aircraft('a');
    ac.update({ hex: 'a', callsign: 'DLH9 ' }, 1);
    expect(ac.flight).toBe('DLH9');
  });

  it('does not crash and keeps no flight when flight is null', () => {
    const ac = new Aircraft('a');
    ac.update({ hex: 'a', flight: null }, 1);
    expect(ac.flight).toBeUndefined();
  });

  it('treats @@@@@@@@ as no callsign', () => {
    const ac = new Aircraft('a');
    ac.update({ hex: 'a', flight: 'CCA1' }, 1);
    ac.update({ hex: 'a', flight: '@@@@@@@@' }, 2);
    expect(ac.flight).toBeUndefined();
  });

  it('reads registration and type code from r/t fields', () => {
    const ac = new Aircraft('a');
    ac.update({ hex: 'a', r: 'B-1234', t: 'A320' }, 1);
    expect(ac.registration).toBe('B-1234');
    expect(ac.typeCode).toBe('A320');
  });
});
