import { afterEach, describe, expect, it, vi } from "vitest";

import {
  notifyLocationUpdate,
  requestNotificationPermission,
  subscribeToPush,
} from "./notify.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  delete window.Notification;
  delete window.PushManager;
});

describe("requestNotificationPermission", () => {
  it("returns unsupported when Notification is not in window", async () => {
    delete window.Notification;

    const result = await requestNotificationPermission();

    expect(result).toBe("unsupported");
  });

  it("returns granted without prompting when already granted", async () => {
    vi.stubGlobal("Notification", { permission: "granted" });

    const result = await requestNotificationPermission();

    expect(result).toBe("granted");
  });

  it("returns denied without prompting when already denied", async () => {
    vi.stubGlobal("Notification", { permission: "denied" });

    const result = await requestNotificationPermission();

    expect(result).toBe("denied");
  });

  it("prompts the user when permission is default", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    vi.stubGlobal("Notification", {
      permission: "default",
      requestPermission,
    });

    const result = await requestNotificationPermission();

    expect(requestPermission).toHaveBeenCalled();
    expect(result).toBe("granted");
  });
});

describe("subscribeToPush", () => {
  it("returns null when PushManager is not in window", async () => {
    delete window.PushManager;
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "test-public-key");

    const result = await subscribeToPush();

    expect(result).toBeNull();
  });

  it("returns null when the VAPID public key is missing", async () => {
    vi.stubGlobal("PushManager", class {});
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "");

    const result = await subscribeToPush();

    expect(result).toBeNull();
  });

  it("returns the existing subscription without subscribing again", async () => {
    vi.stubGlobal("PushManager", class {});
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "test-public-key");
    const existingSubscription = { endpoint: "https://example.com/existing" };
    const subscribe = vi.fn();
    vi.stubGlobal("navigator", {
      ...navigator,
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(existingSubscription),
            subscribe,
          },
        }),
      },
    });

    const result = await subscribeToPush();

    expect(result).toBe(existingSubscription);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("subscribes with the VAPID key when no subscription exists", async () => {
    vi.stubGlobal("PushManager", class {});
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "test-public-key");
    const newSubscription = { endpoint: "https://example.com/new" };
    const subscribe = vi.fn().mockResolvedValue(newSubscription);
    vi.stubGlobal("navigator", {
      ...navigator,
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(null),
            subscribe,
          },
        }),
      },
    });

    const result = await subscribeToPush();

    expect(subscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array),
      }),
    );
    expect(result).toBe(newSubscription);
  });
});

describe("notifyLocationUpdate", () => {
  it("does nothing when permission is not granted", () => {
    vi.stubGlobal("Notification", { permission: "denied" });
    const postMessage = vi.fn();
    vi.stubGlobal("navigator", {
      ...navigator,
      serviceWorker: { controller: { postMessage } },
    });

    notifyLocationUpdate({ coords: [45.1234, 5.6789] });

    expect(postMessage).not.toHaveBeenCalled();
  });

  it("does nothing when there is no service worker controller", () => {
    vi.stubGlobal("Notification", { permission: "granted" });
    vi.stubGlobal("navigator", {
      ...navigator,
      serviceWorker: { controller: null },
    });

    expect(() =>
      notifyLocationUpdate({ coords: [45.1234, 5.6789] }),
    ).not.toThrow();
  });

  it("posts a message with formatted lat/lon and elevation when coords are present", () => {
    vi.stubGlobal("Notification", { permission: "granted" });
    const postMessage = vi.fn();
    vi.stubGlobal("navigator", {
      ...navigator,
      serviceWorker: { controller: { postMessage } },
    });
    const msg = { coords: [45.123456, 5.678912, 1234.5] };

    notifyLocationUpdate(msg);

    expect(postMessage).toHaveBeenCalledWith({
      type: "PARTYKIT_MESSAGE",
      payload: {
        title: "Runner update",
        body: "Runner at 45.1235, 5.6789 · 1235m",
        data: msg,
      },
    });
  });

  it("falls back to a generic message when coords are absent", () => {
    vi.stubGlobal("Notification", { permission: "granted" });
    const postMessage = vi.fn();
    vi.stubGlobal("navigator", {
      ...navigator,
      serviceWorker: { controller: { postMessage } },
    });
    const msg = {};

    notifyLocationUpdate(msg);

    expect(postMessage).toHaveBeenCalledWith({
      type: "PARTYKIT_MESSAGE",
      payload: {
        title: "Runner update",
        body: "Runner's position updated",
        data: msg,
      },
    });
  });
});
