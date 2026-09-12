import { hsl, parseToHsl } from "polished";

// why: a single-hue sequential ramp (same hue/saturation as the theme's
// "accent" token, lightness stepping from a pale tint down to the accent
// color itself) reads severity ordering more directly than a hue-rotating
// rainbow, and stays consistent with the app's mostly monochrome palette.
// The most severe band lands exactly on --color-accent, so it means the
// same thing wherever grade bands are shown (SlopeIntensity, RouteStats).
export function gradeBandColors(theme, bandCount) {
  const colors = theme.colors[theme.currentVariant];
  const accent = parseToHsl(colors["--color-accent"]);
  // why: widened from +0.35 so adjacent bands sit further apart in
  // lightness — the original spread was too subtle to tell bands apart
  // on a phone screen outdoors.
  const tintLightness = Math.min(0.92, accent.lightness + 0.48);

  return Array.from({ length: bandCount }, (_, i) => {
    const t = i / (bandCount - 1);
    return hsl({
      hue: accent.hue,
      saturation: accent.saturation,
      lightness: tintLightness + (accent.lightness - tintLightness) * t,
    });
  });
}
