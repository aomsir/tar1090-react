/** Receiver/backend capability metadata. Refresh is measured in milliseconds. */
export interface Receiver {
  version: string;
  refresh: number;
  history: number;
  lat?: number;
  lon?: number;
}

/** Raw altitude from dump1090-style data. */
export type RawAltitude = number | 'ground';

/** Raw aircraft DTO in dump1090-mutability style. */
export interface AircraftDTO {
  hex: string;
  flight?: string | null;
  callsign?: string | null;
  r?: string | null;
  t?: string | null;
  lat?: number;
  lon?: number;
  altitude?: RawAltitude;
  track?: number;
  speed?: number;
  vert_rate?: number;
  squawk?: string;
  category?: string;
  messages?: number;
  seen?: number;
  seen_pos?: number;
  rssi?: number;
  nucp?: number;
  mlat?: string[];
  tisb?: string[];
}

/** aircraft.json top-level payload. now is an epoch timestamp in seconds. */
export interface AircraftSnapshot {
  now: number;
  messages: number;
  aircraft: AircraftDTO[];
}
