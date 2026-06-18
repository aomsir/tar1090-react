import type { AircraftDTO, RawAltitude } from '@/data/types';

export class Aircraft {
  readonly hex: string;
  flight?: string;
  lat?: number;
  lon?: number;
  altitude?: RawAltitude;
  track?: number;
  speed?: number;
  vertRate?: number;
  squawk?: string;
  category?: string;
  messages = 0;
  rssi?: number;
  seen = Infinity;
  seenPos?: number;
  baroRate?: number;
  geomRate?: number;
  navAltitudeMcp?: number;
  navAltitudeFms?: number;
  navAltitudeSrc?: string;
  navQnh?: number;
  navHeading?: number;
  magHeading?: number;
  trueHeading?: number;
  ias?: number;
  tas?: number;
  mach?: number;
  oat?: number;
  tat?: number;
  windDirection?: number;
  windSpeed?: number;
  addrType?: string;
  version?: number;
  emergency?: string;
  rawDbFlags?: number;
  isMlat = false;
  lastUpdated = 0;

  // --- enrichment (M2) ---
  registration?: string;
  typeCode?: string;
  typeLong?: string;
  dbFlags?: string;
  isMilitary = false;
  country?: string;
  flagPath?: string | null;
  enrichmentState: 'pending' | 'inflight' | 'done' = 'pending';

  constructor(hex: string) {
    this.hex = hex;
  }

  update(dto: AircraftDTO, now: number): void {
    const rawFlight = dto.flight ?? dto.callsign;
    if (rawFlight != null) {
      const flight = String(rawFlight).trim();
      this.flight = flight && flight !== '@@@@@@@@' ? flight : undefined;
    }
    if (dto.r != null) this.registration = String(dto.r);
    if (dto.t != null) this.typeCode = String(dto.t);
    if (dto.lat !== undefined) this.lat = dto.lat;
    if (dto.lon !== undefined) this.lon = dto.lon;
    if (dto.altitude !== undefined) this.altitude = dto.altitude;
    if (dto.track !== undefined) this.track = dto.track;
    if (dto.speed !== undefined) this.speed = dto.speed;
    if (dto.vert_rate !== undefined) this.vertRate = dto.vert_rate;
    if (dto.squawk !== undefined) this.squawk = dto.squawk;
    if (dto.category !== undefined) this.category = dto.category;
    if (dto.messages !== undefined) this.messages = dto.messages;
    if (dto.rssi !== undefined) this.rssi = dto.rssi;
    if (dto.seen !== undefined) this.seen = dto.seen;
    if (dto.seen_pos !== undefined) this.seenPos = dto.seen_pos;
    if (dto.baro_rate !== undefined) this.baroRate = dto.baro_rate;
    if (dto.geom_rate !== undefined) this.geomRate = dto.geom_rate;
    if (dto.nav_altitude_mcp !== undefined) this.navAltitudeMcp = dto.nav_altitude_mcp;
    if (dto.nav_altitude_fms !== undefined) this.navAltitudeFms = dto.nav_altitude_fms;
    if (dto.nav_altitude_src !== undefined) this.navAltitudeSrc = dto.nav_altitude_src;
    if (dto.nav_qnh !== undefined) this.navQnh = dto.nav_qnh;
    if (dto.nav_heading !== undefined) this.navHeading = dto.nav_heading;
    if (dto.mag_heading !== undefined) this.magHeading = dto.mag_heading;
    if (dto.true_heading !== undefined) this.trueHeading = dto.true_heading;
    if (dto.ias !== undefined) this.ias = dto.ias;
    if (dto.tas !== undefined) this.tas = dto.tas;
    if (dto.mach !== undefined) this.mach = dto.mach;
    if (dto.oat !== undefined) this.oat = dto.oat;
    if (dto.tat !== undefined) this.tat = dto.tat;
    if (dto.wd !== undefined) this.windDirection = dto.wd;
    if (dto.ws !== undefined) this.windSpeed = dto.ws;
    if (dto.addrtype !== undefined) this.addrType = dto.addrtype;
    if (dto.version !== undefined) this.version = dto.version;
    if (dto.emergency !== undefined) this.emergency = dto.emergency;
    if (dto.dbFlags !== undefined) this.rawDbFlags = dto.dbFlags;
    this.isMlat = Array.isArray(dto.mlat) && dto.mlat.length > 0;
    this.lastUpdated = now;
  }

  hasPosition(): boolean {
    return typeof this.lat === 'number' && typeof this.lon === 'number';
  }
}
