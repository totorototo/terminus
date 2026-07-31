import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocation } from "wouter";

import Help from "./Help.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("wouter", () => ({
  useLocation: vi.fn(),
}));

vi.mock("./Help.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

const mockNavigate = vi.fn();

describe("Help", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocation.mockReturnValue(["/help", mockNavigate]);
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the hero title", () => {
    render(<Help />);
    expect(screen.getByText("Terminus")).toBeInTheDocument();
  });

  it("renders a nav button for every section", () => {
    render(<Help />);
    expect(screen.getByText("Getting Started")).toBeInTheDocument();
    expect(screen.getByText("Install")).toBeInTheDocument();
  });

  it("scrolls the matching section into view when a nav button is clicked", () => {
    render(<Help />);
    const section = document.createElement("div");
    section.id = "story";
    document.body.appendChild(section);

    fireEvent.click(screen.getByText("The Story"));

    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
    document.body.removeChild(section);
  });

  it("calls window.history.back() when history exists", () => {
    vi.spyOn(window.history, "back").mockImplementation(() => {});
    Object.defineProperty(window.history, "length", {
      value: 2,
      configurable: true,
    });

    render(<Help />);
    fireEvent.click(screen.getByText("← Back"));

    expect(window.history.back).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("navigates to '/' when there is no history", () => {
    Object.defineProperty(window.history, "length", {
      value: 1,
      configurable: true,
    });

    render(<Help />);
    fireEvent.click(screen.getByText("← Back"));

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
