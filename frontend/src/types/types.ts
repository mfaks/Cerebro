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

export type RegionOption = {
  label: string;
  bounds?: { minLat: number; maxLat: number; minLon: number; maxLon: number };
};

export interface Filters {
  types: Set<AssetType>;
  regionLabel: string;
  startTime: string;
  endTime: string;
}

export interface FilterPanelProps {
  filters: Filters;
  toggleType: (type: AssetType) => void;
  setRegionLabel: (label: string) => void;
  setStartTime: (time: string) => void;
  setEndTime: (time: string) => void;
  reset: () => void;
}
