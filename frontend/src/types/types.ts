export interface Asset {
  id: string;
  name: string;
  type: string;
  position: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  velocity: {
    speed: number;
    heading: number;
  };
  status: string;
  lastUpdated?: string;
  metadata: {
    country: string;
    launchDate: string | null;
    rcsSize: string;
  };
}

export type AssetType = "PAYLOAD" | "DEBRIS" | "ROCKET_BODY";

export type OrbitalRegime = "LEO" | "MEO" | "GEO" | "HEO";

export interface Filters {
  types: Set<AssetType>;
  orbitalRegimes: Set<OrbitalRegime>;
  altitudeMin: string;
  altitudeMax: string;
}

export interface FilterPanelProps {
  filters: Filters;
  toggleType: (type: AssetType) => void;
  toggleOrbitalRegime: (regime: OrbitalRegime) => void;
  setAltitudeMin: (val: string) => void;
  setAltitudeMax: (val: string) => void;
  reset: () => void;
}
