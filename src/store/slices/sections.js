export const createLegsSlice = (set) => ({
  legs: [],

  setLegs: (legs) => set({ legs }, undefined, "legs/setLegs"),
});
