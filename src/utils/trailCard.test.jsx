import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const satoriMock = vi.fn().mockResolvedValue("<svg>mock</svg>");
vi.mock("satori", () => ({ default: satoriMock }));

import { generateTrailCard } from "./trailCard.jsx";

const baseData = {
  name: "Test Trail",
  totalSec: 3600,
  elevationGain: 500,
  distance: 10000,
  stages: [{ totalDistance: 10000, difficulty: 2 }],
};

describe("generateTrailCard", () => {
  let originalCreateElement;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) }),
    );
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock");
    URL.revokeObjectURL = vi.fn();

    class MockImage {
      set src(_value) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", MockImage);

    originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName !== "canvas") return originalCreateElement(tagName);
      return {
        width: 0,
        height: 0,
        getContext: () => ({ scale: vi.fn(), drawImage: vi.fn() }),
        toBlob: (callback) => {
          callback(new Blob(["fake"], { type: "image/png" }));
        },
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    satoriMock.mockClear();
  });

  it("resolves to a PNG blob for the happy path", async () => {
    const result = await generateTrailCard(baseData);

    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe("image/png");
  });

  it("calls satori with the expected card dimensions and two fonts", async () => {
    await generateTrailCard(baseData);

    expect(satoriMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        width: 600,
        height: 300,
        fonts: expect.arrayContaining([
          expect.objectContaining({ weight: 400 }),
          expect.objectContaining({ weight: 700 }),
        ]),
      }),
    );
    expect(satoriMock.mock.calls[0][1].fonts).toHaveLength(2);
  });

  it("does not throw when stages is an empty array", async () => {
    await expect(
      generateTrailCard({ ...baseData, stages: [] }),
    ).resolves.toBeInstanceOf(Blob);
  });

  it("does not throw when url is omitted", async () => {
    await expect(
      generateTrailCard({ ...baseData, url: undefined }),
    ).resolves.toBeInstanceOf(Blob);
  });

  it("renders the QR code section when a url is provided", async () => {
    await expect(
      generateTrailCard({ ...baseData, url: "https://example.com/trail" }),
    ).resolves.toBeInstanceOf(Blob);
  });
});
