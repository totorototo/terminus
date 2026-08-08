import { memo, useRef, useState } from "react";

import useStore from "../../store/store.js";
import { STORY_SECTIONS } from "./storySections.js";

import style from "./StoryDotNav.style.js";

const StoryDotNav = memo(function StoryDotNav({ className }) {
  const activeIndex = useStore((state) => state.storyNav.activeIndex);
  const navRef = useRef(null);
  const draggingRef = useRef(false);
  const [dragIndex, setDragIndex] = useState(null);

  // why: reads the scroll handler imperatively at jump time instead of
  // subscribing to it — it's an escape hatch into Story's subtree (see
  // storyNav.js), not reactive UI state, so there's nothing to re-render on.
  const jumpTo = (index) => {
    useStore.getState().storyNav.scrollHandler?.(index);
  };

  const indexFromClientY = (clientY) => {
    const rect = navRef.current?.getBoundingClientRect();
    if (!rect || rect.height === 0) return null;
    const bandHeight = rect.height / STORY_SECTIONS.length;
    return Math.min(
      STORY_SECTIONS.length - 1,
      Math.max(0, Math.floor((clientY - rect.top) / bandHeight)),
    );
  };

  // why: pointer capture is set on the whole nav, not the individual dot —
  // dragging the strip (not tapping one dot at a time) is the point. Every
  // subsequent move is delivered here regardless of which button (or the
  // gap between two) it's physically over, so which section is "current"
  // comes from position math against the nav's own box, not per-button hit
  // testing. touch-action: none (see style) hands the whole gesture to this
  // handler instead of letting the browser try to scroll/select from it.
  const onPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    draggingRef.current = true;
    // why: can throw (e.g. no real active pointer behind the event) — that
    // must not skip the jump below, or a press that fails to capture would
    // silently do nothing instead of still acting as a plain tap.
    try {
      navRef.current?.setPointerCapture?.(event.pointerId);
    } catch {
      // capture is an optimization (keeps the drag tracking even if the
      // pointer leaves the nav's bounds) — its absence doesn't block the rest.
    }
    const index = indexFromClientY(event.clientY);
    if (index != null) {
      setDragIndex(index);
      jumpTo(index);
    }
  };

  const onPointerMove = (event) => {
    if (!draggingRef.current) return;
    event.preventDefault();
    const index = indexFromClientY(event.clientY);
    if (index != null && index !== dragIndex) {
      setDragIndex(index);
      jumpTo(index);
    }
  };

  const endDrag = (event) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    // why: clear the callout unconditionally first — releasePointerCapture
    // throws if the pointer was never actually captured (see onPointerDown),
    // and that must not leave the callout stuck on screen after release.
    setDragIndex(null);
    try {
      navRef.current?.releasePointerCapture?.(event.pointerId);
    } catch {
      // nothing was captured, nothing to release
    }
  };

  return (
    <nav
      ref={navRef}
      className={className}
      aria-label="Story sections"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {dragIndex != null && (
        <div
          className="callout"
          aria-hidden="true"
          style={{
            top: `${((dragIndex + 0.5) / STORY_SECTIONS.length) * 100}%`,
          }}
        >
          {STORY_SECTIONS[dragIndex].label}
        </div>
      )}
      {STORY_SECTIONS.map(({ id, label }, index) => (
        <button
          key={id}
          type="button"
          className={index === activeIndex ? "dot active" : "dot"}
          aria-label={`Jump to ${label}`}
          aria-current={index === activeIndex ? "true" : undefined}
          onClick={() => jumpTo(index)}
        />
      ))}
    </nav>
  );
});

const StyledStoryDotNav = style(StoryDotNav);

export default StyledStoryDotNav;
