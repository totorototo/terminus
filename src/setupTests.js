import { vi } from "vitest";

// JSDOM does not implement window.matchMedia — required by useReducedMotion
// and any component that calls window.matchMedia directly.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
