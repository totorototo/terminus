import { describe, it, expect, beforeEach } from "vitest";
import { create } from "zustand";
import { createSectionsSlice } from "./sections";

describe("sectionsSlice", () => {
  let store;
  beforeEach(() => {
    store = create((set, get) => ({
      ...createSectionsSlice(set, get),
    }));
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = store.getState();
      expect(state.sections).toEqual([]);
    });
  });

  describe("setSections", () => {
    it("should set sections correctly", () => {
      const { setSections } = store.getState();
      const newSections = [
        { id: 1, name: "Section A" },
        { id: 2, name: "Section B" },
      ];
      setSections(newSections);
      expect(store.getState().sections).toEqual(newSections);
    });
  });
});
