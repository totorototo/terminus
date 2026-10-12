// Moves the runner's GPX through the relay room, so a follower reads the
// exact same file. It has to be byte-identical: positions are broadcast as
// trace indices, and only the same bytes parse into the same trace.
//
// The runner uploads it when inviting someone (the file leaves the device
// only then); the follower downloads it once and keeps it.

import {
  FOLLOWED_KEY,
  loadLocalGpx,
  MAX_GPX_BYTES,
  saveLocalGpx,
} from "./localGpx.js";

export const PARTYKIT_HOST =
  import.meta.env.VITE_PARTYKIT_HOST ?? "localhost:1999";

const isLocalHost = (host) => /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);

export const routeUrl = (roomId, suffix = "") =>
  `${isLocalHost(PARTYKIT_HOST) ? "http" : "https"}://${PARTYKIT_HOST}/parties/main/${roomId}/route${suffix}`;

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/** SHA-256 of the raw GPX, hex. Tells whether the room already has this file. */
export const fingerprint = async (bytes) =>
  toHex(await crypto.subtle.digest("SHA-256", bytes));

// why: gzip in the browser rather than on the relay — a race GPX shrinks
// about 10x (GRP 160: 3.1 MB → 263 KB), so the upload and the room's
// storage both carry the small version, and the relay never parses it.
export const gzip = (bytes) =>
  new Response(
    new Response(bytes).body.pipeThrough(new CompressionStream("gzip")),
  ).arrayBuffer();

/** Inflate, refusing anything that grows past the size a GPX may have. */
export async function gunzip(bytes, maxBytes = MAX_GPX_BYTES) {
  const reader = new Response(bytes).body
    .pipeThrough(new DecompressionStream("gzip"))
    .getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("Shared route is too large");
    }
    chunks.push(value);
  }
  const joined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return joined.buffer;
}

/**
 * Put the runner's GPX in the room, unless the room already holds the same
 * file. Throws when the relay refuses it.
 */
export async function uploadRoute({ roomId, writeKey, name, bytes }) {
  const hash = await fingerprint(bytes);
  const meta = await fetch(routeUrl(roomId, "/meta"));
  if (meta.ok && (await meta.json()).hash === hash) return;

  const response = await fetch(routeUrl(roomId), {
    method: "POST",
    headers: {
      "content-type": "application/octet-stream",
      "x-write-key": writeKey,
      "x-route-hash": hash,
      "x-route-name": encodeURIComponent(name ?? ""),
    },
    body: await gzip(bytes),
  });
  if (!response.ok) throw new Error(`Route upload failed (${response.status})`);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The room's GPX as `{ name, bytes }`, or null when the room has none.
 *
 * A follow link is shared while its upload is still running, so a link
 * opened right away can find the room empty: retry a few times first.
 */
export async function downloadRoute(
  roomId,
  { attempts = 4, delayMs = 3000 } = {},
) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const response = await fetch(routeUrl(roomId));
    if (response.ok) {
      const name = decodeURIComponent(
        response.headers.get("x-route-name") ?? "",
      );
      return { name, bytes: await gunzip(await response.arrayBuffer()) };
    }
    if (response.status !== 404) {
      throw new Error(`Route download failed (${response.status})`);
    }
    if (attempt < attempts) await wait(delayMs);
  }
  return null;
}

/** Remove the room's GPX and last position (the runner stops sharing). */
export async function deleteRoute({ roomId, writeKey }) {
  const response = await fetch(routeUrl(roomId), {
    method: "DELETE",
    headers: { "x-write-key": writeKey },
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Route delete failed (${response.status})`);
  }
}

/**
 * The followed room's GPX: the copy kept on this device, or else downloaded
 * from the room and kept. Null when the room has none, or it cannot be
 * reached and nothing is kept.
 */
export async function loadFollowedRoute(roomId) {
  const kept = await loadLocalGpx(FOLLOWED_KEY);
  // A room's route never changes: a new race gets a new room.
  if (kept?.roomId === roomId) return kept;
  let route;
  try {
    route = await downloadRoute(roomId);
  } catch (error) {
    console.error("Shared route download failed:", error);
    return null;
  }
  if (!route) return null;
  await saveLocalGpx({ ...route, roomId }, FOLLOWED_KEY);
  return route;
}
