import { useEffect, useRef } from "react";
import esriConfig from "@arcgis/core/config.js";
import Map from "@arcgis/core/Map.js";
import ArcGISMapView from "@arcgis/core/views/MapView.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import { createAssetLayer, renderAssets } from "../layers/assetLayer";
import type { Asset, AssetType, Filters } from "../types/types";
import { REGIONS } from "../hooks/useAssetFilters";

esriConfig.apiKey = import.meta.env.VITE_ARCGIS_API_KEY as string;


const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

interface Props {
  filters: Filters;
}

function MapView({ filters }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const assetLayerRef = useRef<GraphicsLayer | null>(null);

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
          }
        })
        .catch((err: unknown) => console.error("Failed to load assets:", err));

      const ws = new WebSocket(`${import.meta.env.VITE_WS_BASE_URL as string}/ws/assets`);

      ws.onmessage = (event) => {
        const assets = JSON.parse(event.data) as Asset[];
        if (assetLayerRef.current) {
          renderAssets(assetLayerRef.current, assets);
        }
      };

      ws.onclose = () => console.log("WebSocket disconnected");
      ws.onerror = (err) => console.error("WebSocket error", err);
    });

    return () => {
      view.destroy();
    };
  }, []);

  useEffect(() => {
    const layer = assetLayerRef.current;
    if (!layer) return;

    const region = REGIONS.find((r) => r.label === filters.regionLabel);

    layer.graphics.forEach((graphic) => {
      const asset = graphic.attributes as Asset;
      let visible = filters.types.has(asset.type as AssetType);

      if (visible && region?.bounds) {
        const { minLat, maxLat, minLon, maxLon } = region.bounds;
        visible =
          asset.position.latitude >= minLat &&
          asset.position.latitude <= maxLat &&
          asset.position.longitude >= minLon &&
          asset.position.longitude <= maxLon;
      }

      if (visible && filters.startTime && asset.lastUpdated) {
        visible = new Date(asset.lastUpdated) >= new Date(filters.startTime);
      }

      if (visible && filters.endTime && asset.lastUpdated) {
        visible = new Date(asset.lastUpdated) <= new Date(filters.endTime);
      }

      graphic.visible = visible;
    });
  }, [filters.types, filters.regionLabel, filters.startTime, filters.endTime]);

  return <div ref={mapRef} style={{ position: "absolute", inset: 0 }} />;
}

export default MapView;
