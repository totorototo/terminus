export const createGpxSlice = (set, get) => ({
  gpx: {
    data: [],
    slopes: [],
    peaks: [],
    cumulativeDistances: [],
    cumulativeElevations: [],
    cumulativeElevationLosses: [],
    metadata: {
      name: null,
      description: null,
    },
  },

  setPeaks: (peaks) =>
    set(
      (state) => ({
        ...state,
        gpx: {
          ...state.gpx,
          peaks,
        },
      }),
      undefined,
      "gpx/setPeaks",
    ),

  setMetadata: (metadata) =>
    set(
      (state) => ({
        ...state,
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
        ...state,
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
        ...state,
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
        ...state,
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
        ...state,
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
        ...state,
        gpx: {
          ...state.gpx,
          cumulativeElevationLosses: elevations,
        },
      }),
      undefined,
      "gpx/setCumulativeElevationLosses",
    ),
});
