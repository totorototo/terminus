import { scaleLinear } from "d3-scale";

export function createCoordinateScales(coordinates, options = {}) {
  const {
    xRange = [-2, 2],
    yRange = [0, 1],
    zRange = [5, -5],
    padding = 0.1,
    normalizeElevation = true,
  } = options;

  // Safety check: return empty scales if coordinates are not available
  if (!coordinates || coordinates.length === 0) {
    return {
      xScale: scaleLinear().domain([0, 1]).range(xRange),
      yScale: scaleLinear().domain([0, 1]).range(yRange),
      zScale: scaleLinear().domain([0, 1]).range(zRange),
      extents: {
        longitude: [0, 1],
        elevation: [0, 1],
        latitude: [0, 1],
      },
    };
  }

  // Calculate initial extents
  const xExtent = [
    Math.min(...coordinates.map((coord) => coord[0])),
    Math.max(...coordinates.map((coord) => coord[0])),
  ]; // longitude
  const yExtent = [
    Math.min(...coordinates.map((coord) => coord[2])),
    Math.max(...coordinates.map((coord) => coord[2])),
  ]; // elevation
  const zExtent = [
    Math.min(...coordinates.map((coord) => coord[1])),
    Math.max(...coordinates.map((coord) => coord[1])),
  ]; // latitude

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
  };
}

export function transformCoordinate(coordinate, scales) {
  const { xScale, yScale, zScale } = scales;
  return [
    xScale(coordinate[0]), // longitude → x
    yScale(coordinate[2]), // elevation → y
    zScale(coordinate[1]), // latitude → z
  ];
}

export function transformCoordinates(coordinates, scales) {
  return coordinates.map((coord) => transformCoordinate(coord, scales));
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
    point3D: transformCoordinate(value.point, scales),
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
    }) => ({
      points: transformCoordinates(points, scales),
      totalDistance,
      totalElevation,
      totalElevationLoss,
      startPoint,
      id: segmentId,
    }),
  );
}
