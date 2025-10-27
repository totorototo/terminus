export const createStatsSlice = (set, get) => ({
  stats: {
    distance: 0,
    elevationGain: 0,
    elevationLoss: 0,
    pointCount: 0,
  },

  // Stats Actions
  setStats: (newStats) =>
    set((state) => ({
      ...state,
      stats: {
        ...state.stats,
        ...newStats,
      },
    })),

  updateStats: (partialStats) =>
    set((state) => {
      const updatedStats = { ...state.stats };
      Object.entries(partialStats).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          updatedStats[key] = value;
        }
      });
      return {
        ...state,
        stats: updatedStats,
      };
    }),

  // Selectors
  getStats: () => get().stats,
});
