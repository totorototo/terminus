import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storeModule from "../../../store/store.js";
import StoryClimbs from "./StoryClimbs.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("../../../store/store.js", () => ({
  default: vi.fn(),
  useProjectedLocation: vi.fn(),
}));

vi.mock("./StoryClimbs.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

vi.mock("../StorySection.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

vi.mock("../CollapseToggle.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

// Two climbs, the first from the start line.
const CLIMBS = [
  {
    startIndex: 0,
    endIndex: 3,
    startDistM: 0,
    climbDistM: 3000,
    elevationGain: 300,
    avgGradient: 10,
    summitElev: 1300,
  },
  {
    startIndex: 5,
    endIndex: 8,
    startDistM: 5000,
    climbDistM: 2000,
    elevationGain: 160,
    avgGradient: 8,
    summitElev: 1200,
  },
];

describe("StoryClimbs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeModule.default.mockImplementation((selector) =>
      selector({ gpx: { climbs: CLIMBS } }),
    );
  });

  const rows = () => document.querySelectorAll(".climb-row");

  it("puts no climb in progress before there is a fix", () => {
    storeModule.useProjectedLocation.mockReturnValue({
      index: 0,
      timestamp: 0,
    });
    render(<StoryClimbs />);
    expect(screen.queryByText("In progress")).toBeNull();
    expect(screen.getByText("0.0 km")).toBeInTheDocument();
    expect(document.querySelector(".climb-row.past")).toBeNull();
  });

  it("marks the climb the fix is on, and the ones behind it", () => {
    storeModule.useProjectedLocation.mockReturnValue({
      index: 6,
      timestamp: 1_500_000,
    });
    render(<StoryClimbs />);
    expect(rows()[0]).toHaveClass("past");
    expect(rows()[1]).toHaveClass("current");
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });
});
