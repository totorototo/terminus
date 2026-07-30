import { useState } from "react";

/**
 * Caps a long list to its first `threshold` rows, expanding to the full
 * list on demand — except the row at `activeIndex` (the runner's current
 * position in that list) is always kept visible, so collapsing never hides
 * what's actually relevant mid-route. Pass -1 (or omit) when nothing in the
 * list is active yet.
 */
export function useCollapsibleList(
  length,
  { threshold = 5, activeIndex = -1 } = {},
) {
  const [expanded, setExpanded] = useState(false);
  const visibleCount = expanded
    ? length
    : Math.min(length, Math.max(threshold, activeIndex + 1));
  const hiddenCount = length - visibleCount;

  return {
    visibleCount,
    hiddenCount,
    expanded,
    expand: () => setExpanded(true),
  };
}
