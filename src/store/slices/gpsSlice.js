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
    set((state) => ({
      ...state,
      gps: {
        ...state.gps,
        data,
      },
    })),

  setSlopes: (slopes) =>
    set((state) => ({
      ...state,
      gps: {
        ...state.gps,
        slopes,
      },
    })),

  setSections: (sections) =>
    set((state) => ({
      ...state,
      gps: {
        ...state.gps,
        sections,
      },
    })),

  setCumulativeDistances: (distances) =>
    set((state) => ({
      ...state,
      gps: {
        ...state.gps,
        cumulativeDistances: distances,
      },
    })),

  setCumulativeElevations: (elevations) =>
    set((state) => ({
      ...state,
      gps: {
        ...state.gps,
        cumulativeElevations: elevations,
      },
    })),

  setCumulativeElevationLosses: (elevations) =>
    set((state) => ({
      ...state,
      gps: {
        ...state.gps,
        cumulativeElevationLosses: elevations,
      },
    })),

  // Selectors
  getGpsData: () => get().gps.data,
  getSlopes: () => get().gps.slopes,
  getSections: () => get().gps.sections,
});
