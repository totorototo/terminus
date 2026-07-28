import { memo } from "react";

import { animated, useSpring } from "@react-spring/web";

import { useRevealOnScroll } from "../../hooks/useRevealOnScroll.js";

import style from "./StorySection.style.js";

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const StorySection = memo(function StorySection({
  className,
  eyebrow,
  title,
  children,
}) {
  const [ref, revealed] = useRevealOnScroll();

  // why: one reveal pattern for every section (fade + rise, once) — a single
  // orchestrated motion moment repeated consistently reads as deliberate,
  // where per-section bespoke animation would read as noise.
  const spring = useSpring({
    opacity: revealed ? 1 : 0,
    transform: revealed ? "translateY(0px)" : "translateY(28px)",
    config: { tension: 180, friction: 24 },
    immediate: prefersReducedMotion,
  });

  return (
    <section ref={ref} className={className}>
      <animated.div style={spring} className="section-inner">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        {title && <h2 className="title">{title}</h2>}
        <div className="body">{children}</div>
      </animated.div>
    </section>
  );
});

const StyledStorySection = style(StorySection);

export default StyledStorySection;
