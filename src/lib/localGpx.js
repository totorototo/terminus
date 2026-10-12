// The GPX the runner opened from the wizard, kept on this device so /run
// survives a reload. Nothing leaves the browser.
//
// why: IndexedDB rather than the persisted Zustand store (localStorage) — a
// race GPX runs to several MB, localStorage caps around 5 MB of UTF-16 text,
// and IndexedDB stores the ArrayBuffer as-is with no base64 round trip.

const DB_NAME = "terminus";
const STORE_NAME = "gpx";
const CURRENT_KEY = "current";

export const MAX_GPX_BYTES = 50 * 1024 * 1024;

const openDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const run = async (mode, operation) => {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const request = operation(tx.objectStore(STORE_NAME));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
};

/** Store `{ name, bytes }` as the current race, replacing any previous one. */
export const saveLocalGpx = ({ name, bytes }) =>
  run("readwrite", (store) => store.put({ name, bytes }, CURRENT_KEY));

/** The current race as `{ name, bytes }`, or null when none was opened. */
export const loadLocalGpx = async () =>
  (await run("readonly", (store) => store.get(CURRENT_KEY))) ?? null;

/** The file's name without its .gpx extension, or null when there is none. */
export const trailNameFromFileName = (fileName) =>
  fileName?.replace(/\.gpx$/i, "").trim() || null;

/**
 * Check a picked or dropped file before reading it. Returns an error message
 * for the wizard to show, or null when the file can be opened.
 */
export const checkGpxFile = (file) => {
  if (!file) return "No file selected.";
  if (!/\.gpx$/i.test(file.name)) return "Choose a .gpx file.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_GPX_BYTES) return "This file is too large (50 MB max).";
  return null;
};
