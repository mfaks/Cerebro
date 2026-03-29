import { useState } from "react";
import type { AssetType, OrbitalRegime, Filters } from "../types/types";

export const ALL_TYPES: AssetType[] = ["PAYLOAD", "DEBRIS", "ROCKET_BODY"];

export const ALL_REGIMES: OrbitalRegime[] = ["LEO", "MEO", "GEO", "HEO"];

export const REGIME_BOUNDS: Record<OrbitalRegime, { min: number; max: number }> = {
  LEO: { min: 0, max: 2000 },
  MEO: { min: 2000, max: 35400 },
  GEO: { min: 35400, max: 36200 },
  HEO: { min: 36200, max: Infinity },
};

export const REGIME_LABELS: Record<OrbitalRegime, string> = {
  LEO: "LEO  (< 2,000 km)",
  MEO: "MEO  (2,000 – 35,400 km)",
  GEO: "GEO  (~35,786 km)",
  HEO: "HEO  (> 36,200 km)",
};

export function useAssetFilters() {
  const [types, setTypes] = useState<Set<AssetType>>(new Set(ALL_TYPES));
  const [orbitalRegimes, setOrbitalRegimes] = useState<Set<OrbitalRegime>>(new Set(ALL_REGIMES));
  const [altitudeMin, setAltitudeMin] = useState("");
  const [altitudeMax, setAltitudeMax] = useState("");

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

  function toggleOrbitalRegime(regime: OrbitalRegime) {
    setOrbitalRegimes((prev) => {
      const next = new Set(prev);
      if (next.has(regime)) {
        next.delete(regime);
      } else {
        next.add(regime);
      }
      return next;
    });
  }

  function reset() {
    setTypes(new Set(ALL_TYPES));
    setOrbitalRegimes(new Set(ALL_REGIMES));
    setAltitudeMin("");
    setAltitudeMax("");
  }

  return {
    filters: { types, orbitalRegimes, altitudeMin, altitudeMax } as Filters,
    toggleType,
    toggleOrbitalRegime,
    setAltitudeMin,
    setAltitudeMax,
    reset,
  };
}
