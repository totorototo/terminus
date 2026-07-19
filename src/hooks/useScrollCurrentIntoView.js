import { useEffect, useRef } from "react";

// Centers the `.cp-row.current` row inside the scrollable timeline whenever
// the current row changes. On a 300 km race the list is far taller than the
// panel and the scrollbar is hidden, so without this a mid-race viewer always
// lands at Start. Returns the ref to attach to the scroll container.
//
// Manual scroll math instead of `row.scrollIntoView()`: scrollIntoView walks
// ALL scrollable ancestors, so it would also drag the surrounding panel
// carousel; scrolling only the list container keeps the effect local.
export function useScrollCurrentIntoView(currentKey) {
  const listRef = useRef(null);

  useEffect(() => {
    if (currentKey == null) return;
    const list = listRef.current;
    const row = list?.querySelector(".cp-row.current");
    if (!list || !row) return;

    const top = Math.max(
      0,
      row.getBoundingClientRect().top -
        list.getBoundingClientRect().top +
        list.scrollTop -
        (list.clientHeight - row.clientHeight) / 2,
    );

    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;

    if (typeof list.scrollTo === "function") {
      list.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    } else {
      // jsdom has no Element.scrollTo
      list.scrollTop = top;
    }
  }, [currentKey]);

  return listRef;
}
