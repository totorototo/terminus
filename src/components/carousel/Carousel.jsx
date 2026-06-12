import { Children, useCallback, useEffect, useRef, useState } from "react";

import { animated, useTransition } from "@react-spring/web";

import style from "./Carousel.style.js";

function Carousel({
  className,
  children,
  direction = "horizontal",
  labels,
  ariaLabel = "Panels",
  showNav = true,
  initialIndex = 0,
}) {
  const trackRef = useRef(null);
  const [activePanel, setActivePanel] = useState(initialIndex);

  const isVertical = direction === "vertical";
  const panels = Children.toArray(children);

  const handleScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const index = isVertical
      ? Math.round(el.scrollTop / el.clientHeight)
      : Math.round(el.scrollLeft / el.clientWidth);
    setActivePanel(index);
  }, [isVertical]);

  const scrollToPanel = useCallback(
    (index, behavior = "smooth") => {
      const el = trackRef.current;
      if (!el) return;
      if (isVertical) {
        el.scrollTo({ top: index * el.clientHeight, behavior });
      } else {
        el.scrollTo({ left: index * el.clientWidth, behavior });
      }
    },
    [isVertical],
  );

  useEffect(() => {
    if (initialIndex > 0) scrollToPanel(initialIndex, "auto");
    // Only jump to the initial panel on mount / when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIndex]);

  const labelTransitions = useTransition(activePanel, {
    from: { opacity: 0, transform: "translateY(-5px)" },
    enter: { opacity: 1, transform: "translateY(0px)" },
    leave: { opacity: 0, transform: "translateY(5px)" },
    config: { tension: 300, friction: 24 },
  });

  return (
    <div className={className}>
      <div className="carousel-track" ref={trackRef} onScroll={handleScroll}>
        {panels.map((child, i) => (
          <div className="carousel-item" key={i}>
            {child}
          </div>
        ))}
      </div>

      {showNav && (
        <div className="carousel-nav">
          {labels && (
            <div className="carousel-label" aria-live="polite">
              {labelTransitions((springStyle, index) => (
                <animated.span style={springStyle}>
                  {labels[index]}
                </animated.span>
              ))}
            </div>
          )}
          <div className="carousel-dots" role="tablist" aria-label={ariaLabel}>
            {panels.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === activePanel}
                aria-label={labels ? labels[i] : `Panel ${i + 1}`}
                className={`carousel-dot${i === activePanel ? " active" : ""}`}
                onClick={() => scrollToPanel(i)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default style(Carousel);
