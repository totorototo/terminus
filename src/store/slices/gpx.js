export const createGpxSlice = (set, get) => ({
  gpx: {
    data: [],
    slopes: [],
    cumulativeDistances: [],
    cumulativeElevations: [],
    cumulativeElevationLosses: [],
  },

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
