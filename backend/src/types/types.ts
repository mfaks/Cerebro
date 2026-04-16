export interface Asset {
  id: string;
  name: string;
  type: 'PAYLOAD' | 'DEBRIS' | 'ROCKET_BODY';
  position: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  velocity: {
    speed: number;
    inclination: number;
  };
  status: 'ACTIVE' | 'INACTIVE' | 'UNTRACKED';
  lastUpdated: string;
  metadata: {
    country: string | null;
    launchDate: string | null;
    rcsSize: 'SMALL' | 'MEDIUM' | 'LARGE' | null;
  };
}

export interface TrackPoint {
  latitude: number;
  longitude: number;
  altitude: number;
  time: string;
}

export interface AssetTrack {
  assetId: string;
  points: TrackPoint[];
}

export interface CoverageZone {
  id: string;
  assetId: string;
  polygon: number[][];
  timestamp: string;
}

export interface SatelliteEvent {
  id: string;
  type: 'CONJUNCTION' | 'OVERPASS';
  assetId: string;
  time: string;
  details: Record<string, unknown>;
}

export interface TLEPayload {
  name: string;
  line1: string;
  line2: string;
}

export interface AssetQuery {
  type?: string;
  startTime?: string;
  endTime?: string;
}
