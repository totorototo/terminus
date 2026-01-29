export const createSectionsSlice = (set, get) => ({
  sections: [],
  setSections: (sections) =>
    set(
      (state) => ({
        ...state,
        sections,
      }),
      undefined,
      "sections/setSections",
    ),
});
