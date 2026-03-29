import { useCallback, useEffect, useRef } from "react";
import esriConfig from "@arcgis/core/config.js";
import Map from "@arcgis/core/Map.js";
import ArcGISMapView from "@arcgis/core/views/MapView.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import { createAssetLayer, renderAssets } from "../layers/assetLayer";
import type { Asset, AssetType, OrbitalRegime, Filters } from "../types/types";
import { REGIME_BOUNDS } from "../hooks/useAssetFilters";

esriConfig.apiKey = import.meta.env.VITE_ARCGIS_API_KEY as string;


const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

interface Props {
  filters: Filters;
}

function MapView({ filters }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const assetLayerRef = useRef<GraphicsLayer | null>(null);
  const filtersRef = useRef<Filters>(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const applyFilters = useCallback((layer: GraphicsLayer) => {
    const currentFilters = filtersRef.current;

    layer.graphics.forEach((graphic) => {
      const asset = graphic.attributes as Asset;
      let visible = currentFilters.types.has(asset.type as AssetType);

      if (visible) {
        const alt = asset.position.altitude;
        visible = Array.from(currentFilters.orbitalRegimes).some((regime: OrbitalRegime) => {
          const { min, max } = REGIME_BOUNDS[regime];
          return alt >= min && alt < max;
        });
      }

      if (visible && currentFilters.altitudeMin !== "") {
        visible = asset.position.altitude >= Number(currentFilters.altitudeMin);
      }

      if (visible && currentFilters.altitudeMax !== "") {
        visible = asset.position.altitude <= Number(currentFilters.altitudeMax);
      }

      graphic.visible = visible;
    });
  }, []);

  useEffect(() => {
    const map = new Map({ basemap: "satellite" });
    const view = new ArcGISMapView({
      container: mapRef.current!,
      map,
      center: [0, 0],
      zoom: 2,
    });

    view.when(() => {
      assetLayerRef.current = createAssetLayer(view);

      fetch(`${API_BASE}/api/v1/assets`)
        .then((r) => r.json())
        .then((body: { data: Asset[] }) => {
          if (assetLayerRef.current) {
            renderAssets(assetLayerRef.current, body.data);
            applyFilters(assetLayerRef.current);
          }
        })
        .catch((err: unknown) => console.error("Failed to load assets:", err));

      const ws = new WebSocket(`${import.meta.env.VITE_WS_BASE_URL as string}/ws/assets`);

      ws.onmessage = (event) => {
        const assets = JSON.parse(event.data) as Asset[];
        if (assetLayerRef.current) {
          renderAssets(assetLayerRef.current, assets);
          applyFilters(assetLayerRef.current);
        }
      };

      ws.onclose = () => console.log("WebSocket disconnected");
      ws.onerror = (err) => console.error("WebSocket error", err);
    });

    return () => {
      view.destroy();
    };
  }, [applyFilters]);

  useEffect(() => {
    const layer = assetLayerRef.current;
    if (!layer) return;
    applyFilters(layer);
  }, [filters.types, filters.orbitalRegimes, filters.altitudeMin, filters.altitudeMax, applyFilters]);

  return <div ref={mapRef} style={{ position: "absolute", inset: 0 }} />;
}

export default MapView;
