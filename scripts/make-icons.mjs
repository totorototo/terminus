// Writes the app's icons from the mark (src/theme/mark.js), as Retrace's script does. Dark's
// colours, the app's default variant.
//
//   npm run icons
//
// Output in public/: favicon.svg, apple-touch-icon.png, logo192.png, logo512.png, logo150.png.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import { MARK_PATH } from "../src/theme/mark.js";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

// Theme.js, dark: background, primary.
const BACKGROUND = "#3A3335";
const INK = "#f2af29";

const MARK = `<path d="${MARK_PATH}" fill="${INK}"/>`;

// The tab icon: a rounded tile, the mark nearly to its edges.
const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${BACKGROUND}"/>${MARK}</svg>\n`;

// why: the PNGs are maskable (vite.config.js), so the launcher may crop them to a circle of
// 80% of the side. Full-bleed square, and a 96 viewBox puts the mark (its far corner about 29
// from the centre) inside that circle's radius of 38. iOS rounds the apple-touch-icon's corners itself.
const TILE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-16 -16 96 96"><rect x="-16" y="-16" width="96" height="96" fill="${BACKGROUND}"/>${MARK}</svg>`;

// why: the notification badge (src/sw.js) is used by Android as an alpha mask, so a full
// tile would show as a plain square. The mark alone, on transparent.
const BADGE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${MARK}</svg>`;

const PNGS = [
  ["apple-touch-icon.png", 180, TILE],
  ["logo192.png", 192, TILE],
  ["logo512.png", 512, TILE],
  ["logo150.png", 150, BADGE],
];

writeFileSync(join(OUT_DIR, "favicon.svg"), FAVICON);

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, svg] of PNGS) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.screenshot({ path: join(OUT_DIR, name), omitBackground: true });
}
await browser.close();

console.log(
  `wrote favicon.svg and ${PNGS.map(([name]) => name).join(", ")} to ${OUT_DIR}`,
);
