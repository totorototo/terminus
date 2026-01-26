export const createWayPointsSlice = (set, get) => ({
  waypoints: [],

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
