import { useCallback, useEffect, useRef, useState } from "react";
import esriConfig from "@arcgis/core/config.js";
import Map from "@arcgis/core/Map.js";
import ArcGISMapView from "@arcgis/core/views/MapView.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import { createAssetLayer, renderAssets } from "../layers/assetLayer";
import type { Asset, AssetType, OrbitalRegime, Filters } from "../types/types";
import { REGIME_BOUNDS } from "../hooks/useAssetFilters";

esriConfig.apiKey = import.meta.env.VITE_ARCGIS_API_KEY as string;


const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

interface MapViewProps {
  readonly filters: Filters;
  readonly onAssetsChange: (assets: Asset[]) => void;
}

interface Tooltip {
  x: number;
  y: number;
  asset: Asset;
}

function MapView({ filters, onAssetsChange }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const assetLayerRef = useRef<GraphicsLayer | null>(null);
  const filtersRef = useRef<Filters>(filters);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

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
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const WS_URL = `${import.meta.env.VITE_WS_BASE_URL as string}/ws/assets`;

    function connectWS() {
      const ws = new WebSocket(WS_URL);
      ws.onmessage = (event) => {
        const assets = JSON.parse(event.data) as Asset[];
        if (assetLayerRef.current) {
          renderAssets(assetLayerRef.current, assets);
          applyFilters(assetLayerRef.current);
          onAssetsChange(assets);
        }
      };
      ws.onclose = () => {
        console.log("WebSocket disconnected — retrying in 5s");
        reconnectTimer = setTimeout(connectWS, 5000);
      };
      ws.onerror = (err) => console.error("WebSocket error", err);
    }

    const map = new Map({ basemap: "satellite" });
    const view = new ArcGISMapView({
      container: mapRef.current!,
      map,
      center: [0, 0],
      zoom: 2,
      popupEnabled: false,
    });

    function onHitTest(event: { x: number; y: number }, response: Awaited<ReturnType<typeof view.hitTest>>) {
      const hit = response.results.find(
        (r) => r.type === "graphic" && r.graphic.attributes
      );
      if (hit?.type === "graphic") {
        setTooltip({ x: event.x, y: event.y, asset: hit.graphic.attributes as Asset });
      } else {
        setTooltip(null);
      }
    }

    function handlePointerMove(event: { x: number; y: number }) {
      view.hitTest(event)
        .then((response) => onHitTest(event, response))
        .catch((err: unknown) => console.error("hitTest error", err));
    }

    view.when(() => {
      assetLayerRef.current = createAssetLayer(view);

      fetch(`${API_BASE}/api/v1/assets`)
        .then((r) => r.json())
        .then((body: { data: Asset[] }) => {
          if (assetLayerRef.current) {
            renderAssets(assetLayerRef.current, body.data);
            applyFilters(assetLayerRef.current);
            onAssetsChange(body.data);
          }
        })
        .catch((err: unknown) => console.error("Failed to load assets:", err));

      connectWS();
      view.on("pointer-move", handlePointerMove);
    });

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      view.destroy();
    };
  }, [applyFilters]);

  useEffect(() => {
    const layer = assetLayerRef.current;
    if (!layer) return;
    applyFilters(layer);
  }, [filters.types, filters.orbitalRegimes, filters.altitudeMin, filters.altitudeMax, applyFilters]);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div ref={mapRef} style={{ position: "absolute", inset: 0 }} />
      {tooltip && (
        <div
          style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
          className="pointer-events-none absolute z-50 max-w-48 rounded-md border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur-sm"
        >
          <p className="text-sm font-semibold text-foreground leading-tight">{tooltip.asset.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tooltip.asset.type.replace("_", " ")}</p>
          <p className="text-xs text-muted-foreground">
            {Math.round(tooltip.asset.position.altitude).toLocaleString()} km
          </p>
          <p className="text-xs text-muted-foreground">
            {tooltip.asset.velocity.speed.toFixed(1)} km/s
          </p>
        </div>
      )}
    </div>
  );
}

export default MapView;
