export interface Asset {
  id: string;
  name: string;
  type: AssetType;
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
    rcsSize: string | null;
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
  assets: Asset[];
}
