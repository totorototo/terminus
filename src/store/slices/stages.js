export const createStagesSlice = (set) => ({
  stages: [],

  setStages: (stages) => set({ stages }, undefined, "stages/setStages"),
});
