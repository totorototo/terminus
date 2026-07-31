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

  it("renders role choices on step 1", () => {
    render(<Wizard />);
    expect(screen.getByText("I'm running")).toBeInTheDocument();
    expect(screen.getByText("I'm following")).toBeInTheDocument();
  });

  it("advances to the race list when clicking 'I'm running'", async () => {
    render(<Wizard />);
    fireEvent.click(screen.getByText("I'm running"));
    expect(await screen.findByText("Race One")).toBeInTheDocument();
  });

  it("navigates to /run/:raceId when picking a race in the runner flow", async () => {
    render(<Wizard />);
    fireEvent.click(screen.getByText("I'm running"));
    fireEvent.click(await screen.findByText("Race One"));
    expect(mockNavigate).toHaveBeenCalledWith("/run/race1");
  });

  it("advances through the follower flow to the code entry step", async () => {
    render(<Wizard />);
    fireEvent.click(screen.getByText("I'm following"));
    fireEvent.click(await screen.findByText("Race One"));
    expect(screen.getByText("Enter Code")).toBeInTheDocument();
  });

  it("enables the Follow button with a valid code and navigates on click", async () => {
    render(<Wizard />);
    fireEvent.click(screen.getByText("I'm following"));
    fireEvent.click(await screen.findByText("Race One"));

    const input = screen.getByPlaceholderText("0a1b2c3d4e5f6a7b");
    fireEvent.change(input, { target: { value: "0a1b2c3d4e5f6a7b" } });

    const followButton = screen.getByText("Follow").closest("button");
    expect(followButton).toBeEnabled();

    fireEvent.click(followButton);
    expect(mockNavigate).toHaveBeenCalledWith("/follow/race1/0a1b2c3d4e5f6a7b");
  });

  it("keeps the Follow button disabled with an invalid code", async () => {
    render(<Wizard />);
    fireEvent.click(screen.getByText("I'm following"));
    fireEvent.click(await screen.findByText("Race One"));

    const input = screen.getByPlaceholderText("0a1b2c3d4e5f6a7b");
    fireEvent.change(input, { target: { value: "not-valid" } });

    const followButton = screen.getByText("Follow").closest("button");
    expect(followButton).toBeDisabled();
  });

  it("shows an error state with a retry button when the fetch rejects", async () => {
    fetch.mockRejectedValue(new Error("network error"));
    render(<Wizard />);
    fireEvent.click(screen.getByText("I'm running"));
    expect(await screen.findByText("Try again")).toBeInTheDocument();
  });

  it("re-fetches races when clicking Try again", async () => {
    fetch.mockRejectedValue(new Error("network error"));
    render(<Wizard />);
    fireEvent.click(screen.getByText("I'm running"));
    const retryButton = await screen.findByText("Try again");

    const callCountBeforeRetry = fetch.mock.calls.length;
    fireEvent.click(retryButton);

    await waitFor(() =>
      expect(fetch.mock.calls.length).toBeGreaterThan(callCountBeforeRetry),
    );
  });
});
