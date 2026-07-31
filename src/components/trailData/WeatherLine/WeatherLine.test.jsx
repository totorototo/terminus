import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import WeatherLine from "./WeatherLine.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("./WeatherLine.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

describe("WeatherLine", () => {
  it("renders temp, precipitation and wind text", () => {
    render(
      <WeatherLine
        weather={{ icon: "Sun", temp: 12, precipitation: 10, wind: 5 }}
      />,
    );
    expect(screen.getByText("+12°")).toBeInTheDocument();
    expect(screen.getByText("10% precip")).toBeInTheDocument();
    expect(screen.getByText("5 km/h")).toBeInTheDocument();
  });

  it("flags cold when temp is at or below zero", () => {
    const { container } = render(
      <WeatherLine weather={{ icon: "Sun", temp: 0, wind: 5 }} />,
    );
    expect(container.querySelector(".flagged")).not.toBeNull();
    expect(
      container.querySelector(".cp-weather-temp.flagged-stat"),
    ).not.toBeNull();
    expect(screen.getByRole("group")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("freezing"),
    );
  });

  it("flags wet when precipitation is at or above 50", () => {
    render(
      <WeatherLine
        weather={{ icon: "Sun", temp: 12, precipitation: 50, wind: 5 }}
      />,
    );
    expect(screen.getByRole("group")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("high precipitation"),
    );
  });

  it("flags windy when wind is at or above 30", () => {
    render(<WeatherLine weather={{ icon: "Sun", temp: 12, wind: 30 }} />);
    expect(screen.getByRole("group")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("strong wind"),
    );
  });

  it("renders the default Cloud icon for an unknown weather icon", () => {
    const { container } = render(
      <WeatherLine weather={{ icon: "NotARealIcon", temp: 12, wind: 5 }} />,
    );
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector(".flagged")).toBeNull();
  });
});
