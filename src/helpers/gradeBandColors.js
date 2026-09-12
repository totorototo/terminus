import { hsl, parseToHsl } from "polished";

// why: a single-hue sequential ramp (same hue/saturation as the given theme
// token, lightness stepping from a pale tint down to the token color itself)
// reads severity ordering more directly than a hue-rotating rainbow, and
// stays consistent with the app's mostly monochrome palette. The most severe
// band lands exactly on the token color, so it means the same thing wherever
// bands keyed to that token are shown. SlopeIntensity/RouteStats' gradient
// distribution use --color-accent; RunnabilityIndex uses --color-primary
// instead so the two derived strips read as a matched pair rather than
// duplicating the same hue.
export function gradeBandColors(
  theme,
  bandCount,
  colorToken = "--color-accent",
) {
  const colors = theme.colors[theme.currentVariant];
  const base = parseToHsl(colors[colorToken]);
  // why: widened from +0.35 so adjacent bands sit further apart in
  // lightness — the original spread was too subtle to tell bands apart
  // on a phone screen outdoors.
  const tintLightness = Math.min(0.92, base.lightness + 0.48);

  return Array.from({ length: bandCount }, (_, i) => {
    const t = i / (bandCount - 1);
    return hsl({
      hue: base.hue,
      saturation: base.saturation,
      lightness: tintLightness + (base.lightness - tintLightness) * t,
    });
  });
}
