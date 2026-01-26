const createWayPointsSlice = (set, get) => ({
  waypoints: [],

  // WayPoints Actions
  setWayPoints: (waypoints) =>
    set(
      (state) => ({
        ...state,
        waypoints,
      }),
      undefined,
      "waypoints/setWayPoints",
    ),
});

export default createWayPointsSlice;
