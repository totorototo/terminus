import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storeModule from "../../../store/store.js";
import PaceProfile from "./PaceProfile.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("../../../store/store.js", () => ({
  default: vi.fn(),
  useProjectedLocation: vi.fn(),
}));

vi.mock("./PaceProfile.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

// 301 points, 50 m apart → total 15 000 m
const CUMULATIVE_DISTANCES = Array.from({ length: 301 }, (_, i) => i * 50);

// Three sections with cutoff times:
//   s1: 5 km in 3000 s → 6.0 km/h
//   s2: 5 km in 2000 s → 9.0 km/h  ← tightest (highest required pace)
//   s3: 5 km in 3600 s → 5.0 km/h
const SECTIONS_WITH_CUTOFF = [
  {
    startIndex: 0,
    endIndex: 100,
    totalDistance: 5000,
    estimatedDuration: 3600,
    maxCompletionTime: 3000,
    startLocation: "Start",
  },
  {
    startIndex: 100,
    endIndex: 200,
    totalDistance: 5000,
    estimatedDuration: 3600,
    maxCompletionTime: 2000,
    startLocation: "Mid",
  },
  {
    startIndex: 200,
    endIndex: 300,
    totalDistance: 5000,
    estimatedDuration: 3600,
    maxCompletionTime: 3600,
    startLocation: "End",
  },
];

// Two sections without cutoffs, using estimatedDuration only
const SECTIONS_NO_CUTOFF = [
  {
    startIndex: 0,
    endIndex: 100,
    totalDistance: 5000,
    estimatedDuration: 3600,
    maxCompletionTime: null,
    startLocation: "Start",
  },
  {
    startIndex: 100,
    endIndex: 200,
    totalDistance: 5000,
    estimatedDuration: 1800,
    maxCompletionTime: null,
    startLocation: "Finish",
  },
];

// Mixed: only s1 has a cutoff
const SECTIONS_MIXED = [
  { ...SECTIONS_WITH_CUTOFF[0] },
  { ...SECTIONS_WITH_CUTOFF[1], maxCompletionTime: null },
];

function setupStore(sections, cumulativeDistances, projectedLocation = null) {
  storeModule.default.mockImplementation((selector) =>
    selector({ sections, gpx: { cumulativeDistances } }),
  );
  storeModule.useProjectedLocation.mockReturnValue(projectedLocation);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("PaceProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Null / empty state ────────────────────────────────────────────────────

  it("renders nothing when sections is empty", () => {
    setupStore([], CUMULATIVE_DISTANCES);
    const { container } = render(<PaceProfile />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when cumulativeDistances is empty", () => {
    setupStore(SECTIONS_WITH_CUTOFF, []);
    const { container } = render(<PaceProfile />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when all sections have zero totalDistance", () => {
    const zeroDist = SECTIONS_WITH_CUTOFF.map((s) => ({
      ...s,
      totalDistance: 0,
    }));
    setupStore(zeroDist, CUMULATIVE_DISTANCES);
    const { container } = render(<PaceProfile />);
    expect(container).toBeEmptyDOMElement();
  });

  // ── Header label ──────────────────────────────────────────────────────────

  it("shows 'Slowest Allowed Pace' when every section has maxCompletionTime", () => {
    setupStore(SECTIONS_WITH_CUTOFF, CUMULATIVE_DISTANCES);
    render(<PaceProfile />);
    expect(screen.getByText(/slowest allowed pace/i)).toBeInTheDocument();
  });

  it("shows 'Estimated Pace' when no section has maxCompletionTime", () => {
    setupStore(SECTIONS_NO_CUTOFF, CUMULATIVE_DISTANCES);
    render(<PaceProfile />);
    expect(screen.getByText(/estimated pace/i)).toBeInTheDocument();
  });

  it("shows 'Estimated Pace' when only some sections have maxCompletionTime", () => {
    setupStore(SECTIONS_MIXED, CUMULATIVE_DISTANCES);
    render(<PaceProfile />);
    expect(screen.getByText(/estimated pace/i)).toBeInTheDocument();
  });

  // ── Stats row — no runner ─────────────────────────────────────────────────

  it("shows 'tightest' label when no runner is projected", () => {
    setupStore(SECTIONS_WITH_CUTOFF, CUMULATIVE_DISTANCES, null);
    render(<PaceProfile />);
    expect(screen.getByText("tightest")).toBeInTheDocument();
  });

  it("shows 'avg required' label when no runner is projected", () => {
    setupStore(SECTIONS_WITH_CUTOFF, CUMULATIVE_DISTANCES, null);
    render(<PaceProfile />);
    expect(screen.getByText("avg required")).toBeInTheDocument();
  });

  // ── Stats row — with runner ───────────────────────────────────────────────

  it("shows 'current' label when runner is inside a section", () => {
    setupStore(SECTIONS_WITH_CUTOFF, CUMULATIVE_DISTANCES, {
      index: 50,
      timestamp: 0,
    });
    render(<PaceProfile />);
    expect(screen.getByText("current")).toBeInTheDocument();
  });

  it("does not show 'avg required' when runner is present", () => {
    setupStore(SECTIONS_WITH_CUTOFF, CUMULATIVE_DISTANCES, {
      index: 50,
      timestamp: 0,
    });
    render(<PaceProfile />);
    expect(screen.queryByText("avg required")).not.toBeInTheDocument();
  });

  // ── Tightest section identification ──────────────────────────────────────

  it("identifies the section with the highest required pace as tightest", () => {
    // s2 has maxCompletionTime=2000 → 9 km/h, the highest required pace
    setupStore(SECTIONS_WITH_CUTOFF, CUMULATIVE_DISTANCES);
    render(<PaceProfile />);
    // The pp-stat-name under "tightest" shows the section's startLocation
    const statNames = document.querySelectorAll(".pp-stat-name");
    const tightestName = Array.from(statNames).find(
      (el) => el.textContent === "Mid",
    );
    expect(tightestName).not.toBeNull();
  });

  // ── Single section edge case ──────────────────────────────────────────────

  it("renders correctly with a single section", () => {
    setupStore([SECTIONS_WITH_CUTOFF[0]], CUMULATIVE_DISTANCES);
    const { container } = render(<PaceProfile />);
    expect(container).not.toBeEmptyDOMElement();
    expect(screen.getByText("tightest")).toBeInTheDocument();
  });

  // ── Runner boundary conditions ────────────────────────────────────────────

  it("renders without crashing when runner is at index 0", () => {
    setupStore(SECTIONS_WITH_CUTOFF, CUMULATIVE_DISTANCES, {
      index: 0,
      timestamp: 0,
    });
    const { container } = render(<PaceProfile />);
    expect(container).not.toBeEmptyDOMElement();
  });

  it("renders without crashing when runner is at the last index", () => {
    setupStore(SECTIONS_WITH_CUTOFF, CUMULATIVE_DISTANCES, {
      index: 300,
      timestamp: 0,
    });
    const { container } = render(<PaceProfile />);
    expect(container).not.toBeEmptyDOMElement();
  });

  // ── km/h display ─────────────────────────────────────────────────────────

  it("renders pace values with km/h unit", () => {
    setupStore(SECTIONS_WITH_CUTOFF, CUMULATIVE_DISTANCES);
    render(<PaceProfile />);
    const kmhElements = screen.getAllByText(/km\/h/);
    expect(kmhElements.length).toBeGreaterThanOrEqual(2);
  });
});
