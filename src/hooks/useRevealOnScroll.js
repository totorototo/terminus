import { useEffect, useRef, useState } from "react";

/**
 * Fires once when the returned ref's element first enters the viewport.
 * Used to trigger the story's fade-in-on-scroll sections.
 */
export function useRevealOnScroll(threshold = 0.15) {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(
    () => typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    if (revealed) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, revealed]);

  return [ref, revealed];
}
