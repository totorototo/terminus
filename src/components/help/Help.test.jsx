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

vi.mock("../story/ThemeToggle.jsx", () => ({ default: () => null }));

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

  it("heads the page with the app's name, then the guide's title", () => {
    render(<Help />);
    expect(
      screen.getByRole("heading", { level: 1, name: "terminus" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "How it works" }),
    ).toBeInTheDocument();
  });

  it("lists every section in the contents, each with its section", () => {
    render(<Help />);
    const contents = screen.getByRole("navigation", { name: "Contents" });
    for (const label of ["Getting started", "Fueling", "Install", "Privacy"]) {
      expect(contents).toHaveTextContent(label);
    }
    for (const id of ["start", "story", "fueling", "follower", "privacy"]) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it("describes no runner-profile presets: the model is the plan.json's", () => {
    render(<Help />);
    expect(document.body).not.toHaveTextContent(/Casual|Athlete|Elite/);
    expect(document.getElementById("terrain")).toHaveTextContent(
      "Replace plan.json",
    );
  });

  it("lists every service that receives data in the privacy section", () => {
    render(<Help />);
    const privacy = document.getElementById("privacy");
    for (const service of [
      "Mapbox",
      "Open-Meteo",
      "Umami",
      "Web3Forms",
      "Cloudflare",
      "Netlify",
      "jsDelivr",
    ]) {
      expect(privacy).toHaveTextContent(service);
    }
  });

  it("scrolls the matching section into view when a nav button is clicked", () => {
    render(<Help />);
    const section = document.createElement("div");
    section.id = "story";
    document.body.appendChild(section);

    fireEvent.click(screen.getByRole("button", { name: "The story" }));

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
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(window.history.back).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("navigates to '/' when there is no history", () => {
    Object.defineProperty(window.history, "length", {
      value: 1,
      configurable: true,
    });

    render(<Help />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
