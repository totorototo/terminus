import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import useStore from "../../../store/store.js";
import PaceSettings from "./PaceSettings.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("../../../store/store.js", () => ({
  default: vi.fn(),
}));

vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn) => fn,
}));

vi.mock("./PaceSettings.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

describe("PaceSettings", () => {
  let mockStore;

  beforeEach(() => {
    mockStore = {
      settings: { basePace: 530, kFatigue: 0.0035 },
      setBasePace: vi.fn(),
      setKFatigue: vi.fn(),
      resetPaceSettings: vi.fn(),
    };
    useStore.mockImplementation((selector) => selector(mockStore));
  });

  it("renders the base pace formatted as mm:ss/km", () => {
    render(<PaceSettings />);
    expect(screen.getByText("8:50/km")).toBeInTheDocument();
  });

  it("renders the fatigue value with 4 decimals", () => {
    render(<PaceSettings />);
    expect(screen.getByText("0.0035")).toBeInTheDocument();
  });

  it("commits the base pace on pointer up", () => {
    render(<PaceSettings />);
    const slider = screen.getByLabelText(/Base pace/i, { selector: "input" });
    fireEvent.change(slider, { target: { value: "400" } });
    fireEvent.pointerUp(slider);
    expect(mockStore.setBasePace).toHaveBeenCalledWith(400);
  });

  it("commits the fatigue value on pointer up", () => {
    render(<PaceSettings />);
    const slider = screen.getByLabelText(/Fatigue/i, { selector: "input" });
    fireEvent.change(slider, { target: { value: "0.01" } });
    fireEvent.pointerUp(slider);
    expect(mockStore.setKFatigue).toHaveBeenCalledWith(0.01);
  });

  it("resets to defaults", () => {
    render(<PaceSettings />);
    fireEvent.click(
      screen.getByRole("button", {
        name: /Reset effort settings to defaults/i,
      }),
    );
    expect(mockStore.resetPaceSettings).toHaveBeenCalledOnce();
  });
});
