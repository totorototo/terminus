export const createWayPointsSlice = (set) => ({
  waypoints: [],

  setWayPoints: (waypoints) =>
    set({ waypoints }, undefined, "waypoints/setWayPoints"),
});
