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
  baro_rate?: number;
  geom_rate?: number;
  nav_altitude_mcp?: number;
  nav_altitude_fms?: number;
  nav_altitude_src?: string;
  nav_qnh?: number;
  nav_heading?: number;
  mag_heading?: number;
  true_heading?: number;
  ias?: number;
  tas?: number;
  mach?: number;
  oat?: number;
  tat?: number;
  wd?: number;
  ws?: number;
  type?: string | null;
  addrtype?: string;
  version?: number;
  emergency?: string;
  dbFlags?: number;
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
