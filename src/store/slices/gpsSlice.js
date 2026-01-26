export const createGpsSlice = (set, get) => ({
  gps: {
    data: [],
    slopes: [],
    sections: [],
    cumulativeDistances: [],
    cumulativeElevations: [],
    cumulativeElevationLosses: [],
  },

  // GPS Data Actions
  setGpsData: (data) =>
    set(
      (state) => ({
        ...state,
        gps: {
          ...state.gps,
          data,
        },
      }),
      undefined,
      "gps/setGpsData",
    ),

  setSlopes: (slopes) =>
    set(
      (state) => ({
        ...state,
        gps: {
          ...state.gps,
          slopes,
        },
      }),
      undefined,
      "gps/setSlopes",
    ),

  setSections: (sections) =>
    set(
      (state) => ({
        ...state,
        gps: {
          ...state.gps,
          sections,
        },
      }),
      undefined,
      "gps/setSections",
    ),
  setCumulativeDistances: (distances) =>
    set(
      (state) => ({
        ...state,
        gps: {
          ...state.gps,
          cumulativeDistances: distances,
        },
      }),
      undefined,
      "gps/setCumulativeDistances",
    ),

  setCumulativeElevations: (elevations) =>
    set(
      (state) => ({
        ...state,
        gps: {
          ...state.gps,
          cumulativeElevations: elevations,
        },
      }),
      undefined,
      "gps/setCumulativeElevations",
    ),
  setCumulativeElevationLosses: (elevations) =>
    set(
      (state) => ({
        ...state,
        gps: {
          ...state.gps,
          cumulativeElevationLosses: elevations,
        },
      }),
      undefined,
      "gps/setCumulativeElevationLosses",
    ),
});
