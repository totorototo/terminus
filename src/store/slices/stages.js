export const createSectionsSlice = (set) => ({
  sections: [],

  setSections: (sections) =>
    set({ sections }, undefined, "sections/setSections"),
});

export const createStagesSlice = (set) => ({
  stages: [],

  setStages: (stages) => set({ stages }, undefined, "stages/setStages"),
});
