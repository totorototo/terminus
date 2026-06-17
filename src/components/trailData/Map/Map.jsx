import { memo, useCallback, useEffect, useMemo, useRef } from "react";

import Map, { Layer, Marker, Source } from "react-map-gl/mapbox";
import { useTheme } from "styled-components";

import { useIsOnline } from "../../../hooks/useIsOnline.js";
import useStore, { useProjectedLocation } from "../../../store/store.js";
import OfflineRoutePreview from "./OfflineRoutePreview.jsx";

import style from "./Map.style.js";

import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_KEY;

// Convert the worker's flat full-resolution route buffer into the [lng, lat]
// pair list that Mapbox/GeoJSON and the offline preview consume. The buffer is
// stride-3 [lat, lon, ele] in Zig's native order, so we swap to [lng, lat] and
// skip the elevation here. The worker already parsed the GPX in Zig, so there's
// no XML to re-parse.
const toCoordinatePairs = (routeLatLonEle) => {
  if (!routeLatLonEle || routeLatLonEle.length < 6) return null;
  const coordinates = [];
  for (let i = 0; i + 2 < routeLatLonEle.length; i += 3) {
    const lat = routeLatLonEle[i];
    const lng = routeLatLonEle[i + 1];
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      coordinates.push([lng, lat]);
    }
  }
  return coordinates.length >= 2 ? coordinates : null;
};

const TrailMap = memo(function TrailMap({ className }) {
  const routeLatLonEle = useStore((state) => state.gpx.routeLatLonEle);
  const projectedLocation = useProjectedLocation();
  const theme = useTheme();
  const isOnline = useIsOnline();
  const mapRef = useRef(null);

  const coordinates = useMemo(
    () => toCoordinatePairs(routeLatLonEle),
    [routeLatLonEle],
  );

  // projectedLocation.coords is [lat, lng, ele] (Zig GPS format); Mapbox needs
  // [lng, lat]. A pristine fix has empty coords, so guard before rendering.
  const runnerPosition = useMemo(() => {
    const coords = projectedLocation?.coords;
    if (!coords || coords.length < 2) return null;
    const [lat, lng] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { longitude: lng, latitude: lat };
  }, [projectedLocation?.coords]);

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
  const runnerColor = theme.colors[theme.currentVariant]["--color-accent"];

  if (!MAPBOX_TOKEN) {
    return (
      <div className={className}>
        <div className="map-message">
          Set VITE_MAPBOX_KEY to display the map.
        </div>
      </div>
    );
  }

  // Mapbox fetches tiles, style JSON, and glyphs at runtime, none of which are
  // cached for offline use. Fall back to a basemap-free SVG route preview.
  if (!isOnline && coordinates) {
    return (
      <OfflineRoutePreview
        className={className}
        coordinates={coordinates}
        runnerPosition={runnerPosition}
        routeColor={routeColor}
        runnerColor={runnerColor}
      />
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
        cooperativeGestures
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
        {runnerPosition && (
          <Marker
            longitude={runnerPosition.longitude}
            latitude={runnerPosition.latitude}
            anchor="center"
          >
            <div
              className="runner-marker"
              style={{ "--runner-color": runnerColor }}
            />
          </Marker>
        )}
      </Map>
    </div>
  );
});

const StyledTrailMap = style(TrailMap);

export default StyledTrailMap;
