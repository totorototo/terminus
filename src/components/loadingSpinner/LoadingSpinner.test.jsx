import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LoadingSpinner from "./LoadingSpinner.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("./LoadingSpinner.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

describe("LoadingSpinner", () => {
  it("renders the loading text", () => {
    render(<LoadingSpinner />);
    expect(screen.getByText("Loading trail data...")).toBeInTheDocument();
  });

  it("renders the spinner markup", () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector(".spinner")).not.toBeNull();
  });
});
