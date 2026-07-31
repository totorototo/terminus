import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storeModule from "../../../store/store.js";
import SlopeProfile from "./SlopeProfile.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("../../../store/store.js", () => ({
  default: vi.fn(),
  useProjectedLocation: vi.fn(),
}));

vi.mock("./SlopeProfile.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const GPX_DATA = Array.from({ length: 10 }, () => [0, 0, 0]);

// A 12% climb and a -9% descent, flat ground otherwise
const SLOPES = [0, 12, 0, -9, 0, 0, 0, 0, 0, 0];

function setupStore({
  gpxData = [],
  slopes = [],
  projectedLocation = null,
} = {}) {
  storeModule.default.mockImplementation((selector) =>
    selector({ gpx: { data: gpxData, slopes } }),
  );
  storeModule.useProjectedLocation.mockReturnValue(projectedLocation);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("SlopeProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when gpx.data is empty", () => {
    setupStore({ gpxData: [], slopes: SLOPES });
    const { container } = render(<SlopeProfile />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when slopes is empty", () => {
    setupStore({ gpxData: GPX_DATA, slopes: [] });
    const { container } = render(<SlopeProfile />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the max climb and max descent percentages rounded", () => {
    setupStore({ gpxData: GPX_DATA, slopes: SLOPES });
    render(<SlopeProfile />);
    expect(screen.getByText("12%")).toBeInTheDocument();
    expect(screen.getByText("-9%")).toBeInTheDocument();
  });

  it("always renders the zero line", () => {
    setupStore({ gpxData: GPX_DATA, slopes: SLOPES });
    const { container } = render(<SlopeProfile />);
    const zeroLine = container.querySelector(".sp-zero-line");
    expect(zeroLine).toBeInTheDocument();
    expect(zeroLine).toHaveAttribute("y1", "44");
    expect(zeroLine).toHaveAttribute("y2", "44");
  });

  it("renders a progress mask up to the projected location", () => {
    setupStore({
      gpxData: GPX_DATA,
      slopes: SLOPES,
      projectedLocation: { index: 3, timestamp: 0 },
    });
    const { container } = render(<SlopeProfile />);
    const doneMask = container.querySelector(".sp-done-mask");
    expect(doneMask).toBeInTheDocument();
    expect(doneMask).toHaveAttribute("width", "100");
  });

  it("does not render a progress mask when no location is projected", () => {
    setupStore({ gpxData: GPX_DATA, slopes: SLOPES, projectedLocation: null });
    const { container } = render(<SlopeProfile />);
    expect(container.querySelector(".sp-done-mask")).not.toBeInTheDocument();
  });
});
