import { useEffect, useRef } from "react";
import Map from "@arcgis/core/Map.js";
import ArcGISMapView from "@arcgis/core/views/MapView.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Point from "@arcgis/core/geometry/Point.js";
import createAssetLayer from "../layers/assetLayer";

function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const assetLayerRef = useRef<GraphicsLayer | null>(null);

  useEffect(() => {
    const map = new Map({ basemap: "dark-gray-vector" });
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
        const data = JSON.parse(event.data);
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

  return <div ref={mapRef} style={{ width: "100vw", height: "100vh" }} />;
}

export default MapView;