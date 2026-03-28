import { useEffect, useRef } from "react";
import Map from "@arcgis/core/Map.js";
import ArcGISMapView from "@arcgis/core/views/MapView.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Point from "@arcgis/core/geometry/Point.js";
import createAssetLayer from "../layers/assetLayer";
import type { Asset, AssetType, Filters } from "../types/types";
import { REGIONS } from "../hooks/useAssetFilters";

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

      const ws = new WebSocket("ws://localhost:3000/ws/assets");

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data) as {
          id: string;
          position: { latitude: number; longitude: number };
        };
        const graphic = assetLayerRef.current?.graphics.find(
          (g) => g.attributes.id === data.id
        );
        if (graphic) {
          graphic.geometry = new Point({
            latitude: data.position.latitude,
            longitude: data.position.longitude,
          });
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
