import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import StripReadout from "./StripReadout.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("./StripReadout.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

describe("StripReadout", () => {
  it("renders nothing when pct is null", () => {
    const { container } = render(
      <StripReadout pct={null} value="12% grade" color="red" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when value is null", () => {
    const { container } = render(
      <StripReadout pct={42} value={null} color="red" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the value hidden from assistive tech, since the strip's svg already announces it", () => {
    const { container } = render(
      <StripReadout pct={42} value="12% grade" color="red" />,
    );
    const el = container.querySelector(".strip-readout-value");
    expect(el).toHaveTextContent("12% grade");
    expect(el).toHaveAttribute("aria-hidden", "true");
  });
});
