import { describe, it, expect } from 'vitest';
import { Aircraft } from '@/domain/Aircraft';

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

  it('preserves tar1090 optional detail fields from DTO', () => {
    const ac = new Aircraft('abc123');
    ac.update(
      {
        hex: 'abc123',
        seen_pos: 3.2,
        baro_rate: -512,
        geom_rate: -384,
        nav_altitude_mcp: 32000,
        nav_altitude_fms: 34000,
        nav_altitude_src: 'MCP',
        nav_qnh: 1013.2,
        nav_heading: 270,
        mag_heading: 268,
        true_heading: 271,
        ias: 250,
        tas: 430,
        mach: 0.78,
        oat: -42,
        tat: -22,
        wd: 280,
        ws: 55,
        addrtype: 'adsb_icao',
        version: 2,
        emergency: 'none',
        dbFlags: 1,
      },
      100,
    );

    expect(ac.seenPos).toBe(3.2);
    expect(ac.baroRate).toBe(-512);
    expect(ac.geomRate).toBe(-384);
    expect(ac.navAltitudeMcp).toBe(32000);
    expect(ac.navAltitudeFms).toBe(34000);
    expect(ac.navAltitudeSrc).toBe('MCP');
    expect(ac.navQnh).toBe(1013.2);
    expect(ac.navHeading).toBe(270);
    expect(ac.magHeading).toBe(268);
    expect(ac.trueHeading).toBe(271);
    expect(ac.ias).toBe(250);
    expect(ac.tas).toBe(430);
    expect(ac.mach).toBe(0.78);
    expect(ac.oat).toBe(-42);
    expect(ac.tat).toBe(-22);
    expect(ac.windDirection).toBe(280);
    expect(ac.windSpeed).toBe(55);
    expect(ac.addrType).toBe('adsb_icao');
    expect(ac.version).toBe(2);
    expect(ac.emergency).toBe('none');
    expect(ac.rawDbFlags).toBe(1);
  });

  it('maps zero dbFlags to rawDbFlags 0, not undefined', () => {
    const ac = new Aircraft('abc123');
    ac.update({ hex: 'abc123', dbFlags: 0 }, 100);
    expect(ac.rawDbFlags).toBe(0);
  });

  it('maps original tar1090 type field into addrType', () => {
    const ac = new Aircraft('abc123');
    ac.update({ hex: 'abc123', type: 'adsb_icao' }, 100);
    expect(ac.addrType).toBe('adsb_icao');
  });

  it('treats mlat lat source as mlat even when type is absent', () => {
    const ac = new Aircraft('abc123');
    ac.update({ hex: 'abc123', mlat: ['lat'] }, 100);
    expect(ac.addrType).toBe('mlat');
  });

  it('falls back to adsb when positioned aircraft has no explicit source type', () => {
    const ac = new Aircraft('abc123');
    ac.update({ hex: 'abc123', lat: 31.2, lon: 121.5 }, 100);
    expect(ac.addrType).toBe('adsb');
  });
});
