import React, { useState, useEffect, use } from "react";
import { extent } from "d3-array";
import { createXScale, createYScale, getArea } from "../d3";

export default function Profile({ gpsResults, width, height }) {
    if (!gpsResults) return null;

    const [domain, setDomain] = useState({
        x: { min: 0, max: 0 },
        y: { min: 0, max: 0 },
    });

    const [scales, setScales] = useState(null);
    const [profileArea, setProfileArea] = useState();

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

    return (
        <div style={{ width, height, boxSizing: "border-box" }}>
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                {profileArea && (
                    <path d={profileArea.path} fill="rgba(0, 123, 255, 0.5)" />
                )}
            </svg>
        </div>
    );
}