import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocation } from "wouter";

import Wizard from "./Wizard.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("wouter", () => ({
  useLocation: vi.fn(),
}));

vi.mock("./Wizard.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

vi.mock("../story/ThemeToggle.jsx", () => ({
  default: () => <div data-testid="theme-toggle" />,
}));

const RACES = [{ id: "race1", name: "Race One" }];

const mockNavigate = vi.fn();

describe("Wizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocation.mockReturnValue(["/", mockNavigate]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => RACES,
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the race list", async () => {
    render(<Wizard />);
    expect(await screen.findByText("Race One")).toBeInTheDocument();
  });

  it("navigates to /run/:raceId when picking a race", async () => {
    render(<Wizard />);
    fireEvent.click(await screen.findByText("Race One"));
    expect(mockNavigate).toHaveBeenCalledWith("/run/race1");
  });

  it("shows an error state with a retry button when the fetch rejects", async () => {
    fetch.mockRejectedValue(new Error("network error"));
    render(<Wizard />);
    expect(await screen.findByText("Try again")).toBeInTheDocument();
  });

  it("re-fetches races when clicking Try again", async () => {
    fetch.mockRejectedValue(new Error("network error"));
    render(<Wizard />);
    const retryButton = await screen.findByText("Try again");

    const callCountBeforeRetry = fetch.mock.calls.length;
    fireEvent.click(retryButton);

    await waitFor(() =>
      expect(fetch.mock.calls.length).toBeGreaterThan(callCountBeforeRetry),
    );
  });
});
