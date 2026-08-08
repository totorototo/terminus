import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storeModule from "../../store/store.js";
import Story from "./Story.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("../../store/store.js", () => ({
  default: vi.fn(),
  useProjectedLocation: vi.fn(),
}));

vi.mock("./Story.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

vi.mock("./StoryDotNav.jsx", () => ({
  default: ({ activeIndex }) => (
    <div data-testid="story-dot-nav" data-active-index={activeIndex} />
  ),
}));

vi.mock("./sections/StoryHero.jsx", () => ({
  default: () => <div data-testid="story-hero">StoryHero</div>,
}));
vi.mock("./sections/StoryMap.jsx", () => ({
  default: () => <div data-testid="story-map">StoryMap</div>,
}));
vi.mock("./sections/StoryNow.jsx", () => ({
  default: () => <div data-testid="story-now">StoryNow</div>,
}));
vi.mock("./sections/StoryClimbs.jsx", () => ({
  default: () => <div data-testid="story-climbs">StoryClimbs</div>,
}));
vi.mock("./sections/StoryTerrain.jsx", () => ({
  default: () => <div data-testid="story-terrain">StoryTerrain</div>,
}));
vi.mock("./sections/StoryPace.jsx", () => ({
  default: () => <div data-testid="story-pace">StoryPace</div>,
}));
vi.mock("./sections/StoryStages.jsx", () => ({
  default: () => <div data-testid="story-stages">StoryStages</div>,
}));
vi.mock("./sections/StoryCheckpoints.jsx", () => ({
  default: () => <div data-testid="story-checkpoints">StoryCheckpoints</div>,
}));
vi.mock("./sections/StoryEnd.jsx", () => ({
  default: () => <div data-testid="story-end">StoryEnd</div>,
}));

describe("Story", () => {
  const gpxData = Array.from({ length: 20 }, (_, i) => [
    45 + i * 0.001,
    6 + i * 0.001,
    100 + i * 5,
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
    storeModule.default.mockImplementation((selector) =>
      selector({ gpx: { data: gpxData } }),
    );
    storeModule.useProjectedLocation.mockReturnValue({ index: 5 });
  });

  it("renders every section in order", () => {
    render(<Story />);
    expect(screen.getByTestId("story-hero")).toBeInTheDocument();
    expect(screen.getByTestId("story-map")).toBeInTheDocument();
    expect(screen.getByTestId("story-now")).toBeInTheDocument();
    expect(screen.getByTestId("story-climbs")).toBeInTheDocument();
    expect(screen.getByTestId("story-terrain")).toBeInTheDocument();
    expect(screen.getByTestId("story-pace")).toBeInTheDocument();
    expect(screen.getByTestId("story-stages")).toBeInTheDocument();
    expect(screen.getByTestId("story-checkpoints")).toBeInTheDocument();
    expect(screen.getByTestId("story-end")).toBeInTheDocument();
  });

  it("portals the dot nav to the document body with the initial active index", () => {
    render(<Story />);
    const dotNav = screen.getByTestId("story-dot-nav");
    expect(dotNav).toBeInTheDocument();
    expect(document.body).toContainElement(dotNav);
    expect(dotNav).toHaveAttribute("data-active-index", "0");
  });

  it("renders without a route loaded yet", () => {
    storeModule.default.mockImplementation((selector) =>
      selector({ gpx: { data: null } }),
    );
    storeModule.useProjectedLocation.mockReturnValue({ index: null });

    const { container } = render(<Story />);
    expect(container).toBeInTheDocument();
  });
});
