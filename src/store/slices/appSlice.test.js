import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { create } from "zustand";
import { createAppSlice } from "./appSlice";

describe("appSlice", () => {
  let store;

  beforeEach(() => {
    // Create a test store with only the appSlice
    store = create((set, get) => ({
      ...createAppSlice(set, get),
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = store.getState();

      expect(state.app.trackingMode).toBe(false);
      expect(state.app.displaySlopes).toBe(false);
      expect(state.app.profileMode).toBe(false);
    });
  });

  describe("toggleTrackingMode", () => {
    it("should toggle tracking mode from false to true", () => {
      const { toggleTrackingMode, app } = store.getState();

      expect(app.trackingMode).toBe(false);

      toggleTrackingMode();

      expect(store.getState().app.trackingMode).toBe(true);
    });

    it("should toggle tracking mode from true to false", () => {
      const { toggleTrackingMode } = store.getState();

      toggleTrackingMode(); // true
      toggleTrackingMode(); // false

      expect(store.getState().app.trackingMode).toBe(false);
    });
  });

  describe("toggleSlopesMode", () => {
    it("should toggle slopes mode", () => {
      const { toggleSlopesMode } = store.getState();

      expect(store.getState().app.displaySlopes).toBe(false);

      toggleSlopesMode();
      expect(store.getState().app.displaySlopes).toBe(true);

      toggleSlopesMode();
      expect(store.getState().app.displaySlopes).toBe(false);
    });
  });

  describe("toggleProfileMode", () => {
    it("should toggle profile mode", () => {
      const { toggleProfileMode } = store.getState();

      expect(store.getState().app.profileMode).toBe(false);

      toggleProfileMode();
      expect(store.getState().app.profileMode).toBe(true);

      toggleProfileMode();
      expect(store.getState().app.profileMode).toBe(false);
    });
  });

  describe("state mutations", () => {
    it("should toggle tracking mode", () => {
      const { toggleTrackingMode } = store.getState();

      expect(store.getState().app.trackingMode).toBe(false);

      toggleTrackingMode();

      expect(store.getState().app.trackingMode).toBe(true);
    });

    it("should toggle display slopes", () => {
      const { toggleSlopesMode } = store.getState();

      expect(store.getState().app.displaySlopes).toBe(false);

      toggleSlopesMode();

      expect(store.getState().app.displaySlopes).toBe(true);
    });

    it("should toggle profile mode state", () => {
      const { toggleProfileMode } = store.getState();

      expect(store.getState().app.profileMode).toBe(false);

      toggleProfileMode();

      expect(store.getState().app.profileMode).toBe(true);
    });
  });
});
