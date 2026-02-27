// Web Push implementation using only Web Crypto API + fetch
// Implements RFC 8291 (Message Encryption) and RFC 8292 (VAPID)
// No Node.js dependencies — compatible with Cloudflare Workers / PartyKit

function b64urlEncode(data) {
  if (data instanceof ArrayBuffer) data = new Uint8Array(data);
  let binary = "";
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlDecode(str) {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function concat(...arrays) {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

async function hkdf(salt, ikm, info, length) {
  const ikmKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, [
    "deriveBits",
  ]);
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info },
      ikmKey,
      length * 8,
    ),
  );
}

async function generateVapidJwt(
  endpoint,
  publicKeyB64url,
  privateKeyB64url,
  subject,
) {
  const { protocol, host } = new URL(endpoint);
  const enc = new TextEncoder();
  const header = b64urlEncode(
    enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })),
  );
  const claims = b64urlEncode(
    enc.encode(
      JSON.stringify({
        aud: `${protocol}//${host}`,
        exp: Math.floor(Date.now() / 1000) + 43200,
        sub: subject,
      }),
    ),
  );

  // Build JWK from raw public (65 bytes: 0x04 || x || y) and private key
  const pubBytes = b64urlDecode(publicKeyB64url);
  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: privateKeyB64url,
      x: b64urlEncode(pubBytes.slice(1, 33)),
      y: b64urlEncode(pubBytes.slice(33, 65)),
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(`${header}.${claims}`),
  );

  return `${header}.${claims}.${b64urlEncode(sig)}`;
}

async function encryptPayload(payload, p256dhB64url, authB64url) {
  const enc = new TextEncoder();
  const receiverPub = b64urlDecode(p256dhB64url); // 65 bytes uncompressed
  const authSecret = b64urlDecode(authB64url); // 16 bytes

  // Generate local ECDH key pair
  const localKP = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );
  const localPubRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKP.publicKey),
  );

  // Import receiver public key (no usages needed for the public parameter)
  const receiverKey = await crypto.subtle.importKey(
    "raw",
    receiverPub,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: receiverKey },
      localKP.privateKey,
      256,
    ),
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // RFC 8291 phase 1: combine ECDH secret with auth secret
  const authInfo = concat(
    enc.encode("WebPush: info\0"),
    receiverPub,
    localPubRaw,
  );
  const ikm = await hkdf(authSecret, sharedSecret, authInfo, 32);

  // RFC 8291 phase 2: derive CEK and nonce
  const cek = await hkdf(
    salt,
    ikm,
    enc.encode("Content-Encoding: aes128gcm\0"),
    16,
  );
  const nonce = await hkdf(
    salt,
    ikm,
    enc.encode("Content-Encoding: nonce\0"),
    12,
  );

  // Encrypt with AES-128-GCM; append 0x02 padding delimiter (RFC 8291)
  const plaintext = enc.encode(
    typeof payload === "string" ? payload : JSON.stringify(payload),
  );
  const cekKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, [
    "encrypt",
  ]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce, tagLength: 128 },
      cekKey,
      concat(plaintext, new Uint8Array([2])),
    ),
  );

  // RFC 8188 header: salt(16) || rs(4, BE) || idlen(1) || sender_pub(65)
  const rfcHeader = new Uint8Array(21 + localPubRaw.length);
  rfcHeader.set(salt);
  new DataView(rfcHeader.buffer).setUint32(16, 4096, false);
  rfcHeader[20] = localPubRaw.length;
  rfcHeader.set(localPubRaw, 21);

  return concat(rfcHeader, ciphertext);
}

export async function sendNotification(
  subscription,
  payload,
  { publicKey, privateKey, subject },
) {
  const { endpoint, keys } = subscription;

  const [encrypted, jwt] = await Promise.all([
    encryptPayload(payload, keys.p256dh, keys.auth),
    generateVapidJwt(endpoint, publicKey, privateKey, subject),
  ]);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt},k=${publicKey}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
    },
    body: encrypted,
  });

  if (response.status !== 201) {
    const err = new Error(`Web Push failed: ${response.status}`);
    err.statusCode = response.status;
    throw err;
  }
}
