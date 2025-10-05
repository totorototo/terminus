import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

const useStore = create(
  devtools(
    (set) => ({
      theme: "light",
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),

      checkpoints: [],
      setCheckpoints: (checkpoints) => set({ checkpoints }),
      sections: [],
      setSections: (sections) => set({ sections }),
      gpsData: [],
      setGpsData: (data) => set({ gpsData: data }),
      stats: {
        distance: 0,
        elevationGain: 0,
        elevationLoss: 0,
        pointCount: 0,
      },
      setStats: (stats) =>
        set((state) => ({
          stats: {
            distance: stats.distance ?? state.stats.distance,
            elevationGain: stats.elevationGain ?? state.stats.elevationGain,
            elevationLoss: stats.elevationLoss ?? state.stats.elevationLoss,
            pointCount: stats.pointCount ?? state.stats.pointCount,
          },
        })),
      slopes: [],
      setSlopes: (slopes) => set({ slopes }),
      cumulativeDistances: [],
      setCumulativeDistances: (distances) =>
        set({ cumulativeDistances: distances }),
      cumulativeElevations: [],
      setCumulativeElevations: (elevations) =>
        set({ cumulativeElevations: elevations }),
      cumulativeElevationLosses: [],
      setCumulativeElevationLosses: (elevations) =>
        set({ cumulativeElevationLosses: elevations }),
      currentPositionIndex: 0,
      setCurrentPositionIndex: (index) => set({ currentPositionIndex: index }),
    }),
    {
      name: "Terminus Store",
      enabled: true,
    },
  ),
);

export default useStore;
