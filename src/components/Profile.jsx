import React, { useState, useEffect, useRef } from "react";
import { extent } from "d3-array";
import { createXScale, createYScale, getArea, getLine } from "../d3";

export default function Profile({ gpsResults, width, height, handleGetSection, section }) {
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

    useEffect(() => {
        if (!gpsResults || width <= 0 || height <= 0) {
            return;
        }
        //compute domain
        const elevations = gpsResults.points.map(p => p[2]);
        const extentY = extent(elevations);

        if (extentY[0] === undefined || extentY[1] === undefined) return;

        setDomain({
            x: { min: 0, max: gpsResults.points.length },
            y: { min: 0, max: Math.ceil(extentY[1]) },
        })


        // compute scales
        const xScale = createXScale(
            { min: 0, max: gpsResults.points.length },
            { min: 0, max: width }
        );
        const yScale = createYScale(
            { min: 0, max: Math.ceil(extentY[1]) },
            { min: height, max: 0 }
        );

        setScales({ xScale, yScale });

    }, [gpsResults, width, height]);


    // compute line and area paths
    useEffect(() => {
        if (!scales) return;
        if (!domain) return;
        if (!gpsResults) return;
        if (gpsResults.points.length === 0) return;
        if (domain.y.max === 0) return;

        const { xScale, yScale } = scales;

        const area = getArea(
            gpsResults.points,
            xScale,
            yScale,
            domain.y.min
        );

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
        const idx = Math.round(scales.xScale.invert ? scales.xScale.invert(x) : scales.xScale.domain()[0] + (x / width) * (scales.xScale.domain()[1] - scales.xScale.domain()[0]));
        setSelectionStartIndex(idx);
        setSelectionEndIndex(idx);
    }

    function handleMouseMove(evt) {
        if (!isSelecting || !scales) return;
        const x = getSvgX(evt);
        setSelectionEndX(x);
        // Convert to index
        const idx = Math.round(scales.xScale.invert ? scales.xScale.invert(x) : scales.xScale.domain()[0] + (x / width) * (scales.xScale.domain()[1] - scales.xScale.domain()[0]));
        setSelectionEndIndex(idx);
    }

    function handleMouseUp(evt) {
        if (!isSelecting) return;
        setIsSelecting(false);

        const i0 = Math.max(0, Math.min(selectionStartIndex, selectionEndIndex));
        const i1 = Math.min(gpsResults.points.length - 1, Math.max(selectionStartIndex, selectionEndIndex));

        if (!(i1 > i0)) return;
        // Optionally, trigger reprocessing of GPS data for selected range
        if (handleGetSection) {
            handleGetSection(i0, i1);
        }
    }

    // Optionally, expose selected indices for parent/worker/wasm
    useEffect(() => {
        const i0 = Math.max(0, Math.min(selectionStartIndex, selectionEndIndex));
        const i1 = Math.min(gpsResults.points.length - 1, Math.max(selectionStartIndex, selectionEndIndex));
        if (!(i1 > i0)) return;

    }, [selectionStartIndex, selectionEndIndex]);


    // Draw selection rectangle
    let selectionRect = null;
    if (selectionStartX !== null && selectionEndX !== null && isSelecting) {
        const x = Math.min(selectionStartX, selectionEndX);
        const w = Math.abs(selectionEndX - selectionStartX);
        selectionRect = (
            <rect x={x} y={0} width={w} height={height} fill="rgba(255,0,0,0.2)" pointerEvents="none" />
        );
    }

    // Draw highlighted selected path
    let selectedPath = null;
    if (
        selectionStartIndex !== null &&
        selectionEndIndex !== null &&
        scales &&
        gpsResults &&
        gpsResults.points.length > 1
    ) {
        const i0 = Math.max(0, Math.min(selectionStartIndex, selectionEndIndex));
        const i1 = Math.min(gpsResults.points.length - 1, Math.max(selectionStartIndex, selectionEndIndex));
        if (i1 > i0) {
            const selectedPoints = gpsResults.points.slice(i0, i1 + 1);
            // Custom line generator to use global index for x
            const linePath = (() => {
                const { xScale, yScale } = scales;
                if (!xScale || !yScale) return null;
                let d = '';
                selectedPoints.forEach((pt, idx) => {
                    const globalIdx = i0 + idx;
                    const x = xScale(globalIdx);
                    const y = yScale(pt[2]);
                    d += (idx === 0 ? 'M' : 'L') + x + ',' + y;
                });
                return d;
            })();
            selectedPath = (
                <path d={linePath} stroke="#ff6600" strokeWidth={3} fill="none" pointerEvents="none" />
            );
        }
    }

    return (
        <div style={{ width, height, boxSizing: "border-box", position: 'relative' }}>
            <svg
                ref={svgRef}
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                style={{ cursor: isSelecting ? 'crosshair' : 'pointer' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <defs>
                    <clipPath id="profile-clip">
                        <rect x="0" y="0" width={width} height={height} rx={8} ry={8} />
                    </clipPath>
                </defs>
                <g clipPath="url(#profile-clip)">
                    {/* { gpsResults.extrema && scales && gpsResults.extrema.map((ext, idx) => {
                        const { xScale, yScale } = scales;
                        if (!xScale || !yScale) return null;
                        const x = xScale(ext.index);
                        const y = yScale(gpsResults.points[ext.index][2]);
                        const isPeak = ext.type === 'peak';
                        return (
                            <g key={idx}>
                                <text x={x} y={y - 6} fontSize={10} textAnchor="middle" fill={isPeak ? 'red' : 'blue'}>
                                    {isPeak ? '▲' : '▼'}
                                </text>
                            </g>
                        );
                    })} */}
                    {profileArea && (
                        <path d={profileArea.path} fill="rgba(0, 123, 255, 0.5)" />
                    )}
                    {selectedPath}
                </g>
            </svg>
            {section && (
                <div style={{
                    position: 'absolute',
                    left: 8,
                    bottom: 8,
                    background: 'rgba(248,249,250,0.95)',
                    border: '1px solid #e0e0e0',
                    borderRadius: 8,
                    fontSize: 14,
                    color: '#222',
                    maxWidth: 420,
                    padding: 10,
                    zIndex: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    alignItems: 'flex-start'
                }}>
                   
                    <div style={{ margin: 0, display: 'flex', flexDirection: 'row', gap: '4px'   }}>
                        <span>Total distance: {((section.section.totalDistance)/1000).toFixed(2)} km</span>
                        <span>Total elevation: {(section.section.totalElevation).toFixed(0)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}