import { useEffect, useRef } from "react";
import Map from "@arcgis/core/Map.js";
import ArcGISMapView from "@arcgis/core/views/MapView.js";
import createAssetLayer from "../layers/assetLayer";

function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map = new Map({ basemap: "dark-gray-vector" });
    const view = new ArcGISMapView({
      container: mapRef.current!,
      map,
      center: [0, 0],
      zoom: 2,
    });

    view.when(() => {
      createAssetLayer(view);
    });

    return () => {
      view.destroy();
    };
  }, []);

  return <div ref={mapRef} style={{ width: "100vw", height: "100vh" }} />;
}

export default MapView;