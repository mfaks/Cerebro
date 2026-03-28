import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import MapView from "@arcgis/core/views/MapView";
import mockData from "../data/assets.json";
import type { Asset } from "../types/types";

function createAssetLayer(mapView: MapView): GraphicsLayer {
  const graphicsLayer = new GraphicsLayer();

  mockData.assets.forEach((asset: Asset) => {
    const point = new Point({
      latitude: asset.position.latitude,
      longitude: asset.position.longitude,
    });

    const symbol = new SimpleMarkerSymbol({
      color: asset.type === "DEBRIS" ? "red" : "lime",
      size: 8,
    });

    const graphic = new Graphic({
      geometry: point,
      symbol,
      attributes: asset,
      popupTemplate: {
        title: "{name}",
        content: "Type: {type} | Status: {status} | Alt: {position.altitude} km",
      },
    });

    graphicsLayer.add(graphic);
  });

  mapView.map?.add(graphicsLayer);
  return graphicsLayer;
}

export default createAssetLayer;