import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Maximize2 } from "@styled-icons/feather/Maximize2";
import { Minimize2 } from "@styled-icons/feather/Minimize2";
import { createPortal } from "react-dom";
import Map, { Layer, Marker, Source } from "react-map-gl/mapbox";
import { useTheme } from "styled-components";

import { useIsOnline } from "../../../hooks/useIsOnline.js";
import useStore, { useProjectedLocation } from "../../../store/store.js";
import OfflineRoutePreview from "./OfflineRoutePreview.jsx";

import style from "./Map.style.js";

import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_KEY;

// why: iPhone Safari never implements element-level Fullscreen API (only
// <video> gets it), so detect support up front and fall back to a fixed
// "pseudo-fullscreen" overlay via CSS instead of leaving the button dead.
const hasFullscreenApi =
  typeof document !== "undefined" &&
  Boolean(document.fullscreenEnabled ?? document.webkitFullscreenEnabled);

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
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!hasFullscreenApi) return undefined;
    const handleChange = () => {
      const active =
        document.fullscreenElement ?? document.webkitFullscreenElement;
      setIsFullscreen(active === containerRef.current);
    };
    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange);
    };
  }, []);

  // why: the CSS fallback has no native Escape-to-exit or background-scroll
  // lock, so wire both by hand; the native API already provides them.
  useEffect(() => {
    if (hasFullscreenApi || !isFullscreen) return undefined;
    const handleKey = (event) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  const toggleFullscreen = useCallback(() => {
    if (!hasFullscreenApi) {
      setIsFullscreen((prev) => !prev);
      return;
    }
    const active =
      document.fullscreenElement ?? document.webkitFullscreenElement;
    if (active) {
      (document.exitFullscreen ?? document.webkitExitFullscreen)?.call(
        document,
      );
      return;
    }
    const container = containerRef.current;
    (container?.requestFullscreen ?? container?.webkitRequestFullscreen)
      ?.call(container)
      ?.catch(() => {});
  }, []);

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
    // fitBounds's own camera solver treats a nonzero pitch as "needs more
    // headroom" and zooms out well past what the route actually needs, so
    // fit flat first, then tilt the already-framed camera in place.
    mapRef.current.fitBounds(bounds, { padding: 32, duration: 0 });
    mapRef.current.getMap()?.easeTo({ pitch: 55, duration: 0 });
  }, [bounds]);

  useEffect(() => {
    fitToBounds();
  }, [fitToBounds]);

  // react-map-gl's declarative `terrain` prop only retries setTerrain() when
  // the prop value itself changes, but the "mapbox-dem" source is added by
  // the <Source> child below on a later tick — so the one attempt make it in
  // time and it silently never gets set. Apply it imperatively once the DEM
  // source is actually loaded instead.
  const handleLoad = useCallback(() => {
    fitToBounds();
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    const applyTerrain = () => {
      if (!map.getSource("mapbox-dem")) return;
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
      map.off("sourcedata", applyTerrain);
    };
    applyTerrain();
    map.on("sourcedata", applyTerrain);
  }, [fitToBounds]);

  // why: toggling fullscreen resizes the container without firing a window
  // "resize" event, which mapbox-gl needs to redraw its canvas. Scoped to
  // isOnline/coordinates (the same inputs that decide whether <Map> is the
  // branch being rendered) so the observer is torn down the moment that
  // branch stops being mounted, instead of lingering on a detached container
  // until the next load event or a full component unmount.
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [isOnline, coordinates]);

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

  const fullscreenButton = (
    <button
      type="button"
      className="fullscreen-btn"
      onClick={toggleFullscreen}
      aria-label={isFullscreen ? "Exit fullscreen map" : "View map fullscreen"}
    >
      {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
    </button>
  );
  const containerClassName = `${className}${isFullscreen ? " is-fullscreen" : ""}`;

  // why: the CSS fallback's `position: fixed` anchors to the nearest
  // ancestor with a transform — and StorySection's reveal animation keeps
  // one applied at all times — so it'd anchor to the section instead of the
  // viewport. Portal straight to <body> to escape that containing block.
  // Native fullscreen doesn't need this: it moves the element to the
  // browser's top layer, independent of any DOM ancestor.
  const usesFallbackPortal = isFullscreen && !hasFullscreenApi;
  const renderFullscreenable = (node) =>
    usesFallbackPortal ? createPortal(node, document.body) : node;

  // Mapbox fetches tiles, style JSON, and glyphs at runtime, none of which are
  // cached for offline use. Fall back to a basemap-free SVG route preview.
  if (!isOnline && coordinates) {
    return renderFullscreenable(
      <div ref={containerRef} className={containerClassName}>
        {fullscreenButton}
        <OfflineRoutePreview
          coordinates={coordinates}
          runnerPosition={runnerPosition}
          routeColor={routeColor}
          runnerColor={runnerColor}
        />
      </div>,
    );
  }

  return renderFullscreenable(
    <div ref={containerRef} className={containerClassName}>
      {fullscreenButton}
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ longitude: 0, latitude: 0, zoom: 1, pitch: 55 }}
        maxPitch={70}
        mapStyle="mapbox://styles/mapbox/outdoors-v12"
        style={{ width: "100%", height: "100%" }}
        cooperativeGestures
        onLoad={handleLoad}
      >
        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxzoom={14}
        />
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
    </div>,
  );
});

const StyledTrailMap = style(TrailMap);

export default StyledTrailMap;
