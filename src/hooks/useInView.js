import { useEffect, useRef, useState } from "react";

// Reports whether the observed element has entered (or neared) the viewport.
// `rootMargin` lets callers prefetch heavy content just before it scrolls in —
// the carousel scrolls horizontally and clips overflow, so a horizontal margin
// triggers the mount shortly before a panel snaps into view.
//
// Once seen, `inView` stays true (`once`): heavy panels (mapbox, d3) mount a
// single time and are not torn down on scroll-away, avoiding re-init churn.
export function useInView({ rootMargin = "0px", once = true } = {}) {
  const ref = useRef(null);
  // SSR / unsupported environments: render eagerly rather than never.
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || (once && inView) || typeof IntersectionObserver === "undefined")
      return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin },
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [rootMargin, once, inView]);

  return [ref, inView];
}
