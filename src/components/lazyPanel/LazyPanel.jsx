import { Suspense } from "react";

import { useInView } from "../../hooks/useInView.js";

import style from "./LazyPanel.style.js";

// Defers mounting a heavy carousel panel (mapbox, d3, …) until it scrolls into
// view, keeping its chunk out of the initial trailer bundle. A fixed-size
// placeholder fills the slot so the carousel's scroll-snap offsets stay stable
// while the chunk loads. Pair with a `lazy()`-imported child.
function LazyPanel({ className, children, rootMargin = "200px" }) {
  const [ref, inView] = useInView({ rootMargin });

  return (
    <div className={className} ref={ref}>
      {inView ? (
        <Suspense fallback={<div className="lazy-panel-placeholder" />}>
          {children}
        </Suspense>
      ) : (
        <div className="lazy-panel-placeholder" />
      )}
    </div>
  );
}

const StyledLazyPanel = style(LazyPanel);

export default StyledLazyPanel;
