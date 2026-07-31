import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useInView } from "../../hooks/useInView.js";
import LazyPanel from "./LazyPanel.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("../../hooks/useInView.js", () => ({
  useInView: vi.fn(),
}));

vi.mock("./LazyPanel.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

describe("LazyPanel", () => {
  it("renders a placeholder when not in view", () => {
    useInView.mockReturnValue([{ current: null }, false]);
    const { container } = render(
      <LazyPanel>
        <div>child</div>
      </LazyPanel>,
    );
    expect(container.querySelector(".lazy-panel-placeholder")).not.toBeNull();
    expect(screen.queryByText("child")).not.toBeInTheDocument();
  });

  it("renders children when in view", () => {
    useInView.mockReturnValue([{ current: null }, true]);
    render(
      <LazyPanel>
        <div>child</div>
      </LazyPanel>,
    );
    expect(screen.getByText("child")).toBeInTheDocument();
  });
});
