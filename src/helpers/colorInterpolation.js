const parseHex = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

export const interpolateColor = (t, color1, color2, brightenFactor = 1.3) => {
  const [r1, g1, b1] = parseHex(color1);
  const [r2, g2, b2] = parseHex(color2);

  let r = Math.round(r1 + (r2 - r1) * t);
  let g = Math.round(g1 + (g2 - g1) * t);
  let b = Math.round(b1 + (b2 - b1) * t);

  // Brighten the colors
  r = Math.min(255, Math.round(r * brightenFactor));
  g = Math.min(255, Math.round(g * brightenFactor));
  b = Math.min(255, Math.round(b * brightenFactor));

  return `rgb(${r}, ${g}, ${b})`;
};

export const getInterpolatedColor = (
  index,
  total,
  colors,
  brightenFactor = 1.3,
) => {
  if (total === 1) return colors[0];

  // Map index to color segments
  const segment = (index / (total - 1)) * (colors.length - 1);
  const segmentIndex = Math.floor(segment);
  const t = segment - segmentIndex;

  const color1 = colors[Math.min(segmentIndex, colors.length - 1)];
  const color2 = colors[Math.min(segmentIndex + 1, colors.length - 1)];

  return interpolateColor(t, color1, color2, brightenFactor);
};
