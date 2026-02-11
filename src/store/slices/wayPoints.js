export const createWayPointsSlice = (set, get) => ({
  waypoints: [],

  setWayPoints: (waypoints) =>
    set({ waypoints }, undefined, "waypoints/setWayPoints"),
});
