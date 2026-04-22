import QRCode from "qrcode";

import { DIFFICULTY_COLORS } from "../constants.js";
import THEME from "../theme/Theme.js";

const CARD_W = 600;
const CARD_H = 300;

// Converts a 6-digit hex color to rgba() with the given opacity (0–1)
function hex2rgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Card is always rendered in dark variant — pull tokens directly from THEME
const dark = THEME.colors.dark;
const C = {
  bg: dark["--color-background"],
  surface: "rgba(255,255,255,0.05)",
  text: dark["--color-text"],
  primary: dark["--color-primary"],
  secondary: dark["--color-secondary"],
  muted: hex2rgba(dark["--color-text"], 0.35),
  faint: hex2rgba(dark["--color-text"], 0.12),
};

// Module-level font cache — fetched once per session
let _fonts = null;

async function getFonts() {
  if (_fonts) return _fonts;

  // jsDelivr + @fontsource — stable, versioned, already whitelisted in CSP connect-src
  const base = "https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono/files";
  const [regular, bold] = await Promise.all([
    fetch(`${base}/jetbrains-mono-latin-400-normal.woff`).then((r) =>
      r.arrayBuffer(),
    ),
    fetch(`${base}/jetbrains-mono-latin-700-normal.woff`).then((r) =>
      r.arrayBuffer(),
    ),
  ]);

  _fonts = [
    { name: "JB", data: regular, weight: 400, style: "normal" },
    { name: "JB", data: bold, weight: 700, style: "normal" },
  ];
  return _fonts;
}

function fmt(sec) {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return "--";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function fmtElev(m) {
  if (!m || !Number.isFinite(m)) return "—";
  return m >= 1000 ? `${(m / 1000).toFixed(1)}k m` : `${Math.round(m)} m`;
}

function statBlock({ label, value, color }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: C.surface,
        borderRadius: 10,
        padding: "12px 14px",
        flex: 1,
        gap: 5,
      }}
    >
      <span
        style={{
          fontFamily: "JB",
          fontWeight: 700,
          fontSize: 22,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: "JB",
          fontWeight: 400,
          fontSize: 10,
          color: C.muted,
          letterSpacing: 1.5,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// Renders a QR code matrix as nested flex rows — Satori-compatible (no canvas)
function qrElement(url, size = 72) {
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const { data, size: n } = qr.modules;
  const cell = size / n;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: size,
        height: size,
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      {Array.from({ length: n }, (_, row) => (
        <div key={row} style={{ display: "flex", flexDirection: "row" }}>
          {Array.from({ length: n }, (_, col) => (
            <div
              key={col}
              style={{
                width: cell,
                height: cell,
                background: data[row * n + col] ? C.text : C.bg,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// DEFAULT_BASE_PACE_S_PER_KM from zig/minetti.zig — flat terrain reference
const FLAT_PACE_S_PER_KM = 490;

function buildElement({
  name,
  totalSec,
  elevationGain,
  distance,
  stages,
  url,
}) {
  const distKm = distance ? `${(distance / 1000).toFixed(0)} km` : "";
  const totalDist = stages.reduce((s, st) => s + (st.totalDistance || 0), 0);

  // Terrain multiplier: how much harder than running flat at 8:10/km pace
  const flatTimeSec = distance > 0 ? (distance / 1000) * FLAT_PACE_S_PER_KM : 0;
  const minettiX = flatTimeSec > 0 ? totalSec / flatTimeSec : 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: CARD_W,
        height: CARD_H,
        background: C.bg,
        padding: "28px 32px",
        fontFamily: "JB",
        position: "relative",
      }}
    >
      {/* QR code — absolute top-right, out of flow */}
      {url ? (
        <div
          style={{ display: "flex", position: "absolute", top: 28, right: 32 }}
        >
          {qrElement(url, 56)}
        </div>
      ) : null}

      {/* Branding */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          marginBottom: 18,
        }}
      >
        <span
          style={{
            fontFamily: "JB",
            fontWeight: 700,
            fontSize: 10,
            color: C.faint,
            letterSpacing: 2.5,
            textTransform: "uppercase",
          }}
        >
          TERMINUS · TRAIL ANALYSIS
        </span>
      </div>

      {/* Trail name + distance */}
      <div
        style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}
      >
        <span
          style={{
            fontFamily: "JB",
            fontWeight: 700,
            fontSize: 26,
            color: C.text,
            lineHeight: 1.1,
            marginBottom: 4,
          }}
        >
          {name || "Trail"}
        </span>
        {distKm ? (
          <span
            style={{
              fontFamily: "JB",
              fontWeight: 400,
              fontSize: 12,
              color: C.muted,
            }}
          >
            {distKm}
          </span>
        ) : null}
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {statBlock({
          label: "Estimated",
          value: fmt(totalSec),
          color: C.primary,
        })}
        {statBlock({
          label: "D+",
          value: `+${fmtElev(elevationGain)}`,
          color: C.secondary,
        })}
        {statBlock({
          label: "Minetti ×",
          value: minettiX > 0 ? `×${minettiX.toFixed(2)}` : "—",
          color: C.text,
        })}
      </div>

      {/* Stage bar — uniform height, width = distance, color = difficulty */}
      {totalDist > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            height: 8,
            gap: 2,
            marginTop: 12,
            marginBottom: 16,
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          {stages.map((st, i) => (
            <div
              key={i}
              style={{
                flex: (st.totalDistance || 0) / totalDist,
                height: 8,
                background: st.difficulty
                  ? DIFFICULTY_COLORS[st.difficulty - 1]
                  : C.muted,
              }}
            />
          ))}
        </div>
      ) : null}

      {/* Footer */}
      <div style={{ display: "flex", marginTop: "auto" }}>
        <span
          style={{
            fontFamily: "JB",
            fontWeight: 400,
            fontSize: 10,
            color: C.faint,
            letterSpacing: 1,
          }}
        >
          © 2026 Terminus — La Vallée
        </span>
      </div>
    </div>
  );
}

function svgToPng(svgString) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = CARD_W * 2;
      canvas.height = CARD_H * 2;
      const ctx = canvas.getContext("2d");
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0, CARD_W, CARD_H);
      URL.revokeObjectURL(url);
      canvas.toBlob(resolve, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG render failed"));
    };
    img.src = url;
  });
}

/**
 * Generates a shareable trail card PNG blob.
 *
 * @param {object} data
 * @param {string} data.name - Trail name
 * @param {number} data.totalSec - Total estimated duration in seconds
 * @param {number} data.elevationGain - Total D+ in metres
 * @param {number} data.distance - Total distance in metres
 * @param {Array}  data.stages - Stage objects with totalDistance, totalElevation, totalElevationLoss, difficulty
 * @param {string} [data.url] - URL to encode as QR code in the card footer
 * @returns {Promise<Blob>} PNG blob
 */
export async function generateTrailCard(data) {
  const [{ default: satori }, fonts] = await Promise.all([
    import("satori"),
    getFonts(),
  ]);
  const element = buildElement(data);

  const svg = await satori(element, {
    width: CARD_W,
    height: CARD_H,
    fonts,
  });

  return svgToPng(svg);
}
