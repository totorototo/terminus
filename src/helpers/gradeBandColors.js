// why: terrain has one hue in the Trail Suite design system — the dusty mauve
// --color-effort-1 (easiest) to --color-effort-5 (hardest), where harder always
// means more contrast on the ground. Every "how hard" chart (slope bands,
// runnability, the gradient breakdowns) samples the same five steps, so a
// band colour means the same thing in every chart and never borrows a status
// hue (accent = live/behind, primary = brand/plan).
const EFFORT_STEPS = 5;

export function gradeBandColors(theme, bandCount) {
  const colors = theme.colors[theme.currentVariant];
  if (bandCount <= 0) return [];
  return Array.from({ length: bandCount }, (_, i) => {
    // Spread the bands evenly over the five steps: 3 bands → 1, 3, 5.
    const step =
      bandCount === 1
        ? EFFORT_STEPS
        : 1 + Math.round((i * (EFFORT_STEPS - 1)) / (bandCount - 1));
    return colors[`--color-effort-${step}`];
  });
}
