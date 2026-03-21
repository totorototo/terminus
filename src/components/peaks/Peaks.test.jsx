import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "styled-components";

import Peaks from "./Peaks.jsx";
import useStore from "../../store/store.js";
import THEME from "../../theme/Theme.js";

const theme = { ...THEME, currentVariant: "dark" };

// ─── Store mock ───────────────────────────────────────────────────────────────
vi.mock("../../store/store.js");

// ─── Drei mocks ───────────────────────────────────────────────────────────────
// Expose position as a data attribute for assertion.
vi.mock("@react-three/drei", () => ({
  Billboard: ({ children, position }) => (
    <div data-testid="billboard" data-position={JSON.stringify(position)}>
      {children}
    </div>
  ),
  Text: ({ children }) => <span data-testid="r3f-text">{children}</span>,
}));

// FadingText uses useFrame/useThree internally — mock to a plain sentinel.
vi.mock("./FadingText.jsx", () => ({
  default: ({ children }) => <span data-testid="fading-text">{children}</span>,
}));

// ─── Coordinate transform mock ────────────────────────────────────────────────
// The third argument is `peaks[idx]` (the GPX data index), not the Array.map
// iteration index. We echo it as the X coordinate for deterministic assertions.
vi.mock("../../utils/coordinateTransforms", () => ({
  transformCoordinate: (_point, _scales, dataIndex) => [dataIndex, 0.5, 0],
}));

// ─── Test data ────────────────────────────────────────────────────────────────
// 8-point track; peaks at data indices 3 (1850 m) and 7 (2100 m).
const mockData = [
  [48.0, 2.0, 1200],
  [48.1, 2.1, 1300],
  [48.2, 2.2, 1450],
  [48.3, 2.3, 1850], // index 3 — peak
  [48.4, 2.4, 1700],
  [48.5, 2.5, 1600],
  [48.6, 2.6, 1550],
  [48.7, 2.7, 2100], // index 7 — peak
];
const mockPeaks = [3, 7];

function makeState({ data = [], peaks = [] } = {}) {
  return { gpx: { data, peaks } };
}

function renderPeaks(state = makeState(), props = {}) {
  useStore.mockImplementation((selector) => selector(state));
  return render(
    <ThemeProvider theme={theme}>
      <Peaks coordinateScales={{}} profileMode={false} {...props} />
    </ThemeProvider>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Peaks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when data is empty", () => {
    renderPeaks(makeState({ data: [], peaks: mockPeaks }));
    expect(screen.queryByTestId("billboard")).not.toBeInTheDocument();
  });

  it("renders nothing when the peaks list is empty", () => {
    renderPeaks(makeState({ data: mockData, peaks: [] }));
    expect(screen.queryByTestId("billboard")).not.toBeInTheDocument();
  });

  it("renders one Billboard per peak", () => {
    renderPeaks(makeState({ data: mockData, peaks: mockPeaks }));
    expect(screen.getAllByTestId("billboard")).toHaveLength(2);
  });

  it("displays the rounded elevation for each peak", () => {
    renderPeaks(makeState({ data: mockData, peaks: mockPeaks }));
    const labels = screen.getAllByTestId("fading-text");
    expect(labels[0]).toHaveTextContent("1850");
    expect(labels[1]).toHaveTextContent("2100");
  });

  it("rounds fractional elevation to the nearest integer", () => {
    const dataWithFractional = [...mockData];
    dataWithFractional[3] = [48.3, 2.3, 1849.7]; // should round to 1850
    renderPeaks(makeState({ data: dataWithFractional, peaks: [3] }));
    expect(screen.getByTestId("fading-text")).toHaveTextContent("1850");
  });

  it("positions each Billboard using the 3D coordinate from transformCoordinate", () => {
    renderPeaks(makeState({ data: mockData, peaks: mockPeaks }));
    const billboards = screen.getAllByTestId("billboard");
    // peaks[0]=3 → transformCoordinate(…, dataIndex=3) → [3, 0.5, 0]
    expect(JSON.parse(billboards[0].dataset.position)).toEqual([3, 0.5, 0]);
    // peaks[1]=7 → transformCoordinate(…, dataIndex=7) → [7, 0.5, 0]
    expect(JSON.parse(billboards[1].dataset.position)).toEqual([7, 0.5, 0]);
  });

  it("renders correctly when profileMode is true", () => {
    renderPeaks(makeState({ data: mockData, peaks: mockPeaks }), {
      profileMode: true,
    });
    expect(screen.getAllByTestId("billboard")).toHaveLength(2);
  });
});
