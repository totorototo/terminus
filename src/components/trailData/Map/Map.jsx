import { memo, useCallback, useEffect, useMemo, useRef } from "react";

import Map, { Layer, Source } from "react-map-gl/mapbox";
import { useTheme } from "styled-components";

import useStore from "../../../store/store.js";

import style from "./Map.style.js";

import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_KEY;

// Parse the raw GPX XML into a [lng, lat] coordinate list. Track points carry
// their coordinates as attributes (<trkpt lat="" lon="">), which already match
// the order GeoJSON/Mapbox expect once swapped to [lng, lat].
const parseRoute = (rawGpx) => {
  if (!rawGpx) return null;
  const doc = new DOMParser().parseFromString(rawGpx, "application/xml");
  if (doc.querySelector("parsererror")) return null;

  const coordinates = [];
  for (const point of doc.getElementsByTagName("trkpt")) {
    const lat = Number(point.getAttribute("lat"));
    const lng = Number(point.getAttribute("lon"));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      coordinates.push([lng, lat]);
    }
  }
  return coordinates.length >= 2 ? coordinates : null;
};

const TrailMap = memo(function TrailMap({ className }) {
  const rawGpx = useStore((state) => state.gpx.rawGpx);
  const theme = useTheme();
  const mapRef = useRef(null);

  const coordinates = useMemo(() => parseRoute(rawGpx), [rawGpx]);

  const routeGeoJSON = useMemo(() => {
    if (!coordinates) return null;
    return {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates,
      },
    };
  }, [coordinates]);

  const bounds = useMemo(() => {
    if (!coordinates) return null;
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const [lng, lat] of coordinates) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ];
  }, [coordinates]);

  const fitToBounds = useCallback(() => {
    if (!mapRef.current || !bounds) return;
    mapRef.current.fitBounds(bounds, { padding: 32, duration: 0 });
  }, [bounds]);

  useEffect(() => {
    fitToBounds();
  }, [fitToBounds]);

  const routeColor = theme.colors[theme.currentVariant]["--color-primary"];

  if (!MAPBOX_TOKEN) {
    return (
      <div className={className}>
        <div className="map-message">
          Set VITE_MAPBOX_KEY to display the map.
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ longitude: 0, latitude: 0, zoom: 1 }}
        mapStyle="mapbox://styles/mapbox/outdoors-v12"
        style={{ width: "100%", height: "100%" }}
        onLoad={fitToBounds}
      >
        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{ "line-color": routeColor, "line-width": 3 }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
});

export default style(TrailMap);
