import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import StoryDotNav from "./StoryDotNav.jsx";
import { STORY_SECTIONS } from "./storySections.js";

import "@testing-library/jest-dom/vitest";

vi.mock("./StoryDotNav.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

describe("StoryDotNav", () => {
  const onJump = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders one labeled dot per story section", () => {
    render(<StoryDotNav activeIndex={2} onJump={onJump} />);
    expect(screen.getAllByRole("button")).toHaveLength(STORY_SECTIONS.length);
    STORY_SECTIONS.forEach(({ label }) => {
      expect(
        screen.getByRole("button", { name: `Jump to ${label}` }),
      ).toBeInTheDocument();
    });
  });

  it("marks only the active section's dot as current", () => {
    render(<StoryDotNav activeIndex={2} onJump={onJump} />);
    const [activeLabel, ...otherLabels] = [
      STORY_SECTIONS[2].label,
      ...STORY_SECTIONS.filter((_, i) => i !== 2).map((s) => s.label),
    ];
    expect(
      screen.getByRole("button", { name: `Jump to ${activeLabel}` }),
    ).toHaveAttribute("aria-current", "true");
    otherLabels.forEach((label) => {
      expect(
        screen.getByRole("button", { name: `Jump to ${label}` }),
      ).not.toHaveAttribute("aria-current");
    });
  });

  it("clicking a dot calls onJump with its index", () => {
    render(<StoryDotNav activeIndex={2} onJump={onJump} />);
    const targetIndex = 4;
    fireEvent.click(
      screen.getByRole("button", {
        name: `Jump to ${STORY_SECTIONS[targetIndex].label}`,
      }),
    );
    expect(onJump).toHaveBeenCalledWith(targetIndex);
  });
});
