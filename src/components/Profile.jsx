import React, { useState, useEffect, useRef, useId } from "react";
import { extent } from "d3-array";
import { createXScale, createYScale, getArea, getLine } from "../d3";

export default function Profile({
  gpsResults,
  width,
  height,
  handleGetSection,
  section,
}) {
  if (!gpsResults) return null;

  const [domain, setDomain] = useState({
    x: { min: 0, max: 0 },
    y: { min: 0, max: 0 },
  });

  const [scales, setScales] = useState(null);
  const [profileArea, setProfileArea] = useState();

  // Selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStartX, setSelectionStartX] = useState(null);
  const [selectionEndX, setSelectionEndX] = useState(null);
  const [selectionStartIndex, setSelectionStartIndex] = useState(null);
  const [selectionEndIndex, setSelectionEndIndex] = useState(null);
  const svgRef = useRef(null);

  // Draw selection rectangle
  let selectionRect = null;
  let selectedPath = null;
  let selectedArea = null;

  // Layout: Y axis (labels+axis) 10% width, graph 90%. X axis (labels+axis) 20% height, graph 80%.
  const yAxisWidth = Math.round(width * 0.1);
  const xAxisHeight = Math.round(height * 0.2);
  const graphWidth = Math.round(width * 0.9);
  const graphHeight = Math.round(height * 0.8);

  useEffect(() => {
    if (!gpsResults || width <= 0 || height <= 0) {
      return;
    }
    //compute domain
    const elevations = gpsResults.points.map((p) => p[2]);
    const extentY = extent(elevations);

    if (extentY[0] === undefined || extentY[1] === undefined) return;

    setDomain({
      x: { min: 0, max: gpsResults.points.length },
      y: { min: 0, max: Math.ceil(extentY[1]) },
    });

    // compute scales for the inner graph area only
    const xScale = createXScale(
      { min: 0, max: gpsResults.points.length },
      { min: 0, max: graphWidth },
    );
    const yScale = createYScale(
      { min: 0, max: Math.ceil(extentY[1]) },
      { min: graphHeight, max: 0 },
    );

    setScales({ xScale, yScale });
  }, [gpsResults, width, height, graphWidth, graphHeight]);

  // compute line and area paths
  useEffect(() => {
    if (!scales) return;
    if (!domain) return;
    if (!gpsResults) return;
    if (gpsResults.points.length === 0) return;
    if (domain.y.max === 0) return;

    const { xScale, yScale } = scales;

    const area = getArea(gpsResults.points, xScale, yScale, domain.y.min);

    setProfileArea(area);
  }, [scales, domain, gpsResults]);

  // Helper to get mouse x relative to SVG
  function getSvgX(evt) {
    const rect = svgRef.current.getBoundingClientRect();
    return evt.clientX - rect.left;
  }

  function handleMouseDown(evt) {
    if (!scales) return;
    const x = getSvgX(evt);
    setIsSelecting(true);
    setSelectionStartX(x);
    setSelectionEndX(x);
    // Convert to index
    const idx = Math.round(
      scales.xScale.invert
        ? scales.xScale.invert(x)
        : scales.xScale.domain()[0] +
            (x / width) *
              (scales.xScale.domain()[1] - scales.xScale.domain()[0]),
    );
    setSelectionStartIndex(idx);
    setSelectionEndIndex(idx);
  }

  function handleMouseMove(evt) {
    if (!isSelecting || !scales) return;
    const x = getSvgX(evt);
    setSelectionEndX(x);
    // Convert to index
    const idx = Math.round(
      scales.xScale.invert
        ? scales.xScale.invert(x)
        : scales.xScale.domain()[0] +
            (x / width) *
              (scales.xScale.domain()[1] - scales.xScale.domain()[0]),
    );
    setSelectionEndIndex(idx);
  }

  async function handleMouseUp(evt) {
    if (!isSelecting) return;
    setIsSelecting(false);

    const i0 = Math.max(0, Math.min(selectionStartIndex, selectionEndIndex));
    const i1 = Math.min(
      gpsResults.points.length - 1,
      Math.max(selectionStartIndex, selectionEndIndex),
    );

    if (!(i1 > i0)) return;
    // Optionally, trigger reprocessing of GPS data for selected range
    if (handleGetSection) {
      await handleGetSection(i0, i1);
    }
  }

  // Helper to generate selection rectangle SVG element
  function getSelectionRect(x, w, height) {
    return (
      <rect
        x={x}
        y={0}
        width={w}
        height={height}
        fill="rgba(255,102,0,0.10)"
        stroke="#ff6600"
        strokeWidth={1.5}
        rx={6}
        style={{ transition: "fill-opacity 0.2s, stroke-opacity 0.2s" }}
        pointerEvents="none"
      />
    );
  }

  if (
    selectionStartIndex !== null &&
    selectionEndIndex !== null &&
    scales &&
    gpsResults &&
    gpsResults.points.length > 1
  ) {
    const i0 = Math.max(0, Math.min(selectionStartIndex, selectionEndIndex));
    const i1 = Math.min(
      gpsResults.points.length - 1,
      Math.max(selectionStartIndex, selectionEndIndex),
    );
    if (i1 > i0) {
      const { xScale, yScale } = scales;
      const selectedPoints = gpsResults.points.slice(i0, i1 + 1);
      // Area under selected section using getArea with xOffset
      const selectedAreaObj = getArea(
        selectedPoints,
        xScale,
        yScale,
        domain.y.min,
        i0,
      );
      if (selectedAreaObj && selectedAreaObj.path) {
        selectedArea = (
          <path
            d={selectedAreaObj.path}
            fill="rgba(255, 102, 0, 0.18)"
            style={{ transition: "fill-opacity 0.2s" }}
            pointerEvents="none"
          />
        );
      }
      // Path for selected section using getLine with xOffset
      const selectedLineObj = getLine(selectedPoints, xScale, yScale, i0);
      selectedPath = (
        <path
          d={selectedLineObj.path}
          stroke="#ff6600"
          strokeWidth={3}
          fill="none"
          style={{ filter: "drop-shadow(0 1px 2px #fff8)" }}
          pointerEvents="none"
        />
      );
      // Rectangle for selection
      const x = xScale(i0);
      const w = xScale(i1) - xScale(i0);
      selectionRect = getSelectionRect(x, w, height);
    }
  } else if (
    selectionStartX !== null &&
    selectionEndX !== null &&
    isSelecting
  ) {
    // fallback for drag selection before index is set
    const x = Math.min(selectionStartX, selectionEndX);
    const w = Math.abs(selectionEndX - selectionStartX);
    selectionRect = getSelectionRect(x, w, height);
  }

  // Grid and ticks helpers
  function getYTicks(numTicks = 5) {
    if (!scales) return [];
    const { yScale } = scales;
    const min = domain.y.min;
    const max = domain.y.max;
    const step = (max - min) / (numTicks - 1);
    return Array.from({ length: numTicks }, (_, i) => min + i * step);
  }
  function getXTicks(numTicks = 6) {
    if (!scales) return [];
    const { xScale } = scales;
    const min = domain.x.min;
    const max = domain.x.max;
    const step = (max - min) / (numTicks - 1);
    return Array.from({ length: numTicks }, (_, i) => min + i * step);
  }

  // ...existing code...

  // Unique id for clipPath
  const clipPathId =
    typeof useId === "function"
      ? useId()
      : `profile-clip-${Math.random().toString(36).slice(2, 10)}`;

  return (
    <div
      style={{
        width,
        height,
        boxSizing: "border-box",
        position: "relative",
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "flex-start",
      }}
    >
      {/* Y axis tick labels and label */}
      <div
        style={{
          width: yAxisWidth,
          height: graphHeight,
          position: "absolute",
          left: 0,
          top: 0,
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingRight: 16,
        }}
      >
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {getYTicks().map((yVal, i, arr) => {
            if (i === 0) return null;
            const y = scales ? scales.yScale(yVal) : 0;
            return (
              <div
                key={i}
                style={{
                  fontSize: 13,
                  color: "#888",
                  position: "absolute",
                  top: y - 8,
                  right: 10,
                }}
              >
                {Math.round(yVal)} m
              </div>
            );
          })}
        </div>
      </div>
      {/* SVG Graph */}
      <svg
        ref={svgRef}
        width={graphWidth}
        height={graphHeight}
        viewBox={`0 0 ${graphWidth} ${graphHeight}`}
        style={{
          cursor: "crosshair",
          background: "none",
          position: "absolute",
          left: yAxisWidth,
          top: 0,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <clipPath id={clipPathId}>
            <rect
              x="0"
              y="0"
              width={graphWidth}
              height={graphHeight}
              rx={8}
              ry={8}
            />
          </clipPath>
        </defs>
        {/* Grid lines only (no tick labels in SVG) */}
        {scales && (
          <g>
            {getYTicks().map((yVal, i, arr) => {
              if (i === 0 || i === arr.length - 1) return null;
              const y = scales.yScale(yVal);
              return (
                <line
                  key={i}
                  x1={0}
                  x2={graphWidth}
                  y1={y}
                  y2={y}
                  stroke="#e0e0e0"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                />
              );
            })}
            {getXTicks().map((xVal, i, arr) => {
              if (i === 0 || i === arr.length - 1) return null;
              const x = scales.xScale(xVal);
              return (
                <line
                  key={i}
                  y1={0}
                  y2={graphHeight}
                  x1={x}
                  x2={x}
                  stroke="#e0e0e0"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                />
              );
            })}
          </g>
        )}
        <g clipPath={`url(#${clipPathId})`}>
          {/* Peaks highlight */}
          {gpsResults.peaks &&
            scales &&
            gpsResults.peaks.map((peakIdx, idx) => {
              const { xScale, yScale } = scales;
              if (!xScale || !yScale) return null;
              const x = xScale(peakIdx);
              const y = yScale(gpsResults.points[peakIdx][2]);
              return (
                <g key={idx}>
                  <text
                    x={x}
                    y={y - 6}
                    fontSize={10}
                    textAnchor="middle"
                    fill="red"
                  >
                    ▲
                  </text>
                </g>
              );
            })}
          {profileArea && (
            <path d={profileArea.path} fill="rgba(0, 123, 255, 0.5)" />
          )}
          {selectedPath}
          {selectedArea}
        </g>
      </svg>
      {/* X axis tick labels and label */}
      <div
        style={{
          position: "absolute",
          left: yAxisWidth,
          top: graphHeight,
          width: graphWidth,
          height: xAxisHeight,
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        <div style={{ position: "relative", width: "100%", height: 20 }}>
          {getXTicks().map((xVal, i, arr) => {
            if (i === 0) return null;
            const x = scales ? scales.xScale(xVal) : 0;
            return (
              <div
                key={i}
                style={{
                  fontSize: 13,
                  color: "#888",
                  position: "absolute",
                  top: 10,
                  left: x - 16,
                  minWidth: 32,
                  textAlign: "center",
                }}
              >
                {(
                  (xVal * (gpsResults.totalDistance || 0)) /
                  (gpsResults.points.length || 1) /
                  1000
                ).toFixed(1)}{" "}
                km
              </div>
            );
          })}
        </div>
      </div>
      {section && (
        <div
          style={{
            position: "absolute",
            left: yAxisWidth + 12,
            top: graphHeight - 58,
            background: "rgba(248,249,250,0.98)",
            border: "1px solid #e0e0e0",
            borderRadius: 8,
            fontSize: 14,
            color: "#222",
            maxWidth: 420,
            padding: 10,
            zIndex: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            alignItems: "flex-start",
            opacity: 0.85,
          }}
        >
          <div
            style={{
              margin: 0,
              display: "flex",
              flexDirection: "row",
              gap: "4px",
            }}
          >
            <span>
              distance: {(section.section.totalDistance / 1000).toFixed(2)} km
            </span>
            <span>
              elevation gain: {section.section.totalElevation.toFixed(0)} m
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
