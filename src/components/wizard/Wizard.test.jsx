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
const mockSetPaceSettings = vi.fn();
const mockSetFueling = vi.fn();
const mockInitGPXWorker = vi.fn();
const mockReadPlanFile = vi.fn();
vi.mock("../../store/store.js", () => ({
  default: (selector) =>
    selector({
      flush: mockFlush,
      forgetLiveSession: mockForgetLiveSession,
      setPlanFile: mockSetPlanFile,
      setPaceSettings: mockSetPaceSettings,
      setFueling: mockSetFueling,
      initGPXWorker: mockInitGPXWorker,
      readPlanFile: mockReadPlanFile,
    }),
}));

const PLAN_SETTINGS = {
  basePaceSPerKm: 450,
  kFatigue: 0.003,
  lifeBaseStopS: 0,
};

const PLAN_FUELING = {
  carbsGPerH: 70,
  fluidMlPerH: 500,
  sodiumMgPerH: 400,
  reserveS: 1800,
  supplies: ["full", "none"],
  carry: [{ fluidMl: 1000, carbsG: 140, sodiumMg: 800 }, null],
};

const mockNavigate = vi.fn();

// jsdom's File has no arrayBuffer(); browsers do.
const gpxFile = (name = "race.gpx", content = "<gpx></gpx>") => {
  const file = new File([content], name, { type: "application/gpx+xml" });
  file.arrayBuffer = async () => new ArrayBuffer(content.length);
  return file;
};

const planFile = (name = "race.plan.json", content = "{}") => {
  const file = new File([content], name, { type: "application/json" });
  file.arrayBuffer = async () => new ArrayBuffer(content.length);
  return file;
};

const pick = (testId, file) =>
  fireEvent.change(screen.getByTestId(testId), {
    target: { files: [file] },
  });

// The GPX, then its plan.json, as the wizard asks for them.
const pickBoth = async () => {
  pick("gpx-input", gpxFile());
  await screen.findByText("race.gpx");
  pick("plan-input", planFile());
};

describe("Wizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocation.mockReturnValue(["/", mockNavigate]);
    saveLocalGpx.mockResolvedValue(undefined);
    mockReadPlanFile.mockResolvedValue({
      paceSettings: PLAN_SETTINGS,
      fueling: PLAN_FUELING,
    });
  });

  it("offers the GPX, and the plan.json only once the GPX is in", async () => {
    render(<Wizard />);
    expect(screen.getByRole("button", { name: /open gpx/i })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /open plan.json/i }),
    ).toBeDisabled();

    pick("gpx-input", gpxFile());
    expect(await screen.findByText("race.gpx")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open plan.json/i }),
    ).toBeEnabled();
    // Nothing is kept until the plan.json checks out.
    expect(saveLocalGpx).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("checks the plan.json against the GPX, keeps both, and opens /run", async () => {
    render(<Wizard />);
    await pickBoth();

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/run"));
    expect(mockInitGPXWorker).toHaveBeenCalled();
    expect(mockReadPlanFile).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      expect.any(ArrayBuffer),
    );
    expect(saveLocalGpx).toHaveBeenCalledWith({
      name: "race.gpx",
      bytes: expect.any(ArrayBuffer),
    });
    expect(mockSetPaceSettings).toHaveBeenCalledWith(PLAN_SETTINGS);
    expect(mockSetFueling).toHaveBeenCalledWith(PLAN_FUELING);
    expect(mockSetPlanFile).toHaveBeenCalledWith({ name: "race.plan.json" });
    expect(mockFlush).toHaveBeenCalledOnce();
    expect(mockForgetLiveSession).toHaveBeenCalledOnce();
  });

  it("opens dropped files, the GPX then its plan.json", async () => {
    const { container } = render(<Wizard />);
    const target = container.firstChild.nextSibling;
    fireEvent.drop(target, { dataTransfer: { files: [gpxFile()] } });
    await screen.findByText("race.gpx");
    fireEvent.drop(target, { dataTransfer: { files: [planFile()] } });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/run"));
  });

  it("refuses a file that is not a GPX", async () => {
    render(<Wizard />);
    pick("gpx-input", gpxFile("notes.txt"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choose a .gpx file.",
    );
    expect(saveLocalGpx).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("refuses a plan.json made for another GPX, and keeps nothing", async () => {
    mockReadPlanFile.mockRejectedValue(new Error("Course mismatch"));
    render(<Wizard />);
    await pickBoth();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "made for another GPX",
    );
    expect(saveLocalGpx).not.toHaveBeenCalled();
    expect(mockSetPaceSettings).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("says so when the race cannot be stored", async () => {
    saveLocalGpx.mockRejectedValue(new Error("QuotaExceededError"));
    render(<Wizard />);
    await pickBoth();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not open this race on this device.",
    );
    expect(mockFlush).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
