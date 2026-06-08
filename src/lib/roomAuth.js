// Capability-based authorization for live-location relay rooms.
//
// Model: the runner generates a secret `writeKey`. The public room id is
// `SHA-256(writeKey)` truncated to 16 hex chars. The follow link only ever
// contains the room id (the hash), so followers can read the stream but cannot
// reverse it to obtain the write key — meaning they cannot broadcast (spoof)
// positions. The hash is also large enough (64 bits) that room ids cannot be
// enumerated by guessing.
//
// Pure and framework-agnostic: relies only on the global Web Crypto API, so the
// same logic runs in the browser, the PartyKit worker, and Node (the simulate
// script sets globalThis.crypto before importing).

const ROOM_ID_LENGTH = 16; // hex chars → 64 bits

const toHex = (bytes) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/** Generate a fresh 128-bit secret write key as a 32-char hex string. */
export function generateWriteKey() {
  return toHex(globalThis.crypto.getRandomValues(new Uint8Array(16)));
}

/** Derive the public room id from a secret write key. */
export async function deriveRoomId(writeKey) {
  const data = new TextEncoder().encode(writeKey);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest)).slice(0, ROOM_ID_LENGTH);
}

/**
 * True when `writeKey` is the secret behind `roomId`, i.e. the holder is
 * authorized to broadcast into that room. Comparison is constant-time to avoid
 * leaking information through timing.
 */
export async function isAuthorizedWriter(writeKey, roomId) {
  if (typeof writeKey !== "string" || typeof roomId !== "string") return false;
  const expected = await deriveRoomId(writeKey);
  if (expected.length !== roomId.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ roomId.charCodeAt(i);
  }
  return diff === 0;
}
