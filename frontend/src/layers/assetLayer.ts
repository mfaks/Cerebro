import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import MapView from "@arcgis/core/views/MapView";
import type { Asset } from "../types/types";

export function createAssetLayer(mapView: MapView): GraphicsLayer {
  const layer = new GraphicsLayer();
  mapView.map?.add(layer);
  return layer;
}

export function renderAssets(layer: GraphicsLayer, assets: Asset[]): void {
  layer.removeAll();
  assets.forEach((asset) => {
    const point = new Point({
      latitude: asset.position.latitude,
      longitude: asset.position.longitude,
    });

    const symbol = new SimpleMarkerSymbol({
      color: asset.type === "DEBRIS" ? "red" : "lime",
      size: 8,
    });

    layer.add(
      new Graphic({
        geometry: point,
        symbol,
        attributes: asset,
      }),
    );
  });
}
