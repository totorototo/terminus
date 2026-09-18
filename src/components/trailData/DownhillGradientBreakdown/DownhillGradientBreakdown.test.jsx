import { render, screen } from "@testing-library/react";
import { useTheme } from "styled-components";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storeModule from "../../../store/store.js";
import DownhillGradientBreakdown from "./DownhillGradientBreakdown.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("../../../store/store.js", () => ({
  default: vi.fn(),
}));

vi.mock("./DownhillGradientBreakdown.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

vi.mock("styled-components", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useTheme: vi.fn() };
});

function setupStore({ slopes = [], cumulativeDistances = [] } = {}) {
  storeModule.default.mockImplementation((selector) =>
    selector({ gpx: { slopes, cumulativeDistances } }),
  );
}

describe("DownhillGradientBreakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTheme.mockReturnValue({
      colors: { dark: { "--color-accent": "#3388ff" } },
      currentVariant: "dark",
    });
  });

  it("renders nothing when route data is empty", () => {
    setupStore();
    const { container } = render(<DownhillGradientBreakdown />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a row with distance for each downhill gradient band", () => {
    setupStore({
      cumulativeDistances: [0, 100, 200],
      slopes: [0, -3, -12],
    });

    render(<DownhillGradientBreakdown />);

    expect(screen.getByText("2–5%")).toBeInTheDocument();
    expect(screen.getByText("10–15%")).toBeInTheDocument();
    expect(screen.getAllByText("0.1 km")).toHaveLength(2);
  });
});
