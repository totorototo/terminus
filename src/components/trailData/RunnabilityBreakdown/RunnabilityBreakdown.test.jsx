import { render, screen } from "@testing-library/react";
import { useTheme } from "styled-components";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storeModule from "../../../store/store.js";
import RunnabilityBreakdown from "./RunnabilityBreakdown.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("../../../store/store.js", () => ({
  default: vi.fn(),
}));

vi.mock("./RunnabilityBreakdown.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

vi.mock("styled-components", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useTheme: vi.fn() };
});

function setupStore({ paceFactors = [], cumulativeDistances = [] } = {}) {
  storeModule.default.mockImplementation((selector) =>
    selector({ gpx: { paceFactors, cumulativeDistances } }),
  );
}

describe("RunnabilityBreakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTheme.mockReturnValue({
      colors: { dark: { "--color-primary": "#3388ff" } },
      currentVariant: "dark",
    });
  });

  it("renders nothing when route data is empty", () => {
    setupStore();
    const { container } = render(<RunnabilityBreakdown />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a row with distance for each runnability band", () => {
    setupStore({
      cumulativeDistances: [0, 1000, 2000, 3000],
      paceFactors: [1, 1, 1.8, 2.5],
    });

    render(<RunnabilityBreakdown />);

    expect(screen.getByText("Runnable")).toBeInTheDocument();
    expect(screen.getByText("Marginal")).toBeInTheDocument();
    expect(screen.getByText("Hike-only")).toBeInTheDocument();
    expect(screen.getAllByText("1.0 km")).toHaveLength(3);
  });
});
