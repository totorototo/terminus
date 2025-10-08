import { create } from "zustand";
import { devtools } from "zustand/middleware";

const useStore = create(
  devtools(
    (set) => ({
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
