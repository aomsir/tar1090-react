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
    this.isMlat = Array.isArray(dto.mlat) && dto.mlat.length > 0;
    this.lastUpdated = now;
  }

  hasPosition(): boolean {
    return typeof this.lat === 'number' && typeof this.lon === 'number';
  }
}
