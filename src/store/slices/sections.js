export const createSectionsSlice = (set, get) => ({
  sections: [],
  setSections: (sections) =>
    set({ sections }, undefined, "sections/setSections"),
});
