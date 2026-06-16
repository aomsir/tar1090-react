import type { AircraftSnapshot, Receiver } from './types';

export type SnapshotHandler = (snapshot: AircraftSnapshot) => void;

/** Data source abstraction shared by polling and future streaming sources. */
export interface AircraftDataSource {
  getReceiver(): Promise<Receiver>;
  subscribe(handler: SnapshotHandler): () => void;
}
