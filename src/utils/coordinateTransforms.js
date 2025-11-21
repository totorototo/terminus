import { scaleLinear } from "d3-scale";

export function createCoordinateScales(coordinates, options = {}) {
  const {
    xRange = [-2, 2],
    yRange = [0, 1],
    zRange = [5, -5],
    padding = 0.1,
    normalizeElevation = false,
    profileMode = true, // Use index-based profile mode
  } = options;

  // Safety check: return empty scales if coordinates are not available
  if (!coordinates || coordinates.length === 0) {
    return {
      xScale: profileMode
        ? () => 0
        : scaleLinear().domain([0, 1]).range(xRange),
      yScale: scaleLinear().domain([0, 1]).range(yRange),
      zScale: scaleLinear().domain([0, 1]).range(zRange),
      extents: {
        longitude: [0, 1],
        elevation: [0, 1],
        latitude: [0, 1],
      },
      profileMode,
    };
  }

  // Profile mode: x=0, y=elevation, z=index
  if (profileMode) {
    const elevations = coordinates.map((coord) => coord[2]);
    const yExtent = [Math.min(...elevations), Math.max(...elevations)];

    return {
      xScale: () => 0,
      yScale: scaleLinear().domain(yExtent).range(yRange),
      zScale: scaleLinear()
        .domain([0, coordinates.length - 1])
        .range(zRange),
      extents: {
        elevation: yExtent,
        indices: [0, coordinates.length - 1],
      },
      profileMode,
    };
  }

  // 3D mode: x=longitude, y=elevation, z=latitude
  // Note: coordinates are [lat, lon, ele] from Zig
  const xExtent = [
    Math.min(...coordinates.map((coord) => coord[1])),
    Math.max(...coordinates.map((coord) => coord[1])),
  ]; // longitude (coord[1])
  const yExtent = [
    Math.min(...coordinates.map((coord) => coord[2])),
    Math.max(...coordinates.map((coord) => coord[2])),
  ]; // elevation (coord[2])
  const zExtent = [
    Math.min(...coordinates.map((coord) => coord[0])),
    Math.max(...coordinates.map((coord) => coord[0])),
  ]; // latitude (coord[0])

  // Apply padding based on aspect ratio
  const lonDelta = xExtent[1] - xExtent[0];
  const latDelta = zExtent[1] - zExtent[0];
  const aspectRatio = lonDelta / latDelta;

  if (aspectRatio > 1) {
    // wider than tall
    xExtent[0] -= lonDelta * padding;
    xExtent[1] += lonDelta * padding;
    zExtent[0] -= latDelta * aspectRatio * padding;
    zExtent[1] += latDelta * aspectRatio * padding;
  } else {
    // taller than wide
    xExtent[0] -= (lonDelta / aspectRatio) * padding;
    xExtent[1] += (lonDelta / aspectRatio) * padding;
    zExtent[0] -= latDelta * padding;
    zExtent[1] += latDelta * padding;
  }

  // Create scales
  const xScale = scaleLinear().domain(xExtent).range(xRange);
  const yScale = scaleLinear()
    .domain(normalizeElevation ? [0, yExtent[1]] : yExtent)
    .range(yRange);
  const zScale = scaleLinear().domain(zExtent).range(zRange);

  return {
    xScale,
    yScale,
    zScale,
    extents: {
      longitude: xExtent,
      elevation: yExtent,
      latitude: zExtent,
    },
    profileMode,
  };
}

export function transformCoordinate(coordinate, scales, offsetIndex) {
  const { xScale, yScale, zScale } = scales;

  if (scales.profileMode && offsetIndex !== undefined && offsetIndex >= 0) {
    return [
      xScale(), // always 0 in profile mode
      yScale(coordinate[2]), // elevation → y
      zScale(offsetIndex), // index → z
    ];
  }

  // Coordinates are [lat, lon, ele] from Zig
  return [
    xScale(coordinate[1]), // longitude → x (coord[1])
    yScale(coordinate[2]), // elevation → y (coord[2])
    zScale(coordinate[0]), // latitude → z (coord[0])
  ];
}

export function transformCoordinates(coordinates, scales, index = 0) {
  return coordinates.map((coord, i) =>
    transformCoordinate(coord, scales, index + i),
  );
}

export function createCheckpoints(sections, scales) {
  if (!sections || sections.length === 0) return [];

  const checkpointsMap = sections.reduce(
    (
      acc,
      {
        startPoint,
        endPoint,
        startLocation,
        endLocation,
        startIndex,
        endIndex,
      },
    ) => {
      acc[startLocation] = { point: startPoint, index: startIndex };
      acc[endLocation] = { point: endPoint, index: endIndex };
      return acc;
    },
    {},
  );

  return Object.entries(checkpointsMap).map(([key, value]) => ({
    name: key,
    point3D: transformCoordinate(value.point, scales, value.index),
    index: value.index,
  }));
}

export function transformSections(sections, scales) {
  if (!sections || sections.length === 0) return [];

  return sections.map(
    ({
      points,
      totalDistance,
      totalElevation,
      totalElevationLoss,
      startPoint,
      segmentId,
      startIndex = 0,
    }) => ({
      points: transformCoordinates(points, scales, startIndex),
      totalDistance,
      totalElevation,
      totalElevationLoss,
      startPoint,
      id: segmentId,
    }),
  );
}
