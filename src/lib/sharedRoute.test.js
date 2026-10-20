import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadLocalGpx, saveLocalGpx } from "./localGpx.js";
import {
  downloadRoute,
  fingerprint,
  gunzip,
  gzip,
  loadFollowedRoute,
  RELAY_HOST,
  routeUrl,
  uploadRoute,
} from "./sharedRoute.js";

vi.mock("./localGpx.js", () => ({
  FOLLOWED_KEY: "followed",
  MAX_GPX_BYTES: 50 * 1024 * 1024,
  loadLocalGpx: vi.fn(),
  saveLocalGpx: vi.fn(),
}));

const encode = (text) => new TextEncoder().encode(text).buffer;
const decode = (buffer) => new TextDecoder().decode(buffer);
// .env may point VITE_RELAY_HOST at the deployed relay.
const PROTOCOL = RELAY_HOST.startsWith("localhost") ? "http" : "https";
const GPX = encode("<gpx><trk><trkseg></trkseg></trk></gpx>".repeat(50));

describe("gzip / gunzip", () => {
  it("round-trips the bytes", async () => {
    const zipped = await gzip(GPX);
    expect(zipped.byteLength).toBeLessThan(GPX.byteLength);
    expect(decode(await gunzip(zipped))).toBe(decode(GPX));
  });

  it("refuses a route that inflates past the limit", async () => {
    await expect(gunzip(await gzip(GPX), 100)).rejects.toThrow(
      "Shared route is too large",
    );
  });
});

describe("relay requests", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("addresses the room's route on the relay", () => {
    expect(routeUrl("abc")).toBe(
      `${PROTOCOL}://${RELAY_HOST}/parties/main/abc/route`,
    );
    expect(routeUrl("abc", "/meta")).toBe(
      `${PROTOCOL}://${RELAY_HOST}/parties/main/abc/route/meta`,
    );
  });

  describe("uploadRoute", () => {
    const upload = () =>
      uploadRoute({
        roomId: "abc",
        writeKey: "secret",
        name: "Tour des Lacs.gpx",
        bytes: GPX,
      });

    it("skips the upload when the room already holds this file", async () => {
      const hash = await fingerprint(GPX);
      fetch.mockResolvedValueOnce(Response.json({ hash }));

      await upload();

      expect(fetch).toHaveBeenCalledOnce();
    });

    it("posts the gzipped file with its key, hash and name", async () => {
      fetch
        .mockResolvedValueOnce(new Response(null, { status: 404 }))
        .mockResolvedValueOnce(new Response(null, { status: 204 }));

      await upload();

      const [url, init] = fetch.mock.calls[1];
      expect(url).toBe(routeUrl("abc"));
      expect(init.method).toBe("POST");
      expect(init.headers).toMatchObject({
        "x-write-key": "secret",
        "x-route-hash": await fingerprint(GPX),
        "x-route-name": "Tour%20des%20Lacs.gpx",
      });
      expect(decode(await gunzip(init.body))).toBe(decode(GPX));
    });

    it("throws when the relay refuses the file", async () => {
      fetch
        .mockResolvedValueOnce(new Response(null, { status: 404 }))
        .mockResolvedValueOnce(new Response(null, { status: 403 }));

      await expect(upload()).rejects.toThrow("Route upload failed (403)");
    });
  });

  describe("downloadRoute", () => {
    const routeResponse = async () =>
      new Response(await gzip(GPX), {
        headers: { "x-route-name": "Tour%20des%20Lacs.gpx" },
      });

    it("returns the inflated file and its name", async () => {
      fetch.mockResolvedValueOnce(await routeResponse());

      const route = await downloadRoute("abc");

      expect(route.name).toBe("Tour des Lacs.gpx");
      expect(decode(route.bytes)).toBe(decode(GPX));
    });

    it("waits for a route still being uploaded", async () => {
      fetch
        .mockResolvedValueOnce(new Response(null, { status: 404 }))
        .mockResolvedValueOnce(await routeResponse());

      const route = await downloadRoute("abc", { delayMs: 0 });

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(route.name).toBe("Tour des Lacs.gpx");
    });

    it("returns null when the room never gets a route", async () => {
      fetch.mockImplementation(async () => new Response(null, { status: 404 }));

      expect(await downloadRoute("abc", { attempts: 3, delayMs: 0 })).toBe(
        null,
      );
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it("throws on a relay error", async () => {
      fetch.mockResolvedValueOnce(new Response(null, { status: 500 }));

      await expect(downloadRoute("abc")).rejects.toThrow(
        "Route download failed (500)",
      );
    });
  });

  describe("loadFollowedRoute", () => {
    it("uses the copy kept for the same room, without the network", async () => {
      loadLocalGpx.mockResolvedValue({ roomId: "abc", name: "x", bytes: GPX });

      const route = await loadFollowedRoute("abc");

      expect(route.name).toBe("x");
      expect(fetch).not.toHaveBeenCalled();
    });

    it("downloads and keeps another room's route", async () => {
      loadLocalGpx.mockResolvedValue({ roomId: "old", name: "x", bytes: GPX });
      fetch.mockResolvedValueOnce(
        new Response(await gzip(GPX), {
          headers: { "x-route-name": "new.gpx" },
        }),
      );

      const route = await loadFollowedRoute("abc");

      expect(route.name).toBe("new.gpx");
      expect(saveLocalGpx).toHaveBeenCalledWith(
        { name: "new.gpx", bytes: expect.any(ArrayBuffer), roomId: "abc" },
        "followed",
      );
    });

    it("returns null when the relay cannot be reached", async () => {
      loadLocalGpx.mockResolvedValue(null);
      fetch.mockRejectedValue(new TypeError("Failed to fetch"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      expect(await loadFollowedRoute("abc")).toBeNull();
    });
  });
});
