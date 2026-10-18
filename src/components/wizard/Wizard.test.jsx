import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLocation } from "wouter";

import { saveLocalGpx } from "../../lib/localGpx.js";
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

vi.mock("../../lib/localGpx.js", async (importOriginal) => ({
  ...(await importOriginal()),
  saveLocalGpx: vi.fn(),
}));

const mockFlush = vi.fn();
const mockForgetLiveSession = vi.fn();
const mockSetPlanFile = vi.fn();
vi.mock("../../store/store.js", () => ({
  default: (selector) =>
    selector({
      flush: mockFlush,
      forgetLiveSession: mockForgetLiveSession,
      setPlanFile: mockSetPlanFile,
    }),
}));

const mockNavigate = vi.fn();

// jsdom's File has no arrayBuffer(); browsers do.
const gpxFile = (name = "race.gpx", content = "<gpx></gpx>") => {
  const file = new File([content], name, { type: "application/gpx+xml" });
  file.arrayBuffer = async () => new ArrayBuffer(content.length);
  return file;
};

const pick = (file) =>
  fireEvent.change(screen.getByTestId("gpx-input"), {
    target: { files: [file] },
  });

describe("Wizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocation.mockReturnValue(["/", mockNavigate]);
    saveLocalGpx.mockResolvedValue(undefined);
  });

  it("offers to open a GPX", () => {
    render(<Wizard />);
    expect(
      screen.getByRole("button", { name: /open gpx/i }),
    ).toBeInTheDocument();
  });

  it("stores a picked GPX, clears the previous race's fixes and room, and opens /run", async () => {
    render(<Wizard />);
    pick(gpxFile());

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/run"));
    expect(saveLocalGpx).toHaveBeenCalledWith({
      name: "race.gpx",
      bytes: expect.any(ArrayBuffer),
    });
    expect(mockFlush).toHaveBeenCalledOnce();
    expect(mockForgetLiveSession).toHaveBeenCalledOnce();
    // The previous race's plan.json names another route.
    expect(mockSetPlanFile).toHaveBeenCalledWith(null);
  });

  it("opens a dropped GPX", async () => {
    const { container } = render(<Wizard />);
    fireEvent.drop(container.firstChild.nextSibling, {
      dataTransfer: { files: [gpxFile()] },
    });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/run"));
  });

  it("refuses a file that is not a GPX", async () => {
    render(<Wizard />);
    pick(gpxFile("notes.txt"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choose a .gpx file.",
    );
    expect(saveLocalGpx).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("says so when the file cannot be stored", async () => {
    saveLocalGpx.mockRejectedValue(new Error("QuotaExceededError"));
    render(<Wizard />);
    pick(gpxFile());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not open this file on this device.",
    );
    expect(mockFlush).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
