import { useState } from "react";
import type { AssetType, RegionOption, Filters } from "../types/types";

export const ALL_TYPES: AssetType[] = ["PAYLOAD", "DEBRIS", "ROCKET_BODY"];

export const REGIONS: RegionOption[] = [
  { label: "Global" },
  { label: "North America", bounds: { minLat: 15, maxLat: 85, minLon: -170, maxLon: -50 } },
  { label: "Europe", bounds: { minLat: 35, maxLat: 75, minLon: -25, maxLon: 45 } },
  { label: "Asia-Pacific", bounds: { minLat: -50, maxLat: 60, minLon: 60, maxLon: 180 } },
];

export function useAssetFilters() {
  const [types, setTypes] = useState<Set<AssetType>>(new Set(ALL_TYPES));
  const [regionLabel, setRegionLabel] = useState("Global");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  function toggleType(type: AssetType) {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  function reset() {
    setTypes(new Set(ALL_TYPES));
    setRegionLabel("Global");
    setStartTime("");
    setEndTime("");
  }

  return {
    filters: { types, regionLabel, startTime, endTime } as Filters,
    toggleType,
    setRegionLabel,
    setStartTime,
    setEndTime,
    reset,
  };
}
