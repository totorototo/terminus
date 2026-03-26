export const createGpxSlice = (set) => ({
  gpx: {
    data: [],
    slopes: [],
    peaks: [],
    valleys: [],
    climbs: [],
    cumulativeDistances: [],
    cumulativeElevations: [],
    cumulativeElevationLosses: [],
    metadata: {
      name: null,
      description: null,
    },
  },

  setTraceData: ({
    data,
    slopes,
    cumulativeDistances,
    cumulativeElevations,
    cumulativeElevationLoss,
  }) =>
    set(
      (state) => ({
        gpx: {
          ...state.gpx,
          data,
          slopes,
          cumulativeDistances,
          cumulativeElevations,
          cumulativeElevationLosses: cumulativeElevationLoss,
        },
      }),
      undefined,
      "gpx/setTraceData",
    ),

  setPeaks: (peaks) =>
    set(
      (state) => ({
        gpx: {
          ...state.gpx,
          peaks,
        },
      }),
      undefined,
      "gpx/setPeaks",
    ),

  setValleys: (valleys) =>
    set(
      (state) => ({
        gpx: {
          ...state.gpx,
          valleys,
        },
      }),
      undefined,
      "gpx/setValleys",
    ),

  setClimbs: (climbs) =>
    set(
      (state) => ({
        gpx: {
          ...state.gpx,
          climbs,
        },
      }),
      undefined,
      "gpx/setClimbs",
    ),

  setMetadata: (metadata) =>
    set(
      (state) => ({
        gpx: {
          ...state.gpx,
          metadata: {
            ...state.gpx.metadata,
            ...metadata,
          },
        },
      }),
      undefined,
      "gpx/setMetadata",
    ),

  setGpxData: (data) =>
    set(
      (state) => ({
        gpx: {
          ...state.gpx,
          data,
        },
      }),
      undefined,
      "gpx/setGpxData",
    ),

  setSlopes: (slopes) =>
    set(
      (state) => ({
        gpx: {
          ...state.gpx,
          slopes,
        },
      }),
      undefined,
      "gpx/setSlopes",
    ),

  setCumulativeDistances: (distances) =>
    set(
      (state) => ({
        gpx: {
          ...state.gpx,
          cumulativeDistances: distances,
        },
      }),
      undefined,
      "gpx/setCumulativeDistances",
    ),

  setCumulativeElevations: (elevations) =>
    set(
      (state) => ({
        gpx: {
          ...state.gpx,
          cumulativeElevations: elevations,
        },
      }),
      undefined,
      "gpx/setCumulativeElevations",
    ),
  setCumulativeElevationLosses: (elevations) =>
    set(
      (state) => ({
        gpx: {
          ...state.gpx,
          cumulativeElevationLosses: elevations,
        },
      }),
      undefined,
      "gpx/setCumulativeElevationLosses",
    ),
});
