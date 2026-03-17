export const createSectionsSlice = (set) => ({
  sections: [],

  setSections: (sections) =>
    set({ sections }, undefined, "sections/setSections"),
});
