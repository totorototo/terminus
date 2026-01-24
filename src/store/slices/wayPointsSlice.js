const createWayPointsSlice = (set, get) => ({
  waypoints: [],

  // WayPoints Actions
  setWayPoints: (waypoints) =>
    set((state) => ({
      ...state,
      waypoints,
    })),
});

export default createWayPointsSlice;
